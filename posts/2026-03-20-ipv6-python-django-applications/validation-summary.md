# Validation Summary: How to Handle IPv6 in Python Django Applications

## Status
validated

## Post Type
Guide

## Technologies Covered
- Python
- Django
- Django REST Framework
- PostgreSQL
- IPv6
- HTTP proxy headers

## Sources Consulted
- Django settings reference (`ALLOWED_HOSTS`): https://docs.djangoproject.com/en/5.2/ref/settings/
- Django request/response reference (`HttpRequest.META`, `get_host()`): https://docs.djangoproject.com/en/5.0/ref/request-response/
- Django request source (`get_host()`, default IPv6 localhost handling): https://docs.djangoproject.com/en/5.0/_modules/django/http/request/
- Django `runserver` documentation: https://docs.djangoproject.com/en/5.2/ref/django-admin/#runserver
- Django model field reference (`GenericIPAddressField` behavior and IPv6 normalization rules): https://docs.djangoproject.com/en/5.2/ref/models/fields/
- Django model instance reference (`clean()`/`full_clean()` not called automatically by `save()`): https://docs.djangoproject.com/en/5.2/ref/models/instances/
- Django REST Framework serializer fields (`IPAddressField`): https://www.django-rest-framework.org/api-guide/fields/#ipaddressfield
- Python `ipaddress` module reference: https://docs.python.org/3/library/ipaddress.html
- PostgreSQL libpq connection parameters (`host`, `hostaddr`): https://www.postgresql.org/docs/current/libpq-connect.html
- RFC 7239, Forwarded HTTP Extension: https://datatracker.ietf.org/doc/html/rfc7239

## Issues Found
- The `ALLOWED_HOSTS` example used bare IPv6 literals such as `::1`. Django validates literal IPv6 hosts in bracketed form, so the examples were corrected to `[::1]` and `[2001:db8::1]`.
- One sample IPv6 literal, `2001:db8::app`, was invalid because `app` is not valid hexadecimal. It was corrected to `2001:db8::1`.
- The `ALLOWED_HOSTS` hostname comment implied DNS resolution to IPv6 was relevant to host validation. It was revised because Django matches the host header string, not the DNS record type.
- The client IP helper described `X-Forwarded-For` and `X-Real-IP` without a trust boundary. The wording was corrected to state these headers should only be trusted when set by a trusted proxy or load balancer.
- The client IP helper used `IPv6Address(...)` directly, which only normalizes IPv6 input. It was updated to `ipaddress.ip_address(...)` so both IPv4 and IPv6 are parsed consistently while still unpacking IPv4-mapped IPv6 addresses.
- The view determined IP version with a colon check. It was updated to use `ipaddress.ip_address(...).version`, which is more accurate for normalized addresses.
- The model example said normalization happened “on save” but implemented the logic in `clean()`. Django does not call `clean()` automatically from `save()`, so the normalization was moved into `save()` to match the behavior described.
- The model allowed any integer for `prefix_length`. Validators were added to constrain it to the valid IPv6 range of 0-128.
- The middleware logged `REMOTE_ADDR` directly, which can be only the proxy address in proxied deployments. It was updated to reuse the earlier client-IP helper and to detect IP version via the `ipaddress` module.
- The conclusion referred to “custom model fields,” but the post actually used model validation on a `CharField`. The wording was corrected.

## Review Notes
- The Django REST Framework example is technically valid as written, although DRF also provides a built-in `IPAddressField` that can cover many IPv6 validation cases.
- The PostgreSQL `HOST` example is acceptable because libpq accepts IP addresses, including IPv6, for connection parameters.
- The article remains generic across Django versions, but the review was checked against current official Django 5.2-era documentation and current Python `ipaddress` documentation.
