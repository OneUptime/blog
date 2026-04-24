# Validation Summary: How to Use the --snapshot-interval Flag in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Server CLI configuration
- Portainer API
- Docker `docker run`
- Docker Compose

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer general settings: https://docs.portainer.io/admin/settings/general
- Portainer CE install with Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer API access: https://docs.portainer.io/api/access
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker Compose file reference, version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post described `--snapshot-interval` as a seconds-based flag with a 60-second default. Current Portainer documentation defines it as a duration string such as `15s`, `5m`, or `1h`, with a default of `5m`. I updated the explanation, defaults, and interval table to match.
- The command examples used invalid `--snapshot-interval` values like `300`, `15`, and `120`. I changed them to valid duration values such as `5m`, `15m`, `15s`, and `2m`.
- The default `docker run` example was too minimal to be a practical Portainer deployment example. I updated it to include the standard Docker socket mount, Portainer data volume, and published HTTPS port.
- The Compose example used the top-level `version` field, which current Docker Compose documentation marks as obsolete. I removed it.
- The manual refresh section incorrectly advised restarting Portainer to force a snapshot refresh. I replaced that guidance with the documented Portainer API snapshot endpoints: `POST /api/endpoints/{id}/snapshot` and `POST /api/endpoints/snapshot`.

## Review Notes
- The post still uses `portainer/portainer-ce:latest`. Portainer's install docs often use channel tags such as `lts` or `sts`; `latest` is not necessarily wrong, but pinning a version or channel would make the examples more predictable over time.
- The freshness discussion is most accurate for snapshot-based dashboard and environment summary data, not necessarily every view in the Portainer UI.
