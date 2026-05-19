# Validation Summary: How to Deploy a Flask Application on Ubuntu with Nginx and uWSGI

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Ubuntu 22.04 and 24.04
- Python 3 and virtual environments
- Flask
- uWSGI
- systemd socket and service units
- Nginx
- Certbot / Let's Encrypt

## Sources Consulted
- Flask deployment documentation: https://flask.palletsprojects.com/en/stable/deploying/
- Flask 3.1 changelog for removed `FLASK_ENV`: https://flask.palletsprojects.com/en/stable/changes/
- Werkzeug `ProxyFix` documentation: https://werkzeug.palletsprojects.com/en/stable/middleware/proxy_fix/
- uWSGI systemd documentation: https://uwsgi-docs.readthedocs.io/en/latest/Systemd.html
- uWSGI Nginx support documentation: https://uwsgi-docs.readthedocs.io/en/latest/Nginx.html
- Nginx uWSGI module documentation: https://nginx.org/r/uwsgi_pass
- Certbot Nginx instructions: https://certbot.eff.org/instructions?ws=nginx
- systemd socket unit documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.socket.html

## Issues Found
- The introduction described Flask's built-in development server as single-threaded. Current Flask documentation emphasizes that the server is for local development and not suitable for production; the single-threaded claim is no longer a reliable current characterization. Updated the wording to match Flask's production deployment guidance.
- The environment file used `FLASK_ENV=production`, but Flask 2.3 removed the `FLASK_ENV` environment variable after deprecating it in Flask 2.2. Replaced it with `FLASK_DEBUG=0`.
- The systemd instructions enabled both `flaskapp.socket` and `flaskapp.service`, which would start the service at boot and undermine the described socket-activation behavior. Removed the service enable command and clarified that the service can remain inactive until the first request.
- The Nginx configuration referenced Let's Encrypt certificate files before the Certbot command created them, so `nginx -t` would fail on a fresh system. Changed the initial Nginx config to HTTP-only and noted that Certbot updates the server block for HTTPS and redirects.
- The Flask `ProxyFix` example trusted forwarded protocol and host headers, but the Nginx uWSGI configuration only sent client IP headers. Added `HTTP_X_FORWARDED_PROTO` and `HTTP_X_FORWARDED_HOST` uWSGI parameters.

## Review Notes
The core deployment approach is technically valid. The post still uses uWSGI, which remains functional, but many new Flask deployments also use alternatives such as Gunicorn; this is a future editorial consideration rather than a correctness issue.
