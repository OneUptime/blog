# Validation Summary: How to Self-Host a Chat Server with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Rocket.Chat
- MongoDB
- Matrix Synapse
- PostgreSQL
- Element Web
- Traefik

## Sources Consulted
- Rocket.Chat: Deploy with Docker and Docker Compose — https://docs.rocket.chat/docs/deploy-with-docker-docker-compose
- Rocket.Chat: Deployment Environment Variables — https://docs.rocket.chat/docs/deployment-environment-variables
- Rocket.Chat: Create Admin Account Using Environment Variable — https://docs.rocket.chat/docs/admin-account-creation
- Rocket.Chat: Support Prerequisites — https://docs.rocket.chat/docs/support-prerequisites
- Rocket.Chat: System Requirements — https://docs.rocket.chat/docs/system-requirements
- Synapse: Installation — https://element-hq.github.io/synapse/latest/setup/installation.html
- Synapse Docker README — https://github.com/element-hq/synapse/blob/develop/docker/README.md
- Synapse: Using Postgres — https://element-hq.github.io/synapse/latest/postgres.html
- Synapse: Configuration Manual — https://element-hq.github.io/synapse/latest/usage/configuration/config_documentation.html
- Element Web: Installing Element Web — https://web-docs.element.dev/Element%20Web/install.html
- Element Web: Configuration — https://web-docs.element.dev/Element%20Web/config.html
- Matrix Specification: Client-Server API / `/.well-known/matrix/client` — https://spec.matrix.org/latest/client-server-api/index.html
- MongoDB Database Tools: `mongodump` — https://www.mongodb.com/docs/database-tools/mongodump/

## Issues Found
- The Rocket.Chat example paired `registry.rocket.chat/rocketchat/rocket.chat:latest` with `mongo:6.0`. Current Rocket.Chat 8.x requires newer MongoDB versions, and `MONGO_OPLOG_URL` was removed in Rocket.Chat 8.0. I pinned Rocket.Chat to `8.2`, updated MongoDB to `8.0`, and removed the deprecated `MONGO_OPLOG_URL`.
- The Rocket.Chat admin bootstrap variables were incomplete. Current Rocket.Chat docs require `INITIAL_USER=yes` and `ADMIN_NAME` when provisioning the first admin through environment variables. I added both.
- The Synapse compose file declared a PostgreSQL service, but the Synapse container would still use SQLite by default. I added the required `database:` configuration snippet for PostgreSQL in `homeserver.yaml`.
- The Synapse instructions generated configuration into `/opt/synapse`, but the compose file mounted a named volume at `/data`, so the generated config would not be used. I changed the Synapse service to bind-mount `/opt/synapse:/data` and clarified the deployment order.
- The Synapse admin-user command depended on `registration_shared_secret`, but the post never configured it. I added the required `registration_shared_secret` setting to the `homeserver.yaml` snippet.
- The Element service mounted a named Docker volume at `/app/config.json`, which is a file path and would not correctly provide the intended JSON config. I changed it to a bind mount from `/opt/element/config.json`.
- The Element config snippet was not valid JSON because it included a `//` comment line, and it used a non-spec `server_name` field inside `m.homeserver`. I removed the comment, removed the invalid field, and kept the config aligned with the Matrix client discovery format.
- The Element config used an outdated bug-report endpoint and an incomplete Scalar integration-manager example. I updated the bug report endpoint to `https://rageshakes.element.io/api/submit` and added `integrations_widgets_urls` to match the current Element docs.
- The push-notification section used `SYNAPSE_PUSHER_ENABLED`, which is not a supported Synapse environment variable. I replaced it with a valid `push:` configuration example and clarified that push calculation is enabled by default.
- The prerequisite memory guidance understated Rocket.Chat’s current documented minimum supported sizing. I updated it to `At least 4GB RAM if you plan to run Rocket.Chat`.

## Review Notes
- The Matrix example now supports a correct client-facing Synapse + Element setup, but full public federation still needs reverse-proxy handling for Matrix federation semantics such as `:8448` or equivalent `.well-known` delegation, depending on the final domain design.
- The Synapse Docker image does not include a TURN server. Reliable Matrix VoIP/video calling requires separate TURN configuration.
- Rocket.Chat’s own deployment docs recommend a separately managed MongoDB replica set for production-grade deployments. The compose example remains acceptable for a small self-hosted guide, but it should not be read as Rocket.Chat’s preferred production architecture.
