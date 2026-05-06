# Validation Summary: How to Configure Django for IPv6 Support

## Status
validated

## Post Type
Guide

## Technologies Covered
- Django
- Python
- IPv6
- Gunicorn
- Uvicorn
- HTTP host validation
- Reverse proxy headers

## Sources Consulted
- Django 6.0 settings reference: `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `SESSION_COOKIE_DOMAIN` — https://docs.djangoproject.com/en/6.0/ref/settings/
- Django 6.0 `django-admin` / `manage.py` reference: `runserver` IPv6 usage — https://docs.djangoproject.com/en/6.0/ref/django-admin/
- Django 6.0 request/response reference: `HttpRequest.get_host()` and proxy-header middleware example — https://docs.djangoproject.com/en/6.0/ref/request-response/
- Django 6.0 model field reference: `GenericIPAddressField` — https://docs.djangoproject.com/en/6.0/ref/models/fields/
- Django 6.0 form field reference: `forms.GenericIPAddressField` — https://docs.djangoproject.com/en/6.0/ref/forms/fields/
- Django source, stable/6.0.x: `django/http/request.py` host validation and `split_domain_port()` behavior for bracketed IPv6 literals — https://github.com/django/django/blob/stable/6.0.x/django/http/request.py
- Gunicorn settings reference: `--bind` with IPv6 addresses — https://docs.gunicorn.org/en/stable/settings.html
- Uvicorn settings reference: IPv6 `--host "::"` support — https://www.uvicorn.org/settings/

## Issues Found
- The introduction stated that Django requires explicit configuration to work with IPv6. I changed this to reflect Django's built-in IPv6 support and clarified that explicit configuration is mainly needed for non-default hosts, reverse proxies, and production deployment.
- The `ALLOWED_HOSTS` example mixed bracketed and unbracketed IPv6 literals. I removed the unbracketed forms and kept bracketed IPv6 literals only, which matches Django's host validation behavior for IPv6 host headers.
- The `ALLOWED_HOSTS` explanation implied bracket notation was specifically a dev-server requirement. I corrected this to explain that Django already allows `[::1]` by default when `DEBUG=True` and `ALLOWED_HOSTS` is empty, and that other IPv6 literals must be added in bracketed form when used.
- The middleware section implied that special `REMOTE_ADDR` handling is generally required for IPv6. I corrected this to make the middleware explicitly about trusted reverse-proxy setups and added a warning that `X-Forwarded-For` should only be trusted from proxies you control.
- The form example referenced `self.allow_loopback` without defining it, which would raise `AttributeError` at runtime. I added an `__init__()` method that accepts `allow_loopback` and stores it on the form instance.
- The session cookie explanation implied that `SESSION_COOKIE_DOMAIN = None` is an IPv6-specific requirement. I corrected the comment to reflect that this is simply Django's default host-only cookie behavior.
- The conclusion said Gunicorn and Uvicorn are both bound to `[::]:8000`. I corrected this to the more general and accurate statement that they should be bound to IPv6, since the Uvicorn example uses `--host "::"` rather than a bracketed bind string.
- The conclusion recommended `ProxyFix`, which is not a Django-native recommendation and was not supported by the Django sources reviewed here. I replaced that with an accurate reverse-proxy trust note.

## Review Notes
- The post is now technically sound against current Django 6.0, Gunicorn, and Uvicorn documentation.
- The `runserver` examples using bracketed IPv6 addresses are valid; Django also supports `runserver -6` for loopback IPv6.
- `GenericIPAddressField` in both models and forms already normalizes IPv6 addresses per RFC 4291, so the extra `ipaddress` usage in the form is optional but still valid for custom policy checks such as loopback rejection.
