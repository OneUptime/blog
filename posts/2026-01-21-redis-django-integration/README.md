# How to Use Redis with Django

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Django, Python, Caching, Sessions, Celery, Web Development

Description: A comprehensive guide to integrating Redis with Django applications, covering cache backends, session storage, Celery task queues, and channels for real-time features.

---

Django has excellent Redis support for caching, session storage, and background tasks. This guide covers everything from basic configuration to advanced patterns using django-redis, Django sessions, and Celery.

## Installation

Install the required packages:

```bash
pip install django-redis redis celery
```

## Cache Configuration

### Basic Cache Setup

```python
# settings.py

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://localhost:6379/0',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'RETRY_ON_TIMEOUT': True,
            'MAX_CONNECTIONS': 50,
            'CONNECTION_POOL_CLASS_KWARGS': {
                'max_connections': 50,
            },
        },
        'KEY_PREFIX': 'myapp',
        'TIMEOUT': 300,  # 5 minutes default
    }
}
```

### Multiple Cache Configuration

```python
# settings.py

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://localhost:6379/0',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'default',
        'TIMEOUT': 300,
    },
    'sessions': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://localhost:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'session',
        'TIMEOUT': 86400,  # 24 hours
    },
    'api_cache': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://localhost:6379/2',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'api',
        'TIMEOUT': 60,  # 1 minute
    },
}
```

### Redis Cluster Configuration

```python
# settings.py

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': [
            'redis://192.168.1.100:6379/0',
            'redis://192.168.1.101:6379/0',
            'redis://192.168.1.102:6379/0',
        ],
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_CLASS': 'redis.connection.BlockingConnectionPool',
        },
    }
}
```

## Using Django Cache

### Basic Cache Operations

```python
from django.core.cache import cache

# Set a value
cache.set('my_key', 'my_value', timeout=300)  # 5 minutes

# Get a value
value = cache.get('my_key')

# Get with default
value = cache.get('my_key', default='default_value')

# Delete
cache.delete('my_key')

# Check existence
if cache.has_key('my_key'):
    print("Key exists")

# Set multiple values
cache.set_many({'key1': 'value1', 'key2': 'value2'}, timeout=300)

# Get multiple values
values = cache.get_many(['key1', 'key2'])

# Delete multiple
cache.delete_many(['key1', 'key2'])

# Increment/decrement
cache.set('counter', 0)
cache.incr('counter')
cache.decr('counter')

# Add (only if not exists)
cache.add('new_key', 'value', timeout=300)

# Get or set pattern
def get_expensive_data():
    # Expensive computation
    return compute_data()

value = cache.get_or_set('expensive_key', get_expensive_data, timeout=3600)
```

### Cache Decorators for Views

```python
from django.views.decorators.cache import cache_page, cache_control
from django.utils.decorators import method_decorator
from django.views import View

# Cache entire view for 15 minutes
@cache_page(60 * 15)
def my_view(request):
    return render(request, 'template.html', context)

# Cache with vary on headers
@cache_page(60 * 15)
@cache_control(private=True)
def user_specific_view(request):
    return render(request, 'user_template.html', context)

# Cache class-based view
@method_decorator(cache_page(60 * 15), name='dispatch')
class MyView(View):
    def get(self, request):
        return render(request, 'template.html')

# Per-user caching
from django.views.decorators.vary import vary_on_cookie

@vary_on_cookie
@cache_page(60 * 15)
def user_view(request):
    return render(request, 'user.html', {'user': request.user})
```

### Custom Cache Key Generation

```python
from django.core.cache import cache
import hashlib

def generate_cache_key(*args, **kwargs):
    """Generate consistent cache key from arguments"""
    key_data = f"{args}:{sorted(kwargs.items())}"
    return hashlib.md5(key_data.encode()).hexdigest()

def cached_function(func):
    """Decorator for caching function results"""
    def wrapper(*args, **kwargs):
        cache_key = f"func:{func.__name__}:{generate_cache_key(*args, **kwargs)}"
        result = cache.get(cache_key)

        if result is None:
            result = func(*args, **kwargs)
            cache.set(cache_key, result, timeout=300)

        return result
    return wrapper

@cached_function
def expensive_query(user_id, include_details=False):
    # Expensive database query
    return User.objects.get(id=user_id)
```

### Template Fragment Caching

```html
{% load cache %}

<!-- Cache for 500 seconds -->
{% cache 500 sidebar %}
    <div class="sidebar">
        {% for item in sidebar_items %}
            <div>{{ item.name }}</div>
        {% endfor %}
    </div>
{% endcache %}

<!-- Cache with variable key -->
{% cache 500 user_sidebar user.id %}
    <div class="user-sidebar">
        {{ user.profile }}
    </div>
{% endcache %}

<!-- Cache per language -->
{% cache 500 nav request.LANGUAGE_CODE %}
    {% include "navigation.html" %}
{% endcache %}
```

## Session Storage with Redis

### Configure Redis Sessions

```python
# settings.py

# Use Redis for sessions
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'sessions'

# Or use django-redis session backend directly
SESSION_ENGINE = 'django_redis.session.SessionStore'
SESSION_REDIS = {
    'host': 'localhost',
    'port': 6379,
    'db': 1,
    'prefix': 'session',
    'socket_timeout': 1,
}

# Session settings
SESSION_COOKIE_AGE = 86400  # 24 hours
SESSION_SAVE_EVERY_REQUEST = False
```

### Working with Sessions

```python
from django.contrib.sessions.backends.cache import SessionStore

def login_view(request):
    # Store user data in session
    request.session['user_id'] = user.id
    request.session['username'] = user.username
    request.session['is_authenticated'] = True

    # Set session expiry
    request.session.set_expiry(3600)  # 1 hour

    return redirect('dashboard')

def dashboard_view(request):
    user_id = request.session.get('user_id')
    if not user_id:
        return redirect('login')

    return render(request, 'dashboard.html')

def logout_view(request):
    # Clear session
    request.session.flush()
    return redirect('home')

# Custom session operations
def update_session(request):
    # Modify session data
    request.session['last_activity'] = timezone.now().isoformat()
    request.session.modified = True
```

## Low-Level Redis Access

### Direct Redis Connection

```python
from django_redis import get_redis_connection

def direct_redis_operations():
    redis_conn = get_redis_connection('default')

    # String operations
    redis_conn.set('direct_key', 'value')
    value = redis_conn.get('direct_key')

    # Pipeline for batch operations
    pipe = redis_conn.pipeline()
    pipe.set('key1', 'value1')
    pipe.set('key2', 'value2')
    pipe.incr('counter')
    results = pipe.execute()

    # Pub/Sub
    pubsub = redis_conn.pubsub()
    pubsub.subscribe('channel')

    # Publish message
    redis_conn.publish('channel', 'message')

    # Hash operations
    redis_conn.hset('user:1', mapping={'name': 'John', 'email': 'john@example.com'})
    user = redis_conn.hgetall('user:1')

    # Sorted sets
    redis_conn.zadd('leaderboard', {'player1': 100, 'player2': 200})
    top_players = redis_conn.zrevrange('leaderboard', 0, 10, withscores=True)

    return value
```

### Custom Cache Backend Methods

```python
from django.core.cache import cache

def advanced_cache_operations():
    # Access underlying Redis client
    client = cache.client.get_client()

    # Lock pattern
    lock = client.lock('my_lock', timeout=10)
    if lock.acquire(blocking=False):
        try:
            # Do exclusive work
            pass
        finally:
            lock.release()

    # Scan keys
    for key in client.scan_iter(match='myapp:*'):
        print(key)

    # TTL operations
    ttl = client.ttl('my_key')
    client.expire('my_key', 3600)

    # Atomic operations
    client.setnx('unique_key', 'value')
```

## Celery Integration

### Celery Configuration

```python
# celery.py
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')

app = Celery('myproject')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
```

```python
# settings.py

# Celery Configuration
CELERY_BROKER_URL = 'redis://localhost:6379/3'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/4'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# Task result expiration
CELERY_RESULT_EXPIRES = 3600  # 1 hour

# Rate limiting
CELERY_TASK_ANNOTATIONS = {
    'tasks.send_email': {'rate_limit': '10/m'},
}
```

### Define Tasks

```python
# tasks.py
from celery import shared_task
from django.core.mail import send_mail
from django.contrib.auth.models import User

@shared_task
def send_welcome_email(user_id):
    user = User.objects.get(id=user_id)
    send_mail(
        'Welcome!',
        f'Hello {user.username}, welcome to our site!',
        'noreply@example.com',
        [user.email],
    )
    return f"Email sent to {user.email}"

@shared_task(bind=True, max_retries=3)
def process_order(self, order_id):
    try:
        order = Order.objects.get(id=order_id)
        # Process order...
        return f"Order {order_id} processed"
    except Exception as exc:
        self.retry(exc=exc, countdown=60)

@shared_task
def cleanup_expired_sessions():
    from django.contrib.sessions.models import Session
    from django.utils import timezone

    Session.objects.filter(expire_date__lt=timezone.now()).delete()
```

### Call Tasks

```python
from tasks import send_welcome_email, process_order

# Async execution
send_welcome_email.delay(user.id)

# With countdown (delay)
send_welcome_email.apply_async(args=[user.id], countdown=60)

# With ETA
from datetime import datetime, timedelta
eta = datetime.utcnow() + timedelta(hours=1)
send_welcome_email.apply_async(args=[user.id], eta=eta)

# Get result
result = send_welcome_email.delay(user.id)
print(result.id)  # Task ID
print(result.status)  # PENDING, STARTED, SUCCESS, FAILURE
print(result.get(timeout=10))  # Wait for result
```

## Django Channels with Redis

### Installation and Configuration

```bash
pip install channels channels-redis
```

```python
# settings.py

INSTALLED_APPS = [
    # ...
    'channels',
]

ASGI_APPLICATION = 'myproject.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('localhost', 6379)],
            'capacity': 1500,
            'expiry': 10,
        },
    },
}
```

### ASGI Configuration

```python
# asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import myapp.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AuthMiddlewareStack(
        URLRouter(
            myapp.routing.websocket_urlpatterns
        )
    ),
})
```

### WebSocket Consumer

```python
# consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data['message']

        # Send to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'sender': self.scope['user'].username,
            }
        )

    async def chat_message(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'sender': event['sender'],
        }))
```

### Routing

```python
# routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<room_name>\w+)/$', consumers.ChatConsumer.as_asgi()),
]
```

## Rate Limiting

```python
from django_redis import get_redis_connection
from django.http import HttpResponseTooManyRequests
import time

class RateLimitMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.redis = get_redis_connection('default')

    def __call__(self, request):
        if not self.is_rate_limited(request):
            return self.get_response(request)
        return HttpResponseTooManyRequests('Rate limit exceeded')

    def is_rate_limited(self, request):
        # Get client identifier
        client_ip = self.get_client_ip(request)
        key = f'rate_limit:{client_ip}'

        # Sliding window rate limiting
        now = time.time()
        window = 60  # 1 minute
        max_requests = 100

        pipe = self.redis.pipeline()
        pipe.zremrangebyscore(key, 0, now - window)
        pipe.zadd(key, {str(now): now})
        pipe.zcard(key)
        pipe.expire(key, window)
        results = pipe.execute()

        request_count = results[2]
        return request_count > max_requests

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')
```

## Best Practices

1. **Use connection pooling** to avoid connection overhead
2. **Set appropriate timeouts** for cache operations
3. **Use key prefixes** to namespace your cache keys
4. **Monitor cache hit rates** to optimize caching strategy
5. **Handle cache failures gracefully** - don't let cache errors crash your app
6. **Use pipelines** for batch operations

## Conclusion

Redis integration with Django provides powerful capabilities for caching, session management, background tasks, and real-time features. Key integrations include:

- django-redis for caching and sessions
- Celery with Redis broker for background tasks
- Django Channels for WebSocket support
- Direct Redis access for custom operations

By following the patterns in this guide, you can significantly improve your Django application's performance and scalability.
