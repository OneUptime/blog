# Validation Summary: How to Deploy WikiJS via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Portainer
- Docker Compose / Compose stacks
- Wiki.js
- PostgreSQL
- Git storage sync
- Wiki.js authentication modules

## Sources Consulted
- Wiki.js Docker installation guide — https://docs.requarks.io/s/en/install/docker
- Wiki.js system requirements — https://docs.requarks.io/s/en/install/requirements
- Wiki.js Portainer installation guide (community-contributed reference) — https://docs.requarks.io/s/en/install/portainer
- Wiki.js storage overview — https://docs.requarks.io/s/en/storage
- Wiki.js Git storage module — https://docs.requarks.io/s/en/storage/git
- Wiki.js authentication modules — https://docs.requarks.io/s/en/auth
- Wiki.js editors overview — https://docs.requarks.io/s/editors
- Wiki.js pages guide — https://docs.requarks.io/s/en/guide/pages
- Wiki.js folder structure guide — https://docs.requarks.io/s/en/guide/structure
- Portainer stack deployment docs — https://docs.portainer.io/user/docker/stacks/add
- Docker Compose services reference (`depends_on`, `healthcheck`) — https://docs.docker.com/reference/compose-file/services/

## Issues Found
- The description and introduction described Wiki.js as supporting multiple "storage backends" including Git and cloud storage. Current Wiki.js docs state content is stored in the database, with storage modules used for backup or synchronization to external targets. I corrected the wording to reflect that model.
- The Git storage section did not match the current Wiki.js Git module setup flow. Current docs use a dedicated repository, SSH-based authentication, `Bi-directional` sync, and require clicking `Apply Changes` to save the module configuration. I updated the instructions to match the documented flow.
- The page management section listed `/home` as a normal main page path. Current Wiki.js docs reserve `home` for the root homepage and disallow it as a regular content path. I changed the example to `/` for the root homepage.
- The editors section listed `Tabular` as a supported editor. Current Wiki.js editor docs list AsciiDoc, Code, Markdown, and Visual Editor. I removed the unsupported `Tabular` entry.

## Review Notes
- The compose stack itself is valid against current Wiki.js Docker docs and current Docker Compose docs: `ghcr.io/requarks/wiki:2`, the PostgreSQL environment variables, `healthcheck`, and long-form `depends_on` with `service_healthy` are all current.
- Wiki.js's own Portainer install page is marked community-contributed and uses an older example (`version: '2'`, `requarks/wiki:2`, PostgreSQL 15). This post's use of the current GHCR image is consistent with the primary Docker installation docs.
- The post uses PostgreSQL 16, while the Wiki.js Docker compose example shows PostgreSQL 15. Wiki.js requirements state PostgreSQL 9.5+ is supported and recommend using the latest version when possible, so PostgreSQL 16 is acceptable.
- Docker is not installed in this workspace, so I validated the compose syntax and behavior against the official Docker and Portainer documentation rather than running `docker compose config` locally.
