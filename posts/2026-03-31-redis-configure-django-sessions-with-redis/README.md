# How to Configure Django Sessions with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Django, Session, Authentication, django-redis

Description: Learn how to configure Django to store sessions in Redis using django-redis, including TTL settings, session engine setup, and multi-site configurations.

---

By default, Django stores sessions in a database table. Switching to Redis improves read performance dramatically and enables distributed session sharing across multiple app servers.

## Installation

```bash
pip install django-redis
```

## Configuration

In `settings.py`, set up the cache backend and session engine:

```python
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        }
    }
}

# Use the cache backend for sessions
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"
```

For persistent sessions (survives Redis restart), use cached_db:

```python
SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"
```

## Setting Session TTL

```python
# Session expires after 2 weeks (in seconds)
SESSION_COOKIE_AGE = 60 * 60 * 24 * 14

# Expire session when browser closes
SESSION_EXPIRE_AT_BROWSER_CLOSE = False

# Refresh the TTL on every request
SESSION_SAVE_EVERY_REQUEST = False
```

## Using Sessions in Views

Sessions work identically regardless of backend:

```python
from django.shortcuts import render, redirect

def login_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        # ... validate credentials ...
        request.session["user_id"] = 42
        request.session["username"] = username
        request.session.set_expiry(3600)  # override per-session TTL
        return redirect("dashboard")
    return render(request, "login.html")

def dashboard_view(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return redirect("login")
    return render(request, "dashboard.html", {"user_id": user_id})

def logout_view(request):
    request.session.flush()  # delete session data and cookie
    return redirect("login")
```

## Separate Cache for Sessions

Keep session data in a dedicated Redis database to prevent cache evictions from expiring active sessions:

```python
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/0",
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
    },
    "sessions": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
    },
}

SESSION_CACHE_ALIAS = "sessions"
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
```

## Inspecting Active Sessions

```python
from django.core.cache import caches

session_cache = caches["sessions"]
backend = session_cache.client.get_client()
keys = backend.keys("*")
print(f"Active sessions: {len(keys)}")
```

## Summary

Configuring Django sessions with Redis requires setting `SESSION_ENGINE` to `django.contrib.sessions.backends.cache` and pointing `SESSION_CACHE_ALIAS` to a `django-redis` cache. Use a dedicated Redis database for sessions to prevent LRU eviction from kicking out active users, and set `SESSION_COOKIE_AGE` to control expiry. Sessions API in views is identical regardless of backend.
