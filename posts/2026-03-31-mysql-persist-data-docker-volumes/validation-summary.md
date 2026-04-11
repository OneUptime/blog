# Validation Summary: How to Persist MySQL Data in Docker Volumes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker (named volumes, bind mounts, Docker CLI)
- Docker Compose v2
- MySQL 8.0 (official Docker image)

## Sources Consulted
- Docker documentation on volumes: https://docs.docker.com/engine/storage/volumes/
- Docker Compose `command` specification: https://docs.docker.com/reference/compose-file/services/#command
- Official MySQL Docker image on Docker Hub: https://hub.docker.com/_/mysql
- docker-library/mysql Dockerfile (UID/GID 999 verification): https://github.com/docker-library/mysql
- MySQL 8.0 Server System Variables (slow_query_log, slow_query_log_file): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL docker-entrypoint.sh behavior for `--` prefixed arguments

## Issues Found
No technical issues found.

## Review Notes
- The `MYSQL_ROOT_PASSWORD` environment variable is only used during first-time initialization of the data directory. If the volume already contains an initialized database, this variable is ignored on subsequent container starts. The post's examples use the same password consistently so they work correctly, but readers should be aware of this behavior.
- The separate log volume example (`mysql_logs:/var/log/mysql`) may require the `/var/log/mysql` directory to have correct ownership (UID 999) for the mysql process to write logs. Docker creates the mount point as root-owned if it doesn't already exist in the image. In practice, users may need to add an init step or adjust permissions. This is a practical deployment concern rather than a technical error in the post.
- All Docker Compose files correctly omit the deprecated `version:` key, consistent with Docker Compose v2+ conventions.
