# Validation Summary: How to Self-Host a Photo Gallery (Immich/PhotoPrism) with Portainer

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Portainer
- Docker Compose
- Immich
- PhotoPrism
- MariaDB
- PostgreSQL
- Valkey / Redis-compatible caching
- Traefik labels

## Sources Consulted
- Immich Docker Compose install docs: https://docs.immich.app/install/docker-compose/
- Immich environment variables: https://docs.immich.app/install/environment-variables/
- Immich external libraries: https://docs.immich.app/features/libraries/
- Immich CLI: https://docs.immich.app/features/command-line-interface/
- Immich mobile app / backup flow: https://docs.immich.app/features/mobile-app
- Immich backup and restore: https://docs.immich.app/administration/backup-and-restore/
- Immich machine learning hardware acceleration: https://docs.immich.app/features/ml-hardware-acceleration/
- PhotoPrism Docker Compose setup: https://docs.photoprism.app/getting-started/docker-compose/
- PhotoPrism Portainer setup: https://docs.photoprism.app/getting-started/portainer/
- PhotoPrism config options: https://docs.photoprism.app/getting-started/config-options/
- PhotoPrism MariaDB guidance: https://docs.photoprism.app/getting-started/troubleshooting/mariadb/
- PhotoPrism HTTPS guidance: https://docs.photoprism.app/getting-started/using-https/
- PhotoPrism import/originals behavior: https://docs.photoprism.app/user-guide/library/import/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/templates/deploy-stack

## Issues Found
- The Immich compose example was based on older internals. I updated the published port from `2283:3001` to `2283:2283`, changed the media bind mount to `/data`, switched the Traefik upstream port to `2283`, and replaced the deprecated `tensorchord/pgvecto-rs` database image with the current official Immich PostgreSQL image that includes VectorChord support.
- The Immich cache service used Redis while current official Immich compose examples use Valkey. I updated the example image accordingly while keeping the Redis-compatible connection settings intact.
- The Immich external library instructions pointed to a host path that would not exist inside the container and used outdated navigation text. I changed this to an optional read-only bind mount plus the correct container-visible path under `Administration > External Libraries`.
- The Immich mobile sync and CLI examples were outdated. I changed the mobile backup step to the current "Enable Backup" flow, added `/api` to the CLI login URL, and replaced the invalid `--album` usage with the current `--album-name` flag.
- The PhotoPrism example used an older MariaDB image tag and omitted current MariaDB upgrade settings. I updated it to `mariadb:11` and added `MARIADB_AUTO_UPGRADE` plus `MARIADB_INITDB_SKIP_TZINFO`.
- The PhotoPrism TensorFlow setting used the invalid environment variable `PHOTOPRISM_TENSORFLOW_OFF`. I replaced it with `PHOTOPRISM_INIT=tensorflow`, which matches current official Docker image guidance for enabling TensorFlow-backed AI features.
- The PhotoPrism import folder was configured inside the originals folder (`/mnt/photos/import`), which the official docs explicitly warn will cause an import loop. I changed it to a separate host path.
- The performance tuning snippet used the invalid variable `PHOTOPRISM_THUMB_JPEG_QUALITY`. I replaced it with the documented `PHOTOPRISM_JPEG_QUALITY`.
- The Immich backup command was updated to current documented `pg_dump` flags so the SQL dump includes cleanup directives during restore.

## Review Notes
- Immich’s official Docker Compose files and image tags change frequently. Re-check the current release compose file before publishing future updates to this post.
- The Immich Traefik labels assume an existing reverse proxy setup. If readers are exposing Immich only on port `2283`, the labels are optional.
- PhotoPrism should be placed behind an HTTPS reverse proxy if exposed outside a trusted local network. The current snippet intentionally uses direct HTTP on port `2342` to match the compose example shown.
