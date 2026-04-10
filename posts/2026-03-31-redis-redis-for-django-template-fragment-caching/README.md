# How to Use Redis for Django Template Fragment Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Django, Template, Caching, Performance

Description: Learn how to use Django's template fragment caching with Redis to cache expensive partial template sections like navigation menus and product lists.

---

Full-page caching is too coarse for pages that mix dynamic and static content. Django's `{% cache %}` template tag lets you cache individual fragments, so expensive sections render once while personalized parts remain dynamic.

## Prerequisites

```bash
pip install django-redis
```

```python
# settings.py
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/0",
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        "KEY_PREFIX": "myapp",
    }
}
```

## Basic Template Fragment Cache

```html
{% load cache %}

<!DOCTYPE html>
<html>
<body>
  <!-- Cache this nav menu for 1 hour (3600 seconds) -->
  {% cache 3600 navigation %}
    <nav>
      {% for item in nav_items %}
        <a href="{{ item.url }}">{{ item.title }}</a>
      {% endfor %}
    </nav>
  {% endcache %}

  <!-- Always render user-specific content -->
  <h1>Hello, {{ user.username }}</h1>

  <!-- Cache product list for 5 minutes -->
  {% cache 300 product_list %}
    <ul>
      {% for product in products %}
        <li>{{ product.name }} - ${{ product.price }}</li>
      {% endfor %}
    </ul>
  {% endcache %}
</body>
</html>
```

## Per-User Fragment Cache

Add vary variables after the cache name to create separate cached copies:

```html
{% load cache %}

<!-- Cache per logged-in user -->
{% cache 600 user_dashboard request.user.id %}
  <div class="dashboard">
    <h2>Your Orders ({{ orders|length }})</h2>
    {% for order in orders %}
      <p>Order #{{ order.id }}</p>
    {% endfor %}
  </div>
{% endcache %}
```

Each unique value combination creates a separate Redis key.

## Per-Language and Per-Site Caching

```html
{% load cache i18n %}

{% get_current_language as LANGUAGE_CODE %}

{% cache 3600 sidebar LANGUAGE_CODE %}
  <aside>
    <h3>{% trans "Popular Articles" %}</h3>
    {% for article in popular_articles %}
      <a href="{{ article.get_absolute_url }}">{{ article.title }}</a>
    {% endfor %}
  </aside>
{% endcache %}
```

## Programmatic Invalidation

Manually expire a cached fragment from Python:

```python
from django.core.cache import cache
from django.core.cache.utils import make_template_fragment_key

# Invalidate "product_list" fragment (no vary variables)
key = make_template_fragment_key("product_list")
cache.delete(key)

# Invalidate per-user dashboard for user ID 42
key = make_template_fragment_key("user_dashboard", vary_on=[42])
cache.delete(key)
```

In a view that updates a product:

```python
from django.core.cache.utils import make_template_fragment_key
from django.core.cache import cache

def update_product(request, pk):
    product = get_object_or_404(Product, pk=pk)
    # ... update product ...

    # Bust the product list cache
    cache.delete(make_template_fragment_key("product_list"))
    return redirect("product_list")
```

## Nesting Fragments

Fragment caches can nest, but the inner fragment will not refresh independently while the outer fragment is cached. Once the outer fragment is stored, its rendered content (including the inner fragment's output) is served as a static string until the outer cache expires:

```html
{% cache 3600 page_sidebar %}
  {% cache 600 featured_products %}
    <!-- This inner fragment only refreshes when the outer sidebar cache expires -->
    {% for p in featured %} ... {% endfor %}
  {% endcache %}

  <div class="static-links">...</div>
{% endcache %}
```

To allow inner fragments to refresh independently, cache them outside the outer block or use the same timeout for both.

## Summary

Django template fragment caching with Redis allows fine-grained control over which parts of a template are cached. Use `{% cache timeout fragment_name [vary_vars] %}` in templates and `make_template_fragment_key()` in views for programmatic invalidation. Vary by user ID, language, or any dimension to create per-context cached copies stored as separate Redis keys.
