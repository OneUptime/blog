# Validation Summary: How to Pin Image Versions for Reproducible Deployments in Portainer

## Status
not-technically-relevant

## Post Type
Guide / deployment tutorial

## Technologies Covered
- Portainer stacks
- Docker and Docker Compose
- Docker image tags and digests
- Nginx
- PostgreSQL
- Redis
- Uptime Kuma

## Sources Consulted
- Docker Docs, `docker image pull`: https://docs.docker.com/reference/cli/docker/image/pull/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, Define services in Docker Compose: https://docs.docker.com/reference/compose-file/services/
- Docker Docs, `docker container exec`: https://docs.docker.com/reference/cli/docker/container/exec/
- Docker Docs, Define and manage volumes in Docker Compose: https://docs.docker.com/reference/compose-file/volumes/
- Portainer Docs, Add a new stack: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer Docs, Inspect or edit a stack: https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer Docs, How Relative Path Support works in Portainer: https://docs.portainer.io/sts/advanced/relative-paths
- PostgreSQL Docs, `pg_isready`: https://www.postgresql.org/docs/current/app-pg-isready.html
- PostgreSQL Docs, `pg_dump`: https://www.postgresql.org/docs/current/app-pgdump.html

## Issues Found
- The post is not salvageable by targeted technical edits. It should be removed rather than patched in place.
- The title and description claim the article is about pinning image versions for reproducible deployments, but the body uses `app-image:latest` and `louislam/uptime-kuma:latest` and never demonstrates digest pinning or even a concrete fixed application tag. Docker's official docs explicitly distinguish mutable tags from digest pinning for fixed-image deployments.
- The Portainer workflow is inaccurate. The post tells readers to create the stack in Portainer's Web editor, then later relies on relative bind mounts such as `./nginx.conf` and `./certs`. Portainer documents relative path volumes as a Business Edition feature that must be enabled when deploying the stack from Git; it is not a generic Web editor behavior.
- Several commands are unverifiable placeholders rather than technically grounded instructions. The main service is an unspecified `app-image`, but the article later assumes that image contains a Django-style `./manage.py`, `curl`, and other utilities. Docker's `docker exec` docs note that the command must be executable and runs in the container's default working directory, so these commands cannot be treated as generally correct.
- The troubleshooting command `docker exec app curl -I http://postgres:5432` is technically wrong. PostgreSQL does not expose an HTTP endpoint on port 5432; PostgreSQL documents `pg_isready` as the readiness and connection-status tool.
- The Compose snippets contain additional correctness issues. The top-level `version: "3.8"` field is obsolete in current Compose, and the `uptime-kuma` example mounts `uptime-data:/app/data` without declaring `uptime-data` in the top-level `volumes` section as required for named volumes.
- The conclusion contains a broken generated sentence ("Deploying How to Pin Image Versions for Reproducible Deployments in Portainer via Portainer..."), which reinforces that the article is a generic placeholder rather than a coherent Portainer image-versioning guide.
- No edits were made to `README.md`. Making the post publishable would require a full rewrite centered on explicit tags or digests, Portainer's actual stack deployment and update behavior, and realistic application-specific instructions.

## Review Notes
- Some isolated fragments are valid, such as `depends_on` with `condition: service_healthy`, the Redis `redis-cli ping` healthcheck, and using `pg_dump` for an ad hoc logical export.
- PostgreSQL's own docs note that `pg_dump` is generally not the right choice for regular backups of production databases, so the "production-ready" framing is too strong even apart from the title mismatch.
- If this topic is rewritten later, it should center on explicit version tags and digest pinning, show a Portainer workflow that matches the deployment method actually described, and avoid app-specific commands unless the application image is defined.
