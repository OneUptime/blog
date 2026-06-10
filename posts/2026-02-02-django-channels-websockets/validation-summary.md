# Validation Summary: How to Implement WebSockets with Django Channels

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Django (web framework)
- Django Channels (WebSocket / async extension)
- channels_redis (Redis channel layer)
- Redis (channel layer backend, including Sentinel for HA)
- ASGI (async application protocol)
- Python (PyJWT for JWT tokens)
- Django REST Framework (TokenAuthentication)
- JavaScript (browser WebSocket client API)
- Nginx (WebSocket reverse proxy / load balancer)
- Daphne (ASGI server)
- pytest / pytest-asyncio / pytest-django (testing)
- WebSocket protocol (RFC 6455)

## Sources Consulted
- Django Channels official documentation: https://channels.readthedocs.io/
- Django Channels authentication docs: https://channels.readthedocs.io/en/latest/topics/authentication.html
- channels_redis GitHub README: https://github.com/django/channels_redis
- Django Channels middleware source: https://github.com/django/channels/blob/main/channels/middleware.py
- Nginx WebSocket proxying guide: https://nginx.org/en/docs/http/websocket.html
- WebSocket protocol RFC 6455
- PyJWT documentation for `jwt.decode` API
- pytest-asyncio and pytest-django documentation for class-level marker usage

## Issues Found
1. **Redis Sentinel configuration format was incorrect.** In the "Redis Channel Layer Configuration" section, the example for Sentinel used `'address': ('redis-sentinel-host', 26379)` inside the host dict. The correct key per the `channels_redis` documentation is `'sentinels'`, which takes a *list* of `(host, port)` tuples. Updated the example to:

   ```python
   'sentinels': [('redis-sentinel-host', 26379)],
   'master_name': 'mymaster',
   ```

   This matches the actual `channels_redis.core.RedisChannelLayer` Sentinel configuration format.

## Review Notes
- All imports (`AsyncWebsocketConsumer`, `database_sync_to_async`, `ProtocolTypeRouter`, `URLRouter`, `AuthMiddlewareStack`, `AllowedHostsOriginValidator`, `BaseMiddleware`, `WebsocketCommunicator`, `StopConsumer`) are from the correct, current Channels modules.
- The `BaseMiddleware` subclassing pattern works (calling `super().__call__` to pass through to `self.inner`). A purist note: the channels source explicitly warns against storing state on the middleware instance — the JWT middleware example doesn't do that, but it does mutate the incoming `scope` dict before calling `super().__call__`, which then makes a shallow copy. This is the common community pattern and not technically wrong; left as-is to preserve author style.
- `InMemoryChannelLayer` path `'channels.layers.InMemoryChannelLayer'` is correct.
- WebSocket close codes (1000, 1001, 1006, and the application range 4000–4999) are accurately described per RFC 6455.
- Nginx WebSocket proxy config (proxy_http_version 1.1, Upgrade/Connection headers, ip_hash sticky sessions, long read/send timeouts) matches the official Nginx WebSocket proxying recommendations.
- The `RobustConsumer` imports `traceback` and `StopConsumer` and the `LimitedConsumer` imports `asyncio` without using them. These are stylistic (unused imports) rather than incorrect, and were left alone per the instruction to only fix technical errors.
- The `TokenAuthMiddleware` uses a bare `except:` clause, which is poor Python style but not a functional bug. Left as-is.
- The `ChatRoomConsumer` uses a class-level `online_users = {}` dict that is shared across all instances and lost on restart — the post explicitly calls this out as demo-only ("In production, use Redis for this instead"), so this is acceptable.
- Class-level `@pytest.mark.asyncio` and `@pytest.mark.django_db(transaction=True)` decorators propagate to test methods in current pytest-asyncio and pytest-django, so the test structure is valid.
- `jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])` matches PyJWT's current required-`algorithms` API.
- `WebsocketCommunicator` usage and setting `communicator.scope['user']` before `connect()` is the documented Channels testing pattern.
