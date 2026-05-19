# Validation Summary: How to Configure mod_wsgi for Python Apps with Apache on Ubuntu

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Ubuntu
- Apache HTTP Server
- mod_wsgi
- Python virtual environments
- Django
- Flask
- Apache virtual host configuration
- HTTPS/TLS configuration

## Sources Consulted
- Ubuntu Server documentation: Apache2 modules and `libapache2-mod-wsgi-py3` installation, https://ubuntu.com/server/docs/how-to/web-services/use-apache2-modules/
- mod_wsgi documentation: Configuration Guidelines, WSGIScriptAlias, daemon mode, static files, and Flask/Django integration, https://www.modwsgi.org/en/latest/user-guides/configuration-guidelines.html
- mod_wsgi documentation: WSGIDaemonProcess directive and daemon options, https://www.modwsgi.org/en/latest/configuration-directives/WSGIDaemonProcess.html
- mod_wsgi documentation: application configuration and Apache `SetEnv` behavior, https://www.modwsgi.org/en/latest/user-guides/configuration-guidelines.html#application-configuration
- Apache HTTP Server 2.4 documentation: `mod_env`, `SetEnv`, and `PassEnv`, https://httpd.apache.org/docs/2.4/mod/mod_env.html
- Django documentation: WSGI deployment and `DJANGO_SETTINGS_MODULE`, https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
- Flask documentation: changelog noting removal of `FLASK_ENV`, https://flask.palletsprojects.com/en/stable/changes/
- Local Python help: `python3 -m venv -h`

## Issues Found
- The install command omitted `python3-venv`, which is required on Ubuntu systems that split the `venv` module into a separate package. Added `python3-venv` to the `apt install` command.
- The Python dependency install command installed `gunicorn`, which is not used by a mod_wsgi deployment, and omitted Flask even though the post includes a Flask WSGI example. Replaced it with `django flask`.
- The Flask WSGI example set `FLASK_ENV=production`. Flask deprecated this in 2.2 and removed it in 2.3. Removed the setting and changed the import to the documented `from app import app as application` pattern.
- The environment variable section incorrectly described Apache `SetEnv` and `PassEnv` as setting process environment variables visible through Python's `os.environ`. Reworked the section to set `os.environ` values in `wsgi.py` before application import, and clarified that `SetEnv`/`PassEnv` populate the WSGI request environment.
- The `request-timeout` explanation said it kills requests longer than the configured value. mod_wsgi documents it as a recovery trigger for blocked requests, with behavior depending on related timeout settings. Updated the wording accordingly.

## Review Notes
- The post is generally accurate for Apache 2.4 and current mod_wsgi daemon-mode deployment patterns.
- The guide intentionally uses Apache to serve media files. This is valid for local filesystem deployments, but production sites may still prefer external object storage or a dedicated media-serving setup depending on security and scale requirements.
- Apache was not installed in the review workspace, so Apache-specific CLI behavior could not be validated locally; those parts were checked against Ubuntu, Apache, and mod_wsgi documentation instead.
