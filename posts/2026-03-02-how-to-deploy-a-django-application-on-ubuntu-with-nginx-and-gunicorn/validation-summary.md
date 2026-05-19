# Validation Summary: How to Deploy a Django Application on Ubuntu with Nginx and Gunicorn

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Ubuntu 22.04 / 24.04
- Python virtual environments and pip
- Django production settings and management commands
- Gunicorn WSGI server
- systemd service management
- Nginx reverse proxy and static file serving
- Certbot / Let's Encrypt TLS certificates

## Sources Consulted
- Django deployment checklist: https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/
- Django WSGI deployment docs: https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
- Django static files deployment docs: https://docs.djangoproject.com/en/dev/howto/static-files/deployment/
- Django settings reference for `SECURE_PROXY_SSL_HEADER`: https://docs.djangoproject.com/en/6.0/ref/settings/#secure-proxy-ssl-header
- Django 4.0 release notes for removal of `SECURE_BROWSER_XSS_FILTER`: https://docs.djangoproject.com/en/6.0/releases/4.0/
- Gunicorn deployment docs for Nginx and systemd: https://docs.gunicorn.org/en/latest/deploy.html
- Gunicorn settings reference for `--bind`, `--workers`, `--timeout`, logging, and `--umask`: https://docs.gunicorn.org/en/stable/settings.html
- Nginx `proxy_pass` documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass
- Nginx release notes for deprecated `listen ... http2` parameter: https://docs.nginx.com/nginx/releases/
- Certbot Nginx instructions: https://certbot.eff.org/instructions?ws=nginx&os=snap
- MDN `X-XSS-Protection` reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection

## Issues Found
- The introduction said Django's development server handles one request at a time. Current Django documentation frames `runserver` as a development-only server that has not been security or performance hardened for production; the concurrency wording was inaccurate, so it was corrected.
- The package installation command used `git clone` later but did not install `git`. Added `git` to the initial `apt install` command.
- The Django settings snippet included `SECURE_BROWSER_XSS_FILTER`, which was removed in Django 4.0. Removed it and added `SECURE_PROXY_SSL_HEADER` to match the Nginx `X-Forwarded-Proto` proxy header used later in the guide.
- The systemd service used `Type=notify` without the `NotifyAccess=main` setting shown in Gunicorn's official systemd example. Added it.
- The Gunicorn Unix socket was intended for Nginx access, but the service did not set an explicit socket umask and included an unused `RuntimeDirectory`. Added `--umask 007` and removed the unused runtime directory lines.
- The Nginx configuration referenced Let's Encrypt certificate files before the Certbot step created them. On a fresh server this would make `nginx -t` fail. Changed the initial Nginx config to a working HTTP virtual host and moved HTTPS/redirect setup to Certbot with `--redirect`.
- The Nginx snippet used `listen 443 ssl http2`, whose `http2` listen parameter is deprecated in newer Nginx releases. Removing the premature HTTPS server block also removed that deprecated form.
- Removed the deprecated `X-XSS-Protection` response header from the Nginx snippet, consistent with Django's removal of the related setting and MDN's deprecation guidance.
- The Certbot commands should be run as root and the renewal timer should be started as well as enabled. Kept `sudo` on Certbot commands and changed the timer command to `systemctl enable --now certbot.timer`.

## Review Notes
- The guide remains a conventional single-server Django deployment pattern. Future improvements could mention running `python manage.py check --deploy`, pinning project dependencies in `requirements.txt`, and adding HSTS after HTTPS is confirmed working.
