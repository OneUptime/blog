# Validation Summary: How to Configure S3-Compatible Storage for Portainer Workloads

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- MinIO
- MinIO Client (`mc`)
- S3-compatible object storage
- WordPress
- PostgreSQL

## Sources Consulted
- Portainer documentation: Back up Portainer and restore from S3, https://docs.portainer.io/admin/settings/general
- Portainer documentation: What Portainer backups include, https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Docker Docs: Compose networking and existing external networks, https://docs.docker.com/compose/how-tos/networking/
- Docker Docs: Compose startup order and `depends_on` with `service_healthy`, https://docs.docker.com/compose/how-tos/startup-order/
- Docker Docs: Compose services reference, https://docs.docker.com/reference/compose-file/services/
- MinIO docs: healthcheck probes, https://docs.min.io/community/minio-object-store/operations/monitoring/healthcheck-probe.html
- MinIO docs: `mc ready`, https://docs.min.io/community/minio-object-store/reference/minio-mc/mc-ready.html
- MinIO docs: `mc alias set`, https://docs.min.io/community/minio-object-store/reference/minio-mc/mc-alias-set.html
- MinIO docs: `mc mb`, https://docs.min.io/community/minio-object-store/reference/minio-mc/mc-mb.html
- MinIO docs: `mc pipe`, https://docs.min.io/community/minio-object-store/reference/minio-mc/mc-pipe.html
- MinIO docs: `mc stat`, https://docs.min.io/community/minio-object-store/reference/minio-mc/mc-stat.html
- MinIO docs: `mc ilm rule add`, https://docs.min.io/enterprise/aistor-object-store/reference/cli/mc-ilm-rule/mc-ilm-rule-add/
- MinIO docs: client host credentials via `MC_HOST_<ALIAS>`, https://docs.min.io/enterprise/aistor-object-store/reference/cli/aistor-client-settings/
- MinIO docs: root credentials and defaults, https://docs.min.io/enterprise/aistor-object-store/reference/aistor-server/settings/root-credentials/
- MinIO docs: core concepts and minimum distributed deployment shape, https://docs.min.io/enterprise/aistor-object-store/operations/core-concepts/
- MinIO archived official Docker Compose guide, https://github.com/minio/minio/blob/master/docs/orchestration/docker-compose/README.md
- Docker Official Image docs for WordPress (`WORDPRESS_CONFIG_EXTRA`), https://hub.docker.com/_/wordpress/
- Docker Official WordPress image `wp-config-docker.php`, https://github.com/docker-library/wordpress/blob/master/wp-config-docker.php
- WP Offload Media docs: settings constants, https://deliciousbrains.com/wp-offload-media/doc/settings-constants/
- WP Offload Media docs: MinIO and other S3-compatible providers, https://deliciousbrains.com/s3-compatible-storage-provider-minio/
- WP Offload Media docs: Wasabi quick start guide showing current filter-based custom S3 provider setup, https://deliciousbrains.com/wp-offload-media/doc/wasabi-cloud-storage-quick-start-guide/

## Issues Found
- The MinIO stack used a `curl`-based healthcheck inside the MinIO container and relied on `depends_on.condition: service_healthy`. Recent MinIO container images do not provide that workflow reliably, so I removed the container healthcheck and switched bucket initialization to the documented `mc ready` flow with a temporary `MC_HOST_<ALIAS>` alias.
- The MinIO and application stacks did not actually share a network. I added an explicit `storage-network` name in the MinIO stack and kept the application stack on that external network so the `minio` hostname is reachable across stacks.
- The lifecycle example used the older `mc ilm add --expiry-days` form. I updated it to the current `mc ilm rule add --expire-days` command.
- The Portainer backup section implied a broader backup scope than Portainer actually provides. I corrected the section heading and script comments to reflect that the archive covers Portainer configuration and stack files in `/data`, not other applications' volume data.
- The Portainer backup script used a fixed temporary filename that did not match the generated backup name. I aligned the local archive path with the timestamped target filename and parameterized the container and volume names.
- The WordPress example configured WP Offload Media with an unsupported `endpoint` key inside `AS3CF_SETTINGS`. I removed that setting and documented the correct filter-based approach required for MinIO-compatible endpoints.
- The WordPress example omitted the required database user configuration for the official WordPress image. I added `WORDPRESS_DB_USER` and `WORDPRESS_DB_NAME`.
- The PostgreSQL backup example used `alpine/postgres:latest` and piped to `mc` even though that image would not provide the MinIO client. I replaced it with a working `docker exec ... pg_dump | gzip | mc pipe ...` pattern.
- The MinIO high-availability section was only a partial service fragment. I expanded it into a complete four-node distributed example and clarified that production access normally sits behind a load balancer or reverse proxy.
- The description and conclusion suggested generic "data persistence" through S3 without enough distinction from Docker volumes. I tightened that wording so the post stays within object-storage-backed application files and backups.

## Review Notes
- Portainer's built-in backup to S3 is documented as a Portainer Business Edition feature. The post now uses a manual archive script for the `/data` volume instead of implying the built-in UI flow is universally available.
- The manual Portainer backup example is appropriate for Portainer state, but workloads using named volumes or bind mounts still need separate backup procedures.
