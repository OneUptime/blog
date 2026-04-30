# Validation Summary: How to Configure Flask to Listen on All IPv4 Interfaces

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flask
- Python
- IPv4 networking
- Gunicorn
- uWSGI
- Uvicorn
- Docker
- Docker Compose
- WSGI / ASGI deployment

## Sources Consulted
- Flask development server docs: https://flask.palletsprojects.com/en/stable/server/
- Flask API docs for `app.run`: https://flask.palletsprojects.com/en/latest/api/
- Flask ASGI deployment docs: https://flask.palletsprojects.com/en/stable/deploying/asgi/
- Flask proxy handling docs: https://flask.palletsprojects.com/en/stable/deploying/proxy_fix/
- Gunicorn settings docs: https://docs.gunicorn.org/en/stable/settings.html
- uWSGI HTTP docs: https://uwsgi-docs.readthedocs.io/en/latest/HTTP.html
- uWSGI configuration docs: https://uwsgi-docs.readthedocs.io/en/latest/Configuration.html
- Uvicorn settings docs: https://www.uvicorn.org/settings/
- Docker port publishing docs: https://docs.docker.com/engine/network/port-publishing/

## Issues Found
- The description referred to `uvicorn` as if it were a WSGI server for Flask. I changed the wording to make it clear that `uvicorn` is used with Flask only when an ASGI adapter is added.
- The `uvicorn app:app` example was not correct for a normal Flask app because Flask is WSGI, not ASGI. I changed the section to use Flask's documented `asgiref.wsgi.WsgiToAsgi` adapter and updated the command to serve `app:asgi_app`.
- The client IP example directly trusted `X-Forwarded-For`, which is unsafe unless proxy trust is configured explicitly. I replaced it with the documented `ProxyFix` approach and `request.remote_addr`.
- The Docker Compose comment incorrectly said `"5000:5000"` publishes only to localhost by default. I corrected it to note that Docker publishes to all host interfaces by default unless a host IP such as `127.0.0.1` is specified.
- The conclusion implied container port mapping alone controls external exposure. I clarified that host bind addresses and firewall rules also matter.

## Review Notes
- The `uWSGI` example is technically valid as written, but `uWSGI`'s own documentation distinguishes between `http`, `http-socket`, and `socket` modes with different operational tradeoffs.
- The post remains correct that Flask's built-in server must not be used in production.
