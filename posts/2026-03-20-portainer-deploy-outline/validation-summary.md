# Validation Summary: How to Deploy Outline Wiki via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Outline
- Portainer
- Docker Compose / Portainer Stacks
- PostgreSQL
- Redis
- MinIO
- OpenID Connect (OIDC)

## Sources Consulted
- Outline Docker hosting docs: https://docs.getoutline.com/s/hosting/doc/docker-7pfeLP5a8t
- Outline authentication docs: https://docs.getoutline.com/s/hosting/doc/authentication-7ViKRmRY5o
- Outline OIDC docs: https://docs.getoutline.com/s/hosting/doc/oidc-8CPBm6uC0I
- Outline file storage docs: https://docs.getoutline.com/s/125de1cc-9ff6-424b-8415-0d58c809a40f
- Outline requirements docs: https://docs.getoutline.com/s/hosting/doc/requirements-ULdYnwi4wG
- Outline terminology docs: https://docs.getoutline.com/s/guide/doc/terminology-fKoXA2YGzH
- Outline environment sample: https://raw.githubusercontent.com/outline/outline/main/.env.sample
- MinIO server image docs: https://hub.docker.com/r/minio/minio/
- MinIO client image docs: https://hub.docker.com/r/minio/mc/
- MinIO client settings docs (`MC_HOST_<ALIAS>`): https://docs.min.io/community/minio-object-store/reference/minio-mc/minio-client-settings.html
- MinIO `mc cors set` docs: https://docs.min.io/enterprise/aistor-object-store/reference/cli/mc-cors/mc-cors-set/

## Issues Found
- The post stated that self-hosted Outline requires an OIDC provider. Outline's official docs say self-hosted installs require a compatible authentication provider and support multiple provider types. I corrected the wording so the guide accurately states that this specific setup uses OIDC.
- The stack used `AWS_S3_UPLOAD_BUCKET_URL: http://minio:9000`, which is only resolvable inside the Docker network. Outline's file storage configuration expects a browser-reachable bucket URL, so I changed it to a public HTTPS endpoint example (`https://s3.example.com`) and clarified the prerequisite for public HTTPS endpoints.
- The manual OIDC configuration omitted `OIDC_LOGOUT_URI`. Outline's OIDC docs recommend setting either `OIDC_LOGOUT_URI` or `OIDC_DISABLE_REDIRECT` so logout works correctly. I added `OIDC_LOGOUT_URI` to the example.
- The MinIO bucket setup commands used `docker exec minio mc ...`, but the official `minio/minio` server image is separate from the `minio/mc` client image. I replaced the commands with `minio/mc`-based commands and added the missing CORS policy required for browser uploads from Outline.
- The post described Collections as "similar to Workspaces". Outline's terminology docs define Workspace as the top-level container and Collections as organizers within a workspace. I corrected that wording.

## Review Notes
- The compose example still uses `latest` image tags. Outline's Docker docs note that pinning image versions is recommended so upgrades stay under operator control.
- The stack assumes you already have reverse proxy/TLS handling in front of Outline and the MinIO API endpoint. The stack itself does not configure that layer.
