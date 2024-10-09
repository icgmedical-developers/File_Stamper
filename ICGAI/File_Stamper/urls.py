from django.urls import path
from . views import stamp

urlpatterns = [
    path('', stamp, name ="stamp")
]