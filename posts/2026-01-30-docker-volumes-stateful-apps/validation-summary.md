# Validation Summary: How to Create Docker Volumes for Stateful Apps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker volumes
- Docker bind mounts
- Docker CLI
- Docker Compose
- PostgreSQL Docker Official Image
- Redis Docker Official Image
- NFS-backed Docker volumes
- Volume backup and restore workflows

## Sources Consulted
- Docker Docs: Volumes - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: Bind mounts - https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs: Compose file volumes - https://docs.docker.com/reference/compose-file/volumes/
- Docker Docs: Compose startup order and `depends_on` conditions - https://docs.docker.com/compose/how-tos/startup-order/
- Docker Docs: Compose `version` top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Hub: PostgreSQL Official Image - https://hub.docker.com/_/postgres
- Docker Hub: Redis Official Image - https://hub.docker.com/_/redis
- Redis Docs: Run Redis Open Source on Docker - https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/docker/
- Local Docker CLI help for `docker volume create`, `docker run`, `docker volume ls`, `docker system df`, `docker compose up`, and `docker compose down`

## Issues Found
- The introduction said stopping a container makes its filesystem vanish. Stopping preserves the container writable layer; removal destroys it. Changed the wording to say removal makes the writable layer vanish.
- The bind mount vs. volume comparison overstated permissions, backup/restore, and security differences. Docker does not automatically make ownership mismatches disappear, and Docker does not provide a dedicated built-in volume backup command. Updated the table to reflect Docker-managed mount points, helper-container backup workflows, and reduced host path exposure.
- The production recommendation claimed volumes win on every dimension and cannot be browsed with a host file manager. This is too absolute, and Docker Desktop can browse volumes. Reworded it as a safer default for many stateful production apps unless a direct host path is required.
- The Compose example used `version: "3.8"`. The current Compose Specification keeps `version` only for backward compatibility and Docker warns that it is obsolete. Removed the `version` key from the snippet.
- The Compose volume listing command filtered by `name=myapp`, but the example did not set a Compose project name of `myapp`, so the filter could return no relevant volumes. Replaced it with a Compose label filter.
- The volume driver table treated `nfs` as a standalone Docker volume driver, while the example uses the `local` driver with NFS options. Updated the table entry to `local with NFS options`.
- The volume driver table named `rexray/ebs` as a current EBS driver example. Replaced it with a generic EBS volume plugin entry because the exact driver name depends on the installed plugin and REX-Ray is not a good current default recommendation.
- The PostgreSQL UID check used `docker run --rm postgres:16 id`, which reports root for that helper command. Verified locally and changed it to `docker run --rm postgres:16 id postgres`, which reports the image's `postgres` user UID/GID.
- The permissions guidance said managed volumes handle ownership automatically. Updated it to explain that named volumes can still need ownership fixes when reused with data created by a different UID/GID.

## Review Notes
- The remaining Docker CLI commands and Compose fields were checked against current Docker CLI help and official Compose documentation.
- The PostgreSQL examples are valid for `postgres:16`. Newer major versions can have different image defaults, so future updates should re-check the official image documentation if the tag is changed.
