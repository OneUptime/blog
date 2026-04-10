# Validation Summary: How to Use Redis for Django Template Fragment Caching

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Django (template fragment caching)
- django-redis (cache backend)
- Python

## Sources Consulted
- Django official documentation — Cache framework: https://docs.djangoproject.com/en/5.2/topics/cache/
- Django official documentation — `django.core.cache.utils`: https://docs.djangoproject.com/en/5.2/ref/utils/
- django-redis package documentation: https://github.com/jazzband/django-redis

## Issues Found

### 1. Incorrect import path for `make_template_fragment_key` (appeared twice)
- **What was wrong:** The post imported `make_template_fragment_key` from `django.utils.cache`, which is a module for HTTP cache header utilities and does not contain this function.
- **What was changed:** Updated both occurrences to import from `django.core.cache.utils`, which is the correct module as documented in the official Django docs.
- **Lines affected:** The two Python code blocks in the "Programmatic Invalidation" section.

### 2. Misleading explanation of nested fragment caching behavior
- **What was wrong:** The "Nesting Fragments" section stated that an inner fragment "refreshes every 10 min inside a 1-hour sidebar cache," implying independent refresh. In reality, once the outer fragment is cached, its entire rendered output (including the inner fragment) is stored as a static string. The inner `{% cache %}` tag is never re-evaluated until the outer cache expires.
- **What was changed:** Rewrote the explanation and comment to accurately describe that inner fragments do not refresh independently while the outer cache is active, and added a note about alternatives.

## Review Notes
- The rest of the post is technically accurate: `{% cache %}` tag syntax, vary variables, `{% load cache %}`, per-user and per-language caching patterns, and programmatic invalidation with `cache.delete()` are all correct.
- The `vary_on=[42]` example passes an integer, which works because Django's `make_template_fragment_key` calls `str()` on each vary-on value internally.
- The CACHES settings configuration for django-redis is correct and follows current best practices.
