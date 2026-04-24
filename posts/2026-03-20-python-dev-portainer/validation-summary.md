# Validation Summary: How to Set Up a Python Development Environment with Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- Python 3.12
- FastAPI
- Uvicorn
- debugpy
- PostgreSQL
- Redis
- Celery
- Flower
- Alembic
- VS Code Dev Containers

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Dockerfile reference: https://docs.docker.com/reference/builder
- Docker `cp` reference: https://docs.docker.com/reference/cli/docker/container/cp/
- Portainer known issue for Compose build directives: https://docs.portainer.io/faqs/known-issues/docker-compose-files-including-build-steps-fail
- Portainer FAQ on building images from Git-deployed stacks: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/can-i-build-an-image-while-deploying-a-stack-application-from-git
- Portainer relative path support: https://docs.portainer.io/sts/advanced/relative-paths
- VS Code Python debugging: https://code.visualstudio.com/docs/python/debugging
- VS Code Dev Containers: https://code.visualstudio.com/docs/devcontainers/create-dev-container
- Dev Container Specification support notes: https://containers.dev/supporting.html
- debugpy README: https://github.com/microsoft/debugpy
- Celery CLI reference: https://docs.celeryq.dev/en/stable/reference/cli.html
- Flower getting started guide: https://flower.readthedocs.io/en/latest/install.html
- Uvicorn settings reference: https://www.uvicorn.org/settings/
- Alembic tutorial: https://alembic.sqlalchemy.org/en/latest/tutorial.html
- Alembic autogenerate documentation: https://alembic.sqlalchemy.org/en/latest/autogenerate.html

## Issues Found
- The Compose stack used `build:` directives as if they were a generic Portainer stack workflow. Current Portainer docs document build-step limitations for Git/remote deployments, so the post was corrected to prebuild the image and reference it with `image: python-dev-env:latest`.
- The post claimed virtual-environment support, but the Dockerfile installed packages into the global interpreter and mounted a named volume at `/app/.venv` that was never created or used. The Dockerfile now creates and uses `/opt/venv`, and the unused `python_venv` volume was removed.
- The app only bind-mounted `./src`, which made later commands like `alembic init migrations` write outside the mounted project tree and lose files on container recreation. The bind mounts were corrected to `.:/app` so source, migrations, and editor metadata live in the same project workspace.
- The Docker image did not install `celery` or `flower`, even though later Compose services invoked both commands. Those packages were added to the development image.
- The Celery worker command used `--autoreload`, which is not present in the current Celery 5.6 worker CLI reference. The unsupported flag was removed.
- The Celery services relied on `REDIS_URL` only, which is not the documented CLI environment variable name for the broker. `CELERY_BROKER_URL` was added so the services align with current Celery CLI behavior.
- The VS Code attach configuration used older-style fields (`"type": "python"` and a nested `connect` object). It was updated to the current documented `debugpy` attach shape with top-level `host` and `port`.
- The Dev Container example used top-level `extensions` and `settings`. Current Dev Container docs place VS Code-specific settings under `customizations.vscode`, so the snippet was updated accordingly.
- The Dev Container example pointed VS Code at `/usr/local/bin/python`, but after fixing the image to use a virtual environment the interpreter path needed to be `/opt/venv/bin/python`. The snippet was updated.
- The coverage-report step started `python -m http.server` inside the container without publishing a host port, so the browser step would not work as written. It was replaced with `docker cp` to copy the generated `htmlcov` report to the host.
- The Compose file used the obsolete top-level `version` field. It was removed to match the current Compose specification.
- The Dockerfile used inline comments on `EXPOSE` lines. Docker's reference treats `#` elsewhere on the line as part of the instruction arguments, so those comments were moved off the `EXPOSE` lines.
- The Redis named volume was declared but not used. The service was updated to mount `redis_data:/data`.
- The post used relative bind mounts in a Portainer stack without explaining the Portainer-specific constraint. A note was added that relative bind mounts in Portainer require Git deployment with relative path support enabled in Portainer Business Edition.

## Review Notes
- `debugpy.wait_for_client()` is valid for development, but it intentionally blocks application startup until the debugger attaches. That behavior is technically correct for a debugging-focused example, but readers should expect the app not to serve requests until VS Code connects.
- The guide assumes the Docker image is built on the same Docker host Portainer manages. If Portainer is attached to a different or remote Docker environment, the prebuilt image must be pushed to a registry or otherwise made available on that host.
