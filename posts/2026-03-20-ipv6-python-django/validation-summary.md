# Validation Summary: How to Configure IPv6 in Python Django Applications

## Status
validated

## Post Type
Guide

## Technologies Covered
- Python
- Django
- IPv6
- Gunicorn
- Nginx
- Reverse proxy headers (`Host`, `X-Forwarded-For`, `X-Forwarded-Proto`)

## Sources Consulted
- Django `runserver` documentation: https://docs.djangoproject.com/en/5.2/ref/django-admin/#runserver
- Django settings documentation (`ALLOWED_HOSTS`, `USE_X_FORWARDED_HOST`, `SECURE_PROXY_SSL_HEADER`): https://docs.djangoproject.com/en/4.2/ref/settings/
- Django model field reference (`GenericIPAddressField`): https://docs.djangoproject.com/en/5.2/ref/models/fields/#genericipaddressfield
- Django form field reference (`GenericIPAddressField`): https://docs.djangoproject.com/en/6.0/ref/forms/fields/#genericipaddressfield
- Django request source (`split_domain_port`, `validate_host`): https://docs.djangoproject.com/en/4.2/_modules/django/http/request/
- Gunicorn settings (`bind`, `worker_class`): https://docs.gunicorn.org/en/21.0.1/settings.html
- Gunicorn installation notes for async workers / gevent extras: https://docs.gunicorn.org/en/20.x/install.html
- Nginx core module documentation (`listen`): https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx proxy module documentation (`proxy_set_header`): https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- RFC 7421, Analysis of the 64-bit Boundary in IPv6 Addressing: https://www.rfc-editor.org/rfc/rfc7421
- RFC 8981, Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6: https://www.rfc-editor.org/rfc/rfc8981

## Issues Found
- The `ALLOWED_HOSTS` example used bare IPv6 literals (`::1`, `2001:db8::1`). Django host validation expects bracketed IPv6 host literals, so these were changed to `[::1]` and `[2001:db8::1]`.
- The settings section said `USE_X_FORWARDED_HOST = True` was for `X-Forwarded-For`, which is incorrect. That setting affects `X-Forwarded-Host`, not client IP handling, and it was unnecessary for the shown Nginx config, so it was removed.
- The dev-server "dual-stack" example showed two concurrent `runserver` processes on the same port. Django documents concurrent dev servers on separate ports, so the example was changed to use different ports.
- The middleware logged `"private"` for every non-global IPv6 address. That overstates what `ipaddress.is_global` means, so the label was changed to `"non-global"`.
- The Nginx example used `$proxy_add_x_forwarded_for` while the middleware trusted the first `X-Forwarded-For` entry. On an edge proxy this can preserve client-supplied values, so the example was changed to pass `$remote_addr` instead.
- The Gunicorn example specified `--worker-class gevent` without mentioning the extra dependency. The example was simplified to the default worker class to avoid an incomplete command.
- The conclusion was updated to reflect the corrected `ALLOWED_HOSTS` format and to clarify that `X-Forwarded-For` should only be trusted when set by a trusted proxy.

## Review Notes
- The post is technically sound after the fixes above.
- The `/64` rate-limiting recommendation is a reasonable IPv6 operational heuristic, especially in networks using SLAAC and temporary addresses, but it is deployment guidance rather than a Django-specific requirement.
