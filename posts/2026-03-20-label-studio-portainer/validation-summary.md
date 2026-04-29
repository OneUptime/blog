# Validation Summary: How to Deploy Label Studio for Data Annotation via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Label Studio Community Edition
- Docker / Compose stacks
- PostgreSQL
- Bash

## Sources Consulted
- Label Studio repository README — https://github.com/HumanSignal/label-studio
- Label Studio official Compose example — https://github.com/HumanSignal/label-studio/blob/develop/docker-compose.yml
- Label Studio Docker image definition — https://github.com/HumanSignal/label-studio/blob/develop/Dockerfile
- Label Studio container entrypoint and init scripts — https://github.com/HumanSignal/label-studio/blob/develop/deploy/docker-entrypoint.sh
- Label Studio start command documentation — https://labelstud.io/guide/start.html
- Label Studio signup and account bootstrap documentation — https://labelstud.io/guide/signup.html
- Label Studio database setup documentation — https://labelstud.io/guide/storedata
- Label Studio persistent storage documentation — https://labelstud.io/guide/persistent_storage
- Label Studio installation troubleshooting and non-root volume permissions — https://labelstud.io/guide/install_troubleshoot
- Portainer stack deployment and environment variable documentation — https://docs.portainer.io/sts/user/docker/stacks/add
- PostgreSQL official Docker image documentation — https://hub.docker.com/_/postgres
- Label Studio releases page — https://github.com/HumanSignal/label-studio/releases

## Issues Found
1. **Placeholder and non-working application image**: The post used `appropriate-image:latest` and generic container names. Replaced this with a working Label Studio stack based on the official `heartexlabs/label-studio` image, plus a separate nginx proxy container and PostgreSQL service.

2. **Incorrect database configuration model**: The post used `DATABASE_URL` and unrelated placeholder credentials. Label Studio’s documented Docker/Compose setup uses `DJANGO_DB=default` with `POSTGRE_NAME`, `POSTGRE_USER`, `POSTGRE_PASSWORD`, `POSTGRE_PORT`, and `POSTGRE_HOST`. Updated the compose example accordingly.

3. **Incorrect Redis dependency**: The original stack added a Redis service even though the current open-source Label Studio settings explicitly mark Redis as disabled in the base deployment path. Removed Redis from the stack.

4. **Incorrect manual initialization commands**: The post instructed readers to run generic Django `manage.py migrate` and `createsuperuser` commands. The official Label Studio container entrypoint already waits for PostgreSQL, runs migrations, and performs initialization on startup. Replaced this with the supported first-user flows: browser sign-up or `label-studio init`.

5. **Incorrect health check path**: The post used `curl http://localhost:8080/health`. The current application routes expose `health/`, and the handler is implemented at `/health/`. Corrected the verification command to `curl -fsS http://localhost:8080/health/`.

6. **Incorrect storage guidance and permissions**: The post described storage for “models and data” and suggested `chown 1000:1000`. Label Studio’s container runs as a non-root user with UID 1001 and relies on writable mounted storage. Updated the section to cover uploaded files and annotation data, and corrected the host-path permission guidance.

7. **Incorrect authentication environment variables**: The post used `AUTH_ENABLED`, `ADMIN_USERNAME`, and `ADMIN_EMAIL`, which are not the documented Label Studio bootstrap variables. Replaced them with `LABEL_STUDIO_DISABLE_SIGNUP_WITHOUT_LINK`, `LABEL_STUDIO_USERNAME`, `LABEL_STUDIO_PASSWORD`, and optional `LABEL_STUDIO_USER_TOKEN`.

8. **Incorrect backup commands and identifiers**: The original backup script targeted generic container names and mismatched database names/users. Updated the script to back up the actual PostgreSQL database and the shared Label Studio data volume created by the revised stack.

9. **Overstated monitoring guidance**: The post claimed Prometheus monitoring could be set up for detailed metrics as part of this deployment. In the current open-source codebase, the `/metrics/` route is an empty handler, so the article was revised to stick to Portainer stats and logs rather than promise a ready-made Prometheus metrics feed.

## Review Notes
- The post now pins Label Studio to `1.23.0`, which GitHub listed as the latest release on March 13, 2026 at review time. Future updates should bump the image tag intentionally rather than use an unreviewed floating deployment.
- The article remains focused on a Portainer Docker stack deployment. It does not cover reverse-proxy-specific settings such as `LABEL_STUDIO_HOST` or CSRF origin configuration because they are not required for the localhost-style flow described here.
