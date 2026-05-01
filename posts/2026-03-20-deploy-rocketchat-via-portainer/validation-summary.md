# Validation Summary: How to Deploy Rocket.Chat via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rocket.Chat
- Portainer
- Docker Compose
- MongoDB
- OneUptime

## Sources Consulted
- Rocket.Chat: Deploy with Docker and Docker Compose - https://docs.rocket.chat/docs/deploy-with-docker-docker-compose
- Rocket.Chat: Deployment Environment Variables - https://docs.rocket.chat/docs/deployment-environment-variables
- Rocket.Chat: System Requirements - https://docs.rocket.chat/docs/system-requirements
- Rocket.Chat: Configure a Replica Set for MongoDB - https://docs.rocket.chat/docs/configure-a-replica-set-for-mongodb
- Rocket.Chat releases API (`latest/info`) - https://releases.rocket.chat/latest/info
- Rocket.Chat maintained compose repository - https://github.com/RocketChat/rocketchat-compose
- Portainer: Add a new stack - https://docs.portainer.io/user/docker/stacks/add
- Rocket.Chat developer docs: bug reporting guide (`/api/info`) - https://developer.rocket.chat/docs/contribute-through-bug-reporting
- Docker Official Image for MongoDB - https://hub.docker.com/_/mongo

## Issues Found
- The post used `mongo:6.0` together with `rocketchat:latest`. Current Rocket.Chat releases require MongoDB 8.0-compatible deployments, and the official docs recommend pinning a specific Rocket.Chat release instead of using `latest`. I updated the compose file to `mongo:8.0` and pinned Rocket.Chat to `8.4.0`, which was the latest release reported by the official releases API on 2026-05-01.
- The compose example used `MONGO_OPLOG_URL`, which Rocket.Chat deprecated and removed for 8.x. I removed it and aligned the deployment metadata variable with the current maintained compose examples.
- The replica-set init job relied on `sleep 10`, which is brittle and can fail if MongoDB takes longer to start. I replaced it with a readiness loop that waits for MongoDB to respond before attempting `rs.initiate()`.
- The `ROOT_URL` example and deployment steps were inconsistent with the exposed port mapping. The post previously set `ROOT_URL` to an HTTPS domain but told readers to open `http://<host>:3102`. I corrected the example and instructions so `ROOT_URL` matches the actual access URL.
- The monitoring endpoint was incorrect. `/api/v1/info` is a removed endpoint; the documented public info endpoint is `/api/info`. I updated the monitoring guidance accordingly.
- The prerequisite claiming 2GB RAM understated current official sizing. I updated the prerequisite note to reflect Rocket.Chat’s current starter sizing guidance.

## Review Notes
- The post still uses a single-node MongoDB replica set for simplicity. Rocket.Chat’s current system requirements strongly recommend a 3-member replica set for high availability in production.
- The pinned Rocket.Chat version `8.4.0` is accurate as of 2026-05-01. Future updates should re-check `https://releases.rocket.chat/latest/info` and MongoDB compatibility before changing the image tag.
- Rocket.Chat stores uploads in GridFS by default, but current official guidance recommends moving production file uploads to object storage such as S3, GCS, or MinIO.
