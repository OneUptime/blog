# Validation Summary: How to Install Immich for Self-Hosted Photo Management on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Docker Engine
- Docker Compose
- Immich
- PostgreSQL
- VectorChord
- Valkey/Redis-compatible cache
- Nginx
- Certbot/Let's Encrypt
- Bash/cron

## Sources Consulted
- Immich Docker Compose installation documentation: https://docs.immich.app/install/docker-compose
- Immich requirements documentation: https://docs.immich.app/install/requirements
- Immich environment variables documentation: https://docs.immich.app/install/environment-variables
- Immich backup and restore documentation: https://docs.immich.app/administration/backup-and-restore/
- Immich external library documentation: https://docs.immich.app/guides/external-library
- Immich storage template documentation: https://docs.immich.app/administration/storage-template
- Immich system settings documentation: https://docs.immich.app/administration/system-settings
- Immich machine learning hardware acceleration documentation: https://docs.immich.app/features/ml-hardware-acceleration
- Immich searching documentation: https://docs.immich.app/features/searching
- Immich duplicates utility documentation: https://docs.immich.app/features/duplicates-utility
- Immich current release docker-compose.yml: https://github.com/immich-app/immich/releases/latest/download/docker-compose.yml
- Immich current release example.env: https://github.com/immich-app/immich/releases/latest/download/example.env
- Immich current release hwaccel.ml.yml: https://github.com/immich-app/immich/releases/latest/download/hwaccel.ml.yml
- Docker Engine Ubuntu installation documentation: https://docs.docker.com/engine/install/ubuntu/
- Docker Compose installation documentation: https://docs.docker.com/compose/install/

## Issues Found
- The Docker installation snippet used Ubuntu's `docker.io` package. Immich's current documentation requires the `docker compose` plugin and warns that distro Docker packages can cause Compose/version issues, so the post now uses Docker's official apt repository and Docker Engine packages.
- The prerequisites listed 4GB RAM as sufficient. Immich's current requirements list 6GB minimum and 8GB recommended, so the RAM requirement was updated.
- The `/opt/immich` setup created a root-owned directory and then downloaded files as the normal user. Added a `chown` step so the following `wget` commands work.
- The database service description referenced `pgvecto.rs`. The current release compose file uses Immich's PostgreSQL image with VectorChord, so the description was updated.
- The storage sizing guidance claimed roughly 2-3x original library size. Immich's current requirements state thumbnails and transcoded video increase storage by about 10-20% on average, so the guidance was corrected while still advising extra headroom.
- The storage usage commands omitted `UPLOAD_LOCATION/upload`, which is one of Immich's critical filesystem locations. Added a check for `/var/lib/immich/library/upload/`.
- The storage cleanup notes referenced orphaned-file detection under Server Settings. Current Immich documentation describes trash retention under Trash Settings, so that UI path was corrected.
- The machine learning feature list included "Smart albums" as an ML feature. Current Immich documentation lists ML-backed smart search, facial recognition, and duplicate detection, so the item was changed to duplicate detection.
- The troubleshooting section checked `/var/lib/immich/upload/`, which did not match the configured `UPLOAD_LOCATION`. Updated it to `/var/lib/immich/library/upload/`.

## Review Notes
The post is accurate for the current Immich v2 Docker Compose deployment path as of 2026-05-19. Immich remains fast-moving, so readers should continue checking release notes before upgrades.
