# Validation Summary: How to Run Nextcloud in a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman pods
- Nextcloud official container image
- MariaDB official container image
- Redis
- SQLite
- Nextcloud occ command-line tool

## Sources Consulted
- Nextcloud Docker image README: https://github.com/nextcloud/docker/blob/master/README.md
- Nextcloud Server Administration Manual: https://docs.nextcloud.com/server/stable/admin_manual/
- Podman pod create documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman run documentation: https://docs.podman.io/en/stable/markdown/podman-run.1.html
- MariaDB Docker official image environment variables: https://mariadb.com/docs/server/server-management/automated-mariadb-deployment-and-administration/docker-and-mariadb/mariadb-server-docker-official-image-environment-variables
- Redis official Docker image: https://hub.docker.com/_/redis

## Issues Found
- The opening claim said the setup gives you a rootless container. Podman can run rootless when invoked by a non-root user, but the commands themselves do not force rootless execution. Changed the wording to say the setup can run in a rootless container.
- The automatic configuration example reused the earlier `nextcloud-pod`, `nc-data` volume, and database. That would conflict with the already running `nc-app` container on port 80 inside the same pod and would not be a clean first-run automatic install. Updated the example to use its own pod, MariaDB container, and named volumes.
- The Redis example reused the earlier MariaDB and Nextcloud volumes, which could conflict with the previous running MariaDB container and attach the example to an existing installation. Updated it to create and use dedicated database and application volumes.
- The cleanup commands did not include resources added by the corrected automatic configuration and Redis examples. Updated the pod and volume removal commands accordingly.

## Review Notes
- The examples use `latest` for Nextcloud and `mariadb:11`, which are valid tags, but production deployments should usually pin specific versions or use a planned upgrade process.
- The examples use fixed `sleep` delays for database startup. This is acceptable for a short tutorial, but a future improvement would be to replace them with readiness checks.
