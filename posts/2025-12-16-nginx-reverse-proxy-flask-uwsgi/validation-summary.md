# Validation Summary: How to Configure Nginx as Reverse Proxy for Flask/uWSGI

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Nginx
- Flask
- uWSGI
- Python
- Docker and Docker Compose
- systemd
- PostgreSQL

## Sources Consulted
- Flask deployment documentation: https://flask.palletsprojects.com/en/stable/deploying/
- Flask changelog: https://flask.palletsprojects.com/en/stable/changes/
- Flask proxy documentation: https://flask.palletsprojects.com/en/stable/deploying/proxy_fix/
- Werkzeug ProxyFix documentation: https://werkzeug.palletsprojects.com/en/stable/middleware/proxy_fix/
- Nginx uWSGI module documentation: https://nginx.org/en/docs/http/ngx_http_uwsgi_module.html
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx changelog: https://nginx.org/en/CHANGES
- Nginx core module alias documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#alias
- uWSGI Nginx support documentation: https://uwsgi-docs.readthedocs.io/en/latest/Nginx.html
- uWSGI options reference: https://uwsgi-docs.readthedocs.io/en/latest/Options.html
- uWSGI systemd documentation: https://uwsgi-docs.readthedocs.io/en/latest/Systemd.html
- Docker Compose file reference for version and name: https://docs.docker.com/reference/compose-file/version-and-name/
- MDN X-XSS-Protection header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection

## Issues Found
- Updated `listen 443 ssl http2;` to `listen 443 ssl;` plus `http2 on;` because Nginx 1.25.1 introduced the standalone `http2` directive and deprecated the `listen ... http2` parameter.
- Removed the `X-XSS-Protection: 1; mode=block` header because MDN marks it deprecated and no longer recommended for production use.
- Changed static file locations from `/static` with non-trailing-slash aliases to `/static/` with trailing-slash aliases, and made `favicon.ico` and `robots.txt` exact-match locations. This avoids unintended prefix matches such as `/staticfoo` and aligns with Nginx alias examples.
- Changed custom uWSGI forwarding parameters from `Host`, `X-Real-IP`, `X-Forwarded-For`, and `X-Forwarded-Proto` to WSGI-style `HTTP_HOST`, `HTTP_X_REAL_IP`, `HTTP_X_FORWARDED_FOR`, and `HTTP_X_FORWARDED_PROTO`, so Flask/Werkzeug receive them as HTTP headers in the WSGI environ.
- Removed the obsolete top-level `version: '3.8'` field from the Compose example and renamed the heading to `compose.yml`, since current Docker Compose treats `version` as backward-compatible metadata and warns when it is used.
- Removed `FLASK_ENV=production` from the Compose environment because Flask 2.3 removed `FLASK_ENV`.
- Replaced the Docker healthcheck's `curl` command with a Python standard-library check, because the provided `python:3.11-slim` Dockerfile does not install `curl`.
- Replaced `uwsgi --ini uwsgi.ini --check-static /var/www/myapp` with `uwsgi --ini uwsgi.ini --show-config`, because `--check-static` configures static file lookup rather than testing the uWSGI configuration.

## Review Notes
- The uWSGI and Nginx snippets are broadly valid after the fixes, but production deployments should still tune process counts, memory limits, cache rules, and forwarded-header trust settings for their exact workload and proxy topology.
- If the Flask app uses `request.remote_addr`, `request.scheme`, or URL generation behind Nginx, it should also configure Werkzeug `ProxyFix` with trusted proxy counts in application code.
