# Validation Summary: How to Use Django Channels with Redis Channel Layer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Django Channels (channels package)
- channels-redis (Redis channel layer backend)
- Redis
- Django ASGI
- WebSockets
- Daphne (ASGI server)
- Uvicorn (ASGI server)

## Sources Consulted
- Django Channels official documentation: https://channels.readthedocs.io/en/stable/
- channels-redis documentation: https://github.com/django/channels_redis
- Django ASGI deployment docs: https://docs.djangoproject.com/en/5.0/howto/deployment/asgi/
- Daphne documentation: https://github.com/django/daphne
- Uvicorn documentation: https://www.uvicorn.org/

## Issues Found
1. **ASGI setup import ordering bug**: The original `asgi.py` example imported `from myapp.routing import websocket_urlpatterns` before calling `os.environ.setdefault("DJANGO_SETTINGS_MODULE", ...)` and `get_asgi_application()`. Since `get_asgi_application()` internally calls `django.setup()`, importing app-specific modules before it runs causes an `AppRegistryNotReady` exception. Fixed by moving `os.environ.setdefault` and `get_asgi_application()` above the app-specific imports, and storing the ASGI app in a variable (`django_asgi_app`) to avoid calling `get_asgi_application()` twice. This matches the pattern recommended in the official Django Channels documentation.

## Review Notes
- The `expiry` value of 10 seconds in the channel layer config is quite low (default is 60). This could cause messages to expire before consumption under heavy load, but it is a valid configuration choice, not an error.
- The `capacity` of 1500 is significantly higher than the default of 100. This is fine but readers should be aware it increases memory usage per channel.
- The summary states "Run with Daphne or Uvicorn instead of Gunicorn" — technically Gunicorn can serve ASGI apps using `uvicorn.workers.UvicornWorker`, but the statement is correct in the sense that Gunicorn's default WSGI mode does not support WebSockets. This is an acceptable simplification for a tutorial.
- All other code examples (consumer, routing, broadcasting from views, CLI commands) are correct and use current APIs.
