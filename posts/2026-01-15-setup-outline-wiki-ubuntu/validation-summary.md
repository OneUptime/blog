# Validation Summary: How to Set Up Outline Wiki on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Docker Engine
- Docker Compose
- Outline Wiki
- PostgreSQL
- Redis
- MinIO / S3-compatible storage
- Nginx
- Certbot / Let's Encrypt
- Slack OAuth
- Google OAuth
- OpenID Connect
- SMTP

## Sources Consulted
- Outline Docker hosting documentation: https://docs.getoutline.com/s/hosting/doc/docker-7pfeLP5a8t
- Outline environment sample: https://github.com/outline/outline/blob/main/.env.sample
- Outline file storage documentation: https://docs.getoutline.com/s/hosting/doc/file-storage-N4M0T6Ypu7
- Outline Slack authentication documentation: https://docs.getoutline.com/s/hosting/doc/slack-sgMujR8J9J
- Outline Google authentication documentation: https://docs.getoutline.com/s/hosting/doc/google-hOuvtCmTqQ
- Outline OIDC documentation: https://docs.getoutline.com/s/hosting/doc/oidc-8CPBm6uC0I
- Outline SMTP documentation: https://docs.getoutline.com/s/hosting/doc/smtp-cqCJyZGMIB
- Outline Dockerfile healthcheck implementation: https://raw.githubusercontent.com/outline/outline/main/Dockerfile
- Docker Engine Ubuntu installation documentation: https://docs.docker.com/engine/install/ubuntu/
- Docker Compose startup order documentation: https://docs.docker.com/compose/how-tos/startup-order/
- MinIO Docker Compose example: https://github.com/minio/minio/blob/master/docs/orchestration/docker-compose/docker-compose.yaml
- MinIO Client alias documentation: https://docs.min.io/aistor/reference/cli/mc-alias/mc-alias-set/

## Issues Found
- Google authentication setup was incomplete for Outline's current guidance. Updated the section to specify Google Workspace, enabling the Google+ API, and configuring an internal OAuth consent screen.
- The PostgreSQL container password could diverge from `DATABASE_URL` because `POSTGRES_PASSWORD` was not included in the `.env` example. Added `POSTGRES_PASSWORD=your_postgres_password`.
- The MinIO/S3 setup omitted `FILE_STORAGE=s3`, so current Outline defaults could use local file storage instead of MinIO. Added `FILE_STORAGE=s3`.
- `ENABLE_UPDATES` was incorrectly described as controlling user signups and was defined twice. Removed the incorrect signup entry and clarified that `ENABLE_UPDATES=false` disables update checks and anonymous statistics.
- The Outline health check used `curl`, but the official Outline image installs and uses `wget` for health checks. Replaced the compose health check with a `wget` command matching the image.
- The MinIO health check used `curl`; MinIO's official Docker Compose example uses `mc ready local`. Updated the health check accordingly.
- The bucket initialization service hard-coded MinIO credentials, which would fail after users replaced the `.env` secrets. Updated the `mc alias set` command to use the configured credentials through Docker Compose interpolation.
- The bucket initialization service made a `/public` prefix anonymously downloadable while the environment configured private S3 ACLs. Removed that contradictory command.
- The Nginx MinIO proxy used a `/s3/` prefix that did not match the configured path-style bucket URL. Updated the proxy location to `/outline-data/` so requests for the configured bucket path are forwarded to MinIO.
- The customization section mislabeled `DEFAULT_LANGUAGE` as a custom team name setting. Corrected the comment to describe it as the default interface language.

## Review Notes
- The post uses `latest` image tags for Outline, MinIO, and related services. The official Outline Docker documentation recommends pinning image versions in production so upgrades remain controlled.
- The Nginx bucket proxy path is tied to `AWS_S3_UPLOAD_BUCKET_NAME=outline-data`; users who change the bucket name must update the matching Nginx location.
