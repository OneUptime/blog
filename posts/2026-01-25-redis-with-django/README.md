# How to Use Redis with Django

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Django, Python, Caching, Web Development, Backend

Description: Integrate Redis with Django for caching, sessions, task queues, and real-time features. Learn configuration, best practices, and practical patterns.

---

Redis integrates seamlessly with Django for caching, session storage, and background task processing. Using Redis dramatically improves Django application performance and enables real-time features. This guide covers the essential patterns for using Redis effectively with Django.

## Basic Setup

Install the required packages:

```bash
pip install django-redis redis celery
```

## Cache Configuration

Configure Django to use Redis as the cache backend:

```python
# settings.py

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://localhost:6379/0',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True
            },
            # Serializer options
            'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
            # Socket timeout
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
        },
        'KEY_PREFIX': 'myapp',
        'TIMEOUT': 300,  # Default timeout in seconds
    },
    # Separate cache for sessions
    'sessions': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://localhost:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'session',
        'TIMEOUT': 86400,  # 24 hours
    }
}

# Use Redis for sessions
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'sessions'
```

## Using the Cache

```python
# views.py
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from django.shortcuts import render
from .models import Product

# Basic cache operations
def get_product(request, product_id):
    cache_key = f'product:{product_id}'

    # Try to get from cache
    product_data = cache.get(cache_key)

    if product_data is None:
        # Cache miss - fetch from database
        product = Product.objects.get(id=product_id)
        product_data = {
            'id': product.id,
            'name': product.name,
            'price': str(product.price),
            'description': product.description
        }
        # Store in cache for 1 hour
        cache.set(cache_key, product_data, timeout=3600)

    return JsonResponse(product_data)

# View-level caching
@cache_page(60 * 15)  # Cache for 15 minutes
def product_list(request):
    products = Product.objects.all()
    return render(request, 'products/list.html', {'products': products})

# Cache with versioning
def get_product_v2(request, product_id):
    cache_key = f'product:{product_id}'
    version = cache.get('product_cache_version', 1)

    # Include version in key
    product_data = cache.get(cache_key, version=version)

    if product_data is None:
        product = Product.objects.get(id=product_id)
        product_data = serialize_product(product)
        cache.set(cache_key, product_data, version=version)

    return JsonResponse(product_data)

def invalidate_all_products():
    """Invalidate all product caches by incrementing version"""
    cache.incr('product_cache_version')
```

## Low-Level Redis Access

For operations not supported by Django's cache API:

```python
# utils/redis_client.py
from django_redis import get_redis_connection
from django.core.cache import cache

def get_redis():
    """Get raw Redis connection"""
    return get_redis_connection('default')

# Using raw Redis connection
def increment_page_views(page_id):
    """Atomic counter increment"""
    redis = get_redis()
    return redis.incr(f'page_views:{page_id}')

def rate_limit(user_id, limit=100, window=3600):
    """Simple rate limiting"""
    redis = get_redis()
    key = f'rate_limit:{user_id}'

    current = redis.incr(key)
    if current == 1:
        redis.expire(key, window)

    return current <= limit

def acquire_lock(name, timeout=10):
    """Distributed lock"""
    redis = get_redis()
    lock_key = f'lock:{name}'

    # SET NX with expiration
    acquired = redis.set(lock_key, '1', nx=True, ex=timeout)
    return acquired

def release_lock(name):
    """Release distributed lock"""
    redis = get_redis()
    redis.delete(f'lock:{name}')
```

## Model Caching

Create a mixin for automatic model caching:

```python
# models.py
from django.db import models
from django.core.cache import cache
import json

class CachedModelMixin:
    """Mixin for automatic model caching"""

    CACHE_TIMEOUT = 3600  # 1 hour

    @classmethod
    def get_cache_key(cls, pk):
        return f'{cls.__name__.lower()}:{pk}'

    @classmethod
    def get_cached(cls, pk):
        """Get model instance from cache or database"""
        cache_key = cls.get_cache_key(pk)
        data = cache.get(cache_key)

        if data is None:
            try:
                instance = cls.objects.get(pk=pk)
                instance.cache()
                return instance
            except cls.DoesNotExist:
                return None

        # Reconstruct from cached data
        return cls(**data)

    def cache(self):
        """Store instance in cache"""
        cache_key = self.get_cache_key(self.pk)
        data = self.to_cache_dict()
        cache.set(cache_key, data, timeout=self.CACHE_TIMEOUT)

    def invalidate_cache(self):
        """Remove instance from cache"""
        cache_key = self.get_cache_key(self.pk)
        cache.delete(cache_key)

    def to_cache_dict(self):
        """Convert to dictionary for caching"""
        return {
            field.name: getattr(self, field.name)
            for field in self._meta.fields
        }

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.cache()

    def delete(self, *args, **kwargs):
        self.invalidate_cache()
        super().delete(*args, **kwargs)


class Product(CachedModelMixin, models.Model):
    name = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()

    class Meta:
        app_label = 'products'

# Usage
product = Product.get_cached(1)  # From cache or DB
product.name = 'Updated Name'
product.save()  # Automatically updates cache
```

## Session Handling

With Redis sessions configured:

```python
# views.py
def set_user_preference(request):
    """Store user preference in session"""
    request.session['theme'] = request.POST.get('theme', 'light')
    request.session['language'] = request.POST.get('language', 'en')

    # Session is automatically stored in Redis
    return JsonResponse({'status': 'saved'})

def get_user_preferences(request):
    """Retrieve preferences from session"""
    return JsonResponse({
        'theme': request.session.get('theme', 'light'),
        'language': request.session.get('language', 'en')
    })

# Direct session manipulation
from django.contrib.sessions.backends.cache import SessionStore

def create_anonymous_session():
    """Create session without request"""
    session = SessionStore()
    session['data'] = 'value'
    session.create()
    return session.session_key

def get_session_data(session_key):
    """Read session by key"""
    session = SessionStore(session_key=session_key)
    return dict(session.items())
```

## Celery Integration

Use Redis as Celery broker and result backend:

```python
# settings.py
CELERY_BROKER_URL = 'redis://localhost:6379/2'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/2'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'

# celery.py
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')

app = Celery('myproject')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# tasks.py
from celery import shared_task
from django.core.mail import send_mail
from .models import Order

@shared_task
def send_order_confirmation(order_id):
    """Send order confirmation email asynchronously"""
    order = Order.objects.get(id=order_id)
    send_mail(
        subject=f'Order Confirmation #{order.id}',
        message=f'Thank you for your order!',
        from_email='orders@example.com',
        recipient_list=[order.customer_email]
    )

@shared_task
def process_order(order_id):
    """Process order in background"""
    order = Order.objects.get(id=order_id)
    order.status = 'processing'
    order.save()

    # Process payment, inventory, etc.

    order.status = 'completed'
    order.save()

# Usage in views
def create_order(request):
    order = Order.objects.create(...)

    # Queue background tasks
    send_order_confirmation.delay(order.id)
    process_order.delay(order.id)

    return JsonResponse({'order_id': order.id})
```

## Real-time Features with Channels

Use Redis for Django Channels:

```python
# settings.py
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('localhost', 6379)],
        },
    },
}

# consumers.py
from channels.generic.websocket import AsyncWebsocketConsumer
import json

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['user'].id
        self.group_name = f'notifications_{self.user_id}'

        # Join notification group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def notification(self, event):
        """Send notification to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'message': event['message']
        }))

# Send notification from anywhere
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def send_notification(user_id, message):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'notifications_{user_id}',
        {
            'type': 'notification',
            'message': message
        }
    )
```

## Cache Patterns

```python
# utils/cache_patterns.py
from django.core.cache import cache
from functools import wraps
import hashlib
import json

def cache_result(timeout=300, key_prefix=''):
    """Decorator for caching function results"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            key_parts = [key_prefix, func.__name__]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f'{k}={v}' for k, v in sorted(kwargs.items()))

            cache_key = hashlib.md5(':'.join(key_parts).encode()).hexdigest()

            result = cache.get(cache_key)
            if result is None:
                result = func(*args, **kwargs)
                cache.set(cache_key, result, timeout=timeout)

            return result
        return wrapper
    return decorator

# Usage
@cache_result(timeout=3600, key_prefix='api')
def fetch_external_api(endpoint, params):
    """Cached API call"""
    response = requests.get(endpoint, params=params)
    return response.json()

# Cache invalidation pattern
class CacheInvalidator:
    """Manage cache invalidation across related objects"""

    def __init__(self):
        self.redis = get_redis_connection('default')

    def tag_cache(self, key, *tags):
        """Associate cache key with tags for group invalidation"""
        for tag in tags:
            self.redis.sadd(f'cache_tag:{tag}', key)

    def invalidate_tag(self, tag):
        """Invalidate all cache entries with this tag"""
        tag_key = f'cache_tag:{tag}'
        keys = self.redis.smembers(tag_key)

        if keys:
            cache.delete_many([k.decode() for k in keys])
            self.redis.delete(tag_key)
```

## Summary

| Feature | Redis Usage | Package |
|---------|-------------|---------|
| Caching | Cache backend | django-redis |
| Sessions | Session backend | django-redis |
| Task queue | Celery broker | celery[redis] |
| Real-time | Channel layer | channels-redis |
| Rate limiting | Raw Redis | redis-py |

Key recommendations:
- Use separate Redis databases for cache, sessions, and Celery
- Configure connection pooling for high traffic
- Use cache versioning for easy invalidation
- Implement proper cache invalidation in model save/delete
- Consider using Celery for any background processing
- Use Django Channels with Redis for WebSocket support
