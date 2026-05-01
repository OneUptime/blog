# Validation Summary: How to Deploy Outline Wiki via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Outline
- Portainer
- Docker Compose
- PostgreSQL
- Redis
- MinIO / S3-compatible object storage
- OAuth / OIDC authentication
- OneUptime

## Sources Consulted
- Outline hosting docs, Docker: https://docs.getoutline.com/s/hosting/doc/docker-7pfeLP5a8t
- Outline hosting docs, Requirements: https://docs.getoutline.com/s/hosting/doc/requirements-ULdYnwi4wG
- Outline hosting docs, Slack authentication: https://docs.getoutline.com/s/hosting/doc/slack-sgMujR8J9J
- Outline hosting docs, File storage: https://docs.getoutline.com/s/125de1cc-9ff6-424b-8415-0d58c809a40f
- Outline official environment sample: https://github.com/outline/outline/blob/main/.env.sample
- Outline server startup and migration behavior: https://github.com/outline/outline/blob/main/server/utils/startup.ts
- Outline health check implementation: https://github.com/outline/outline/blob/main/server/index.ts
- Portainer docs, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Docker docs, Compose networking: https://docs.docker.com/reference/compose-file/networks/

## Issues Found
- The post stated that Outline requires S3-compatible storage for uploads. Current Outline supports both local file storage and S3-compatible storage, so this was corrected to describe S3 storage as part of this specific setup rather than a universal requirement.
- The compose example omitted `FILE_STORAGE: s3`. Without this, Outline would continue using local storage and ignore the MinIO S3 configuration. I added `FILE_STORAGE: s3`.
- The compose example used `AWS_S3_UPLOAD_BUCKET_URL: http://minio:9000` while also stating that MinIO is deployed separately. Docker service-name resolution only works on a shared network, so I changed the example to a reachable MinIO host URL.
- The prerequisites omitted the need for a public HTTPS URL even though Outline's `URL` must be publicly reachable and Slack authentication requires an HTTPS callback URL. I corrected the prerequisite line accordingly.
- The migration section said migrations must be run manually after first deploy. Current Outline runs pending migrations automatically on container startup unless `--no-migrate` is passed, so I corrected the instructions and kept the manual command only for that case.
- The monitoring section said `/_health` returns a JSON object. Current Outline returns plain `OK` with HTTP 200 on success and HTTP 500 when database or Redis checks fail. I corrected the health-check description and alert guidance.

## Review Notes
- The guide still uses `outlinewiki/outline:latest`. This is valid, but Outline's official Docker documentation recommends pinning image versions so upgrades stay under operator control.
