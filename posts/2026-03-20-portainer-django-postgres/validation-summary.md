# Validation Summary: How to Deploy a Django + PostgreSQL Stack via Portainer - Postgres

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Django
- PostgreSQL
- Docker Compose
- Docker
- Nginx
- Celery
- Redis
- Gunicorn
- Python

## Sources Consulted
- Django downloads and supported versions: https://www.djangoproject.com/download/
- Django installation FAQ: https://docs.djangoproject.com/en/5.2/faq/install/
- Django static files deployment guide: https://docs.djangoproject.com/en/6.0/howto/static-files/deployment/
- Django `django-admin` / `manage.py` reference: https://docs.djangoproject.com/en/6.0/ref/django-admin/
- `django-environ` quick start: https://django-environ.readthedocs.io/en/latest/quickstart.html
- `django-environ` supported types: https://django-environ.readthedocs.io/en/stable/types.html
- Docker Compose startup ordering: https://docs.docker.com/compose/how-tos/startup-order/
- Docker volume behavior: https://docs.docker.com/engine/storage/volumes/
- Docker `docker exec` reference: https://docs.docker.com/reference/cli/docker/container/exec/
- Portainer stack deployment docs: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer relative path support docs: https://docs.portainer.io/sts/advanced/relative-paths
- Portainer SSL docs: https://docs.portainer.io/advanced/ssl
- WhiteNoise Django guide: https://whitenoise.readthedocs.io/en/latest/django.html

## Issues Found
- The post pinned `Django==5.0`, which is unsupported as of April 24, 2026. I updated the example to `Django==5.2.13` and bumped `django-environ` to `0.13.0` so the sample stack uses a supported Django release line.
- Static files were being collected at image build time even though the deployment mounts a persistent `static_files` volume. I moved `collectstatic` into the web container startup command so static assets are refreshed in the shared runtime volume.
- The Django settings snippet did not read `SECRET_KEY`, `DEBUG`, or `ALLOWED_HOSTS` from the environment, despite the Compose file depending on them. I added those settings and also added explicit `STATIC_URL` and `MEDIA_URL` values for the Nginx routes shown in the post.
- The WhiteNoise snippet replaced the `MIDDLEWARE` list with an incomplete example and was unnecessary for the Nginx-based static-file setup shown in the article. I removed the WhiteNoise-specific example and dependency from the sample configuration.
- `manage.py dbshell` requires the PostgreSQL `psql` client to be available on `PATH`, but the Dockerfile did not install it. I added `postgresql-client` to the image and changed the sample `docker exec` command to use `-it` for an interactive shell.
- The Nginx service mounted `./nginx/django.conf`, but the post instructs readers to paste the stack into Portainer's Web Editor. Portainer's relative-path bind mount support is documented for Business Edition Git-based deployments, not a plain web-editor paste, so I changed the example to an explicit host path and clarified where the file should be created.
- The Celery worker did not receive `SECRET_KEY` and only used short-form `depends_on`. I added `SECRET_KEY` and health/startup conditions so the worker can import Django settings and waits for its dependencies more reliably.
- The conclusion implied Portainer's own HTTPS endpoint could be used to secure the deployed Django application. I corrected this to recommend an SSL-terminating reverse proxy for the app itself.

## Review Notes
- The Compose file still includes `version: "3.8"`. Modern Compose treats the top-level `version` field as obsolete, but it still works, so I left it unchanged to avoid unnecessary churn.
- The example continues to publish the Django app directly on port `8000` in addition to exposing Nginx on port `80`. This works, but production deployments often remove the direct `8000` publication so all traffic passes through Nginx.
- The sample continues to use `psycopg2-binary`. Django currently recommends psycopg 3 for PostgreSQL, but `psycopg2` remains supported in the Django version used here.
