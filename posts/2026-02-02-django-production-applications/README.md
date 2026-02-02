# How to Build Production Django Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, Django, Production, Web Development, Best Practices

Description: A comprehensive guide to building production-ready Django applications, covering project structure, security settings, database optimization, and deployment best practices.

---

> Getting Django running locally is easy. Getting it production-ready is where most developers stumble. This guide covers the practical steps to take your Django app from development to a deployment you can trust.

A production-ready Django application handles errors gracefully, protects sensitive data, performs well under load, and is easy to debug when things go wrong. Let's walk through what that actually looks like.

---

## Project Structure

A clean project structure makes your codebase easier to navigate and maintain. Here is a layout that works well for medium to large applications:

```
myproject/
├── config/
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py           # Shared settings
│   │   ├── development.py    # Dev-specific settings
│   │   └── production.py     # Production settings
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   ├── users/
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   └── tests.py
│   └── orders/
│       ├── models.py
│       ├── views.py
│       └── tests.py
├── static/
├── templates/
├── manage.py
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
└── Dockerfile
```

---

## Environment-Based Settings

Split your settings into multiple files to avoid production configuration mistakes. The base settings file contains everything shared across environments:

```python
# config/settings/base.py
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Read secret key from environment variable - never hardcode this
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party apps
    'rest_framework',
    'corsheaders',
    # Local apps
    'apps.users',
    'apps.orders',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Serve static files efficiently
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'
```

The production settings file enables all security features:

```python
# config/settings/production.py
from .base import *

DEBUG = False

# Only allow your actual domain
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

# Database - use PostgreSQL in production
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        # Connection pooling settings
        'CONN_MAX_AGE': 60,
        'OPTIONS': {
            'connect_timeout': 10,
        },
    }
}

# Static files with compression
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

---

## Security Checklist

Django has excellent built-in security features, but many are disabled by default. Here is what you need to enable for production:

| Setting | Value | Purpose |
|---------|-------|---------|
| `DEBUG` | `False` | Prevents detailed error pages from leaking sensitive info |
| `SECRET_KEY` | Environment variable | Used for cryptographic signing - keep it secret |
| `ALLOWED_HOSTS` | Your domain(s) | Prevents HTTP Host header attacks |
| `SECURE_SSL_REDIRECT` | `True` | Forces HTTPS connections |
| `SESSION_COOKIE_SECURE` | `True` | Only send session cookies over HTTPS |
| `CSRF_COOKIE_SECURE` | `True` | Only send CSRF cookies over HTTPS |
| `SECURE_HSTS_SECONDS` | `31536000` | Tells browsers to only use HTTPS for one year |
| `SECURE_HSTS_INCLUDE_SUBDOMAINS` | `True` | Applies HSTS to all subdomains |
| `SECURE_CONTENT_TYPE_NOSNIFF` | `True` | Prevents MIME-type sniffing attacks |

Add these to your production settings:

```python
# config/settings/production.py - security settings

# Force HTTPS
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Secure cookies
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True

# HTTP Strict Transport Security
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Prevent clickjacking
X_FRAME_OPTIONS = 'DENY'

# Prevent content type sniffing
SECURE_CONTENT_TYPE_NOSNIFF = True

# Content Security Policy - adjust based on your needs
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'",)
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")
```

---

## Database Optimization

Slow database queries are usually the biggest performance problem. Use Django's query optimization tools:

```python
# apps/orders/views.py
from django.db.models import Prefetch
from rest_framework import viewsets
from .models import Order, OrderItem

class OrderViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        # Use select_related for foreign keys (single query with JOIN)
        # Use prefetch_related for reverse relations and many-to-many
        return Order.objects.select_related(
            'customer',           # ForeignKey - single JOIN
            'shipping_address',   # ForeignKey - single JOIN
        ).prefetch_related(
            Prefetch(
                'items',          # Reverse relation - separate query
                queryset=OrderItem.objects.select_related('product')
            )
        ).filter(
            customer=self.request.user
        )
```

Add database indexes for columns you query frequently:

```python
# apps/orders/models.py
from django.db import models

class Order(models.Model):
    customer = models.ForeignKey('users.User', on_delete=models.CASCADE)
    status = models.CharField(max_length=20, db_index=True)  # Add index
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    total = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        # Composite index for common query patterns
        indexes = [
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['created_at', 'status']),
        ]
        ordering = ['-created_at']
```

---

## Static Files Configuration

Use WhiteNoise to serve static files efficiently without needing a separate web server:

```python
# config/settings/production.py

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# WhiteNoise compression and caching
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Collect static files during deployment
# Run: python manage.py collectstatic --noinput
```

---

## Logging Configuration

Good logging helps you debug production issues. Configure structured logging that works well with log aggregation tools:

```python
# config/settings/production.py

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(levelname)s %(name)s %(message)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',  # Use JSON in production for log aggregation
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.environ.get('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'WARNING',  # Set to DEBUG to see all SQL queries
            'propagate': False,
        },
        # Your app-specific logger
        'apps': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

Use the logger in your code:

```python
# apps/orders/views.py
import logging

logger = logging.getLogger(__name__)

class OrderViewSet(viewsets.ModelViewSet):
    def create(self, request, *args, **kwargs):
        logger.info(
            'Creating order',
            extra={
                'user_id': request.user.id,
                'item_count': len(request.data.get('items', [])),
            }
        )
        return super().create(request, *args, **kwargs)
```

---

## Health Check Endpoint

Add a health check endpoint for container orchestration and load balancers:

```python
# apps/health/views.py
from django.http import JsonResponse
from django.db import connection

def health_check(request):
    # Check database connection
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
    except Exception as e:
        return JsonResponse(
            {'status': 'unhealthy', 'database': str(e)},
            status=503
        )

    return JsonResponse({
        'status': 'healthy',
        'database': 'connected',
    })

# config/urls.py
from apps.health.views import health_check

urlpatterns = [
    path('health/', health_check, name='health_check'),
    # ... other urls
]
```

---

## Deployment Checklist

Before deploying to production, run through this checklist:

```bash
# Check for security issues
python manage.py check --deploy

# Run migrations
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput

# Verify settings are loaded correctly
python manage.py diffsettings
```

A minimal Dockerfile for production:

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements/production.txt .
RUN pip install --no-cache-dir -r production.txt

# Copy application code
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Run with gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "config.wsgi:application"]
```

---

## Summary

Building production Django applications comes down to these fundamentals:

1. Split settings by environment and never commit secrets
2. Enable all security middleware and headers
3. Optimize database queries with select_related and prefetch_related
4. Use proper logging for debugging production issues
5. Add health checks for orchestration tools
6. Run `manage.py check --deploy` before every deployment

Django gives you solid defaults, but production readiness requires understanding what those defaults are and when to change them. Start with the security checklist, add monitoring, and build from there.
