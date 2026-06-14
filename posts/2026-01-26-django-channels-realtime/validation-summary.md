# Validation Summary: How to Build Real-Time Features with Django Channels

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Django
- Django Channels
- ASGI
- WebSockets
- channels-redis
- Redis
- Daphne
- Uvicorn
- Docker Compose
- Nginx
- Celery
- JavaScript WebSocket API

## Sources Consulted
- Django Channels 4.3.2 documentation: https://channels.readthedocs.io/en/latest/
- Django Channels installation documentation: https://channels.readthedocs.io/en/latest/installation.html
- Django Channels routing documentation: https://channels.readthedocs.io/en/latest/topics/routing.html
- Django Channels authentication documentation: https://channels.readthedocs.io/en/latest/topics/authentication.html
- Django Channels channel layers documentation: https://channels.readthedocs.io/en/stable/topics/channel_layers.html
- Django Channels security documentation: https://channels.readthedocs.io/en/latest/topics/security.html
- Django deployment with Daphne documentation: https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/daphne/
- Uvicorn installation documentation: https://uvicorn.dev/installation/
- Uvicorn settings documentation: https://uvicorn.dev/settings/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- MDN Element.innerHTML documentation: https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML
- MDN WebSocket readyState documentation: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState

## Issues Found
- The installation and `INSTALLED_APPS` example did not reflect current Channels 4 guidance for Daphne integration. Updated the install command to use `channels[daphne]`, added `daphne` before Django apps, and clarified that `channels` is for worker support.
- The ASGI example imported application routing before initializing Django's ASGI app. Updated it to call `get_asgi_application()` early, matching Channels guidance for avoiding app registry issues when consumers import ORM models.
- The WebSocket ASGI stack did not include origin validation. Wrapped WebSocket routing with `AllowedHostsOriginValidator`, as recommended by Channels security documentation for cookie-authenticated WebSockets.
- The chat route used `\w+`, which can match non-ASCII characters and can create invalid channel-layer group names. Restricted the room name to ASCII alphanumerics and underscores with a length that keeps the `chat_` group name within the default backend limit.
- The JavaScript chat example used `innerHTML` with user-controlled chat content, creating an XSS risk. Replaced it with `textContent`, `createElement`, and `createTextNode`.
- The token-auth ASGI snippet omitted origin validation and referenced `get_asgi_application()` directly while the earlier corrected ASGI pattern uses a pre-initialized `django_asgi_app`. Updated the snippet for consistency.
- The Uvicorn section claimed Uvicorn requires uvloop. Uvicorn does not require uvloop; it is an optional dependency installed by the `standard` extra. Updated the command to `pip install 'uvicorn[standard]'` and removed the inaccurate claim.
- The Docker Compose example used the legacy top-level `version` field. Removed it because current Compose uses the Compose Specification.

## Review Notes
The tutorial remains intentionally simplified: model classes such as `Order`, `File`, and `Room` are placeholders, and production deployments would still need environment-specific hardening for TLS, secrets, Redis persistence/security, database migrations, static files, and process supervision.
