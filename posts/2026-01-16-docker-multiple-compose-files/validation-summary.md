# Validation Summary: How to Run Multiple Docker Compose Files Together

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Compose files and override files
- Compose merge rules
- Compose environment variables
- YAML anchors and aliases
- PostgreSQL container health checks

## Sources Consulted
- Docker Docs: Merge Compose files - https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/
- Docker Docs: Compose file merge reference - https://docs.docker.com/reference/compose-file/merge/
- Docker Docs: Extend your Compose file - https://docs.docker.com/compose/how-tos/multiple-compose-files/extends/
- Docker Docs: How Compose works / default Compose file names - https://docs.docker.com/compose/intro/compose-application-model/
- Docker Docs: Version top-level element obsolete - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Docker Compose standalone legacy syntax - https://docs.docker.com/compose/install/standalone/
- Docker Docs: Control startup and shutdown order in Compose - https://docs.docker.com/compose/how-tos/startup-order/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/

## Issues Found
- The post used the legacy `docker-compose` command syntax throughout. Updated commands and Makefile examples to the current standard `docker compose` syntax.
- The post described `docker-compose.yml` and `docker-compose.override.yml` as the default Compose files without noting the current preferred names. Updated the explanation to mention `compose.yaml` / `compose.yml` and `compose.override.yaml`, while preserving the backward-compatible `docker-compose.yml` examples.
- Compose examples used the obsolete top-level `version: '3.8'` field. Removed the field from YAML snippets because current Compose ignores it and warns that it is obsolete.
- The merge behavior section incorrectly said lists are replaced rather than appended. Updated it to state that most sequences append, and that list-like resources such as `ports` and `volumes` use special uniqueness rules.
- The ports merge example incorrectly said the override file replaced the original port mapping. Updated the comment to say the new port mapping is added.
- The test Compose file used `depends_on.condition: service_healthy` for the database service but did not define a database `healthcheck`. Added a PostgreSQL `pg_isready` health check so the example works as described.

## Review Notes
The examples continue to use `docker-compose.yml` file names because Docker Compose still supports them for backward compatibility, although `compose.yaml` is the preferred file name for new projects. The production example uses the Compose Deploy Specification; exact support for deploy attributes can vary by target platform and Compose implementation.
