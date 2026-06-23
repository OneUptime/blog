# Validation Summary: How to Fix Flask Application Traceback Not Showing in Nginx Logs

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Flask
- Python logging
- Gunicorn
- systemd / journalctl
- Nginx reverse proxy and logging configuration
- Sentry Python SDK

## Sources Consulted
- Flask logging documentation: https://flask.palletsprojects.com/en/stable/logging/
- Flask error handling documentation: https://flask.palletsprojects.com/en/stable/errorhandling/
- Python logging documentation: https://docs.python.org/3/library/logging.html
- Gunicorn settings documentation: https://gunicorn.org/reference/settings/
- Nginx access log module documentation: https://nginx.org/en/docs/http/ngx_http_log_module.html
- Nginx core module documentation for error_page and internal: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx proxy module documentation for proxy_pass and proxy_intercept_errors: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- NGINX logging administration guide: https://docs.nginx.com/nginx/admin-guide/monitoring/logging/
- systemd.exec documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- Sentry Flask integration documentation: https://docs.sentry.io/platforms/python/integrations/flask/

## Issues Found
- The basic Flask logging example set both the handler and logger to `ERROR` but used `app.logger.info()` with a comment saying it would be logged. Changed the comment to clarify that `INFO` messages require the logger and handler to be set to `INFO`.
- The generic Flask `@app.errorhandler(Exception)` examples would also catch normal Werkzeug `HTTPException` responses such as 404 and 405 and incorrectly convert them to 500 responses. Added `HTTPException` imports and early returns to preserve normal HTTP errors.
- The Nginx example placed `log_format` inside a `server` block, but the official Nginx directive context for `log_format` is `http` only. Moved the `log_format` declaration to the surrounding `http` block.
- The upstream error-page snippet nested an exact `location = /50x.html` inside `location /`. Reworked it as a sibling location and kept `proxy_intercept_errors on` with the `error_page` directive, matching Nginx's documented processing model.

## Review Notes
- The Gunicorn logging flags and configuration names (`accesslog`, `errorlog`, `loglevel`, and `capture_output`) match the official Gunicorn settings.
- `--capture-output` redirects worker stdout/stderr to the configured Gunicorn error log; application exceptions are still best handled through Flask logging or an error tracker.
- `StandardOutput=journal`, `StandardError=journal`, `SyslogIdentifier`, and the `journalctl -u` commands are valid systemd/journald usage.
- The Sentry Flask example is technically valid. Current Sentry documentation also notes that the Flask integration can be enabled automatically when Flask is installed, but the explicit `FlaskIntegration()` style remains acceptable.
