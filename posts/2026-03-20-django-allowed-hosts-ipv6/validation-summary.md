# Validation Summary: How to Configure Django ALLOWED_HOSTS for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Django
- Python
- IPv6
- NGINX
- HTTP Host headers

## Sources Consulted
- Django settings reference: https://docs.djangoproject.com/en/6.0/ref/settings/#allowed-hosts
- Django `runserver` reference: https://docs.djangoproject.com/en/6.0/ref/django-admin/#runserver
- Django logging reference: https://docs.djangoproject.com/en/6.0/ref/logging/#django-security
- Django request host parsing source: https://raw.githubusercontent.com/django/django/main/django/http/request.py
- NGINX core module docs for `$host`: https://nginx.org/en/docs/http/ngx_http_core_module.html#$host
- NGINX server names docs: https://nginx.org/en/docs/http/server_names.html
- RFC 3986 Section 3.2.2 (URI host / IPv6 literals): https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.2
- RFC 9110 Section 7.2 (HTTP Host header): https://datatracker.ietf.org/doc/rfc9110/#section-7.2
- NGINX ticket #1, historical IPv6 `$host` parsing bug fixed in 1.1.9: https://trac.nginx.org/nginx/ticket/1

## Issues Found
- The NGINX section incorrectly claimed that `$host` strips IPv6 brackets and that Django should therefore allow an unbracketed IPv6 literal. I corrected the example and `ALLOWED_HOSTS` guidance so it matches Django’s bracketed IPv6 host validation and modern NGINX behavior.
- The development-server section incorrectly said that binding `runserver` to `::` means `[::]` belongs in `ALLOWED_HOSTS`. I corrected this to explain that Django validates the host clients actually send, not the bind address.
- The shell debugging example did not actually trigger Django’s host validation and included an unused import. I updated it to call `request.get_host()` and show `DisallowedHost` behavior directly.
- The test example depended on `ALLOWED_HOSTS` behavior without configuring it, even though Django checks `ALLOWED_HOSTS` during tests. I added `override_settings(...)` so the sample behaves as described.

## Review Notes
- The corrected NGINX guidance assumes modern NGINX behavior. Very old NGINX 1.0.x releases had an IPv6 `$host` parsing bug that was fixed in 1.1.9.
