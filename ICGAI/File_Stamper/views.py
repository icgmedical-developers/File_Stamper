from django.shortcuts import render

# Create your views here.


def stamp(request):
    context = {
        'stamp_image_path': 'original_stamp.png',
        'username': request.user.username.upper() if request.user.is_authenticated else ""
    }
    return render(request, 'File_Stamper/index.html', context)