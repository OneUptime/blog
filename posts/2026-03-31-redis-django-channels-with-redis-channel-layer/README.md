# How to Use Django Channels with Redis Channel Layer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Django, WebSocket, Channel, Real-Time

Description: Learn how to configure Django Channels with the Redis channel layer to enable WebSocket communication and real-time messaging across multiple server instances.

---

Django Channels replaces Django's synchronous request-response model with an async, event-driven one. The Redis channel layer allows multiple Channels server instances to communicate - essential for scaling WebSocket apps horizontally.

## Installation

```bash
pip install channels channels-redis
```

## ASGI Setup

Convert your project to ASGI in `asgi.py`:

```python
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "myproject.settings")
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from myapp.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
```

## Redis Channel Layer Configuration

In `settings.py`:

```python
INSTALLED_APPS = [
    ...
    "channels",
]

ASGI_APPLICATION = "myproject.asgi.application"

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("127.0.0.1", 6379)],
            "capacity": 1500,
            "expiry": 10,
        },
    },
}
```

## WebSocket Consumer

```python
# consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room"]
        self.group_name = f"chat_{self.room_name}"

        # Join the channel group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        await self.channel_layer.group_send(
            self.group_name,
            {"type": "chat.message", "message": data["message"]}
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({"message": event["message"]}))
```

## URL Routing

```python
# routing.py
from django.urls import re_path
from myapp.consumers import ChatConsumer

websocket_urlpatterns = [
    re_path(r"ws/chat/(?P<room>\w+)/$", ChatConsumer.as_asgi()),
]
```

## Broadcasting from a Django View

Push messages to WebSocket clients from a regular HTTP view using the channel layer:

```python
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.http import JsonResponse

def send_notification(request, room):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"chat_{room}",
        {"type": "chat.message", "message": "Server notification!"}
    )
    return JsonResponse({"status": "sent"})
```

## Running in Production

Use Daphne or Uvicorn as the ASGI server:

```bash
# Daphne
daphne -b 0.0.0.0 -p 8000 myproject.asgi:application

# Uvicorn
uvicorn myproject.asgi:application --host 0.0.0.0 --port 8000
```

## Summary

Django Channels with the Redis channel layer enables real-time WebSocket communication that scales horizontally. Configure `CHANNEL_LAYERS` in settings, define `AsyncWebsocketConsumer` subclasses with `group_add`/`group_send`, and use `async_to_sync(channel_layer.group_send)` to push messages from regular Django views. Run with Daphne or Uvicorn instead of Gunicorn.
