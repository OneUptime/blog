# Validation Summary: How to Run Django Migrations with Docker Compose

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Compose
- Django
- Python
- PostgreSQL
- Bash
- Make
- GitHub Actions

## Sources Consulted
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose startup order documentation: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose profiles documentation: https://docs.docker.com/compose/how-tos/profiles/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose CLI reference for `run`, `exec`, and `up`: https://docs.docker.com/reference/cli/docker/compose/
- Django `django-admin` and `manage.py` reference: https://docs.djangoproject.com/en/6.0/ref/django-admin/
- Local Docker Compose CLI help output from Docker Compose v5.1.3.

## Issues Found
- The Compose examples used the obsolete top-level `version: '3.8'` field. Docker's current Compose reference says this field is only kept for backward compatibility and now emits an obsolete warning. Removed it from the Compose snippets.
- The profile-based init example assigned `profiles: default` to the `web` service, which prevents it from starting with plain `docker compose up` unless the `default` profile is explicitly enabled. Removed the profile from `web` so it starts by default while `db-init` remains profile-gated.
- The multiple-replica example used `deploy.replicas` for local Compose scaling and omitted the `postgres` service details used by its health dependency. Replaced the web replica setting with the current Compose `scale` attribute and added the missing PostgreSQL service and database environment values.
- The file-lock entrypoint used `/tmp`, which is isolated per container and would not coordinate multiple replicas. Changed it to use a configurable shared lock directory, added `set -e`, and noted that the directory must be mounted from a shared volume.
- The `nc` database wait loop expanded `DB_HOST` and `DB_PORT` unquoted. Quoted both variables to avoid shell parsing issues.

## Review Notes
- The Django commands (`migrate --noinput`, `showmigrations --plan`, `sqlmigrate`, `makemigrations --merge`, `collectstatic --noinput`) match Django's current management command reference.
- `depends_on` with `service_healthy` and `service_completed_successfully` is valid in the current Compose specification.
- The article's production advice to prefer a distributed lock remains important; shared file locks are only appropriate when all replicas truly share the same filesystem path.
