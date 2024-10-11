# yourproject/middleware.py
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login
import base64
import ast


def get_claims(request):
    if "HTTP_X_MS_CLIENT_PRINCIPAL" in request.META:
        # Decode and print the token payload
        token_data = request.META["HTTP_X_MS_CLIENT_PRINCIPAL"]
        decoded_token = base64.b64decode(token_data).decode("utf-8")
        user_data = decoded_token
        print("Token Payload:", decoded_token)
    else:
        print('HTTP_X_MS_CLIENT_PRINCIPAL not in request.META')
    return user_data


def get_user_profile_data(user_claims):
    if isinstance(user_claims, str):
        user_claims = ast.literal_eval(user_claims)
    else:
        raise TypeError("user_claims is not of string type")
    user_data = {}
    for claim in user_claims['claims']:
        if claim['typ'] == 'http:\\/\\/schemas.xmlsoap.org\\/ws\\/2005\\/05\\/identity\\/claims\\/emailaddress':
            user_data['user_email'] = claim['val']
        if claim['typ'] == 'name':
            user_data['username'] = claim['val']
    return user_data



class CustomMicrosoftAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Your logic to check if the user is already authenticated or not
        user_profile_data = get_claims(request)
        user_data = get_user_profile_data(user_profile_data)
        username = user_data['username']
        user_email = user_data['user_email']
        user_email = user_email.strip().lower()
        current_user = User.objects.filter(email=user_email).first()
        if current_user:
            request.user = current_user
        else:
            # Create a new user without setting a password
            new_user = User.objects.create_user(username=username, email=user_email)
            request.user = new_user
        print(f"request.user: {request.user}")
        response = self.get_response(request)
        return response
