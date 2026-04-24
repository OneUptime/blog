# Validation Summary: How to Deploy Rocket.Chat via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Rocket.Chat
- MongoDB
- Rocket.Chat Omnichannel / Livechat
- Jitsi

## Sources Consulted
- Rocket.Chat deployment with Docker and Docker Compose: https://docs.rocket.chat/docs/deploy-with-docker-docker-compose
- Rocket.Chat deployment environment variables: https://docs.rocket.chat/docs/deployment-environment-variables
- Rocket.Chat settings via environment variables: https://docs.rocket.chat/docs/manage-settings-using-environmental-variables
- Rocket.Chat livechat widget installation: https://docs.rocket.chat/docs/livechat-widget-installation
- Rocket.Chat Omnichannel overview: https://docs.rocket.chat/docs/omnichannel
- Rocket.Chat Omnichannel apps: https://docs.rocket.chat/docs/omnichannel-apps
- Rocket.Chat Jitsi app: https://docs.rocket.chat/docs/jitsi-app
- Rocket.Chat conference call admin guide: https://docs.rocket.chat/docs/conference-call-admin-guide
- Rocket.Chat supported MongoDB versions: https://docs.rocket.chat/docs/supported-mongodb-versions
- Rocket.Chat system requirements: https://docs.rocket.chat/docs/system-requirements
- Rocket.Chat latest release metadata: https://releases.rocket.chat/latest/info
- Official Rocket.Chat compose repository: https://github.com/RocketChat/rocketchat-compose
- MongoDB `mongod` reference: https://www.mongodb.com/docs/current/reference/program/mongod/
- MongoDB IP binding documentation: https://www.mongodb.com/docs/manual/core/security-mongodb-configuration/

## Issues Found
- The post used `rocketchat/rocket.chat:latest`, which does not match Rocket.Chat's current official image guidance and left the deployment unpinned. I updated it to `registry.rocket.chat/rocketchat/rocket.chat:8.3.2` so the example aligns with current docs and avoids surprise upgrades.
- The post used `mongo:6.0`, but current Rocket.Chat 8.2+ documentation requires MongoDB `8.0`. I updated the stack to `mongodb/mongodb-community-server:8.0-ubi8` to match the current support matrix and release metadata.
- The MongoDB service omitted `--bind_ip_all`. MongoDB binds to localhost by default, which would prevent the replica-init container and Rocket.Chat container from connecting over the Docker network. I added `--bind_ip_all`.
- The post set `MONGO_OPLOG_URL`, which Rocket.Chat documents as deprecated and no longer required for current versions. I removed it and kept the supported `MONGO_URL` replica-set connection string.
- The post manually set `OVERWRITE_SETTING_Show_Setup_Wizard: completed` while also instructing the reader to use the setup wizard. Rocket.Chat's docs explicitly say not to alter this setting because it can lock the workspace. I removed the override.
- The replica-set init container used a fixed `sleep 10` and a single `rs.initiate()` attempt, which is brittle and can fail on slower starts or on re-deploys. I replaced it with a wait-until-ping loop and an idempotent initialization command.
- The initial access URL conflicted with the configured `ROOT_URL`. I corrected the setup step so users access the URL configured in `ROOT_URL`.
- The Omnichannel navigation path was outdated, and the channel list included email as a default example even though Rocket.Chat documents email inboxes as deprecated. I updated the path and replaced the examples with current Omnichannel channels/apps.
- The livechat embed snippet used the workspace root URL instead of the `/livechat` base URL that Rocket.Chat documents, and it omitted the required allowed-domain prerequisite. I corrected the snippet and added the required domain-allowlist step.
- The Jitsi section used old environment-variable configuration. Current Rocket.Chat docs require installing the Jitsi Marketplace app and selecting it under Conference Call settings. I replaced the outdated YAML with the current setup steps.

## Review Notes
- Rocket.Chat compatibility is version-specific. The post now pins Rocket.Chat `8.3.2` with MongoDB `8.0`, which matches the current support matrix and release metadata as of April 24, 2026.
- `docker compose` was not available in this review environment, so I validated the updated stack block with a YAML parser instead of `docker compose config`.
