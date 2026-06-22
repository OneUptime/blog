# Validation Summary: How to Create PostgreSQL Clusters with CloudNativePG

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CloudNativePG
- Kubernetes
- PostgreSQL
- kubectl
- Barman Cloud Plugin
- Prometheus monitoring configuration
- YAML custom resources

## Sources Consulted
- CloudNativePG API Reference: https://cloudnative-pg.io/docs/1.28/cloudnative-pg.v1/
- CloudNativePG Bootstrap documentation: https://cloudnative-pg.io/docs/1.27/bootstrap/
- CloudNativePG Backup documentation: https://cloudnative-pg.io/docs/1.28/backup/
- CloudNativePG Recovery documentation: https://cloudnative-pg.github.io/docs/1.28/recovery/
- CloudNativePG Service Management documentation: https://cloudnative-pg.io/documentation/1.24/service_management/
- CloudNativePG Image Catalog documentation: https://cloudnative-pg.io/docs/1.29/image_catalog/
- CloudNativePG Database Role Management documentation: https://cloudnative-pg.io/documentation/1.20/declarative_role_management/
- Barman Cloud CNPG-I Plugin migration documentation: https://cloudnative-pg.io/plugin-barman-cloud/docs/next/migration/
- CloudNativePG PostgreSQL container image documentation: https://github.com/cloudnative-pg/postgres-containers

## Issues Found
- The `kubectl create secret generic` examples created Opaque secrets, while CloudNativePG documents application and managed-role password secrets as `kubernetes.io/basic-auth` secrets. Added `--type=kubernetes.io/basic-auth` to the relevant commands.
- The restore and production backup examples used CloudNativePG's native `barmanObjectStore` integration, which is deprecated starting with CloudNativePG 1.26. Replaced those examples with the Barman Cloud Plugin pattern using `ObjectStore`, `spec.plugins`, `method: plugin`, and `pluginConfiguration`.
- The `ScheduledBackup` example used a five-field cron expression. CloudNativePG ScheduledBackup requires a six-field expression with seconds, so the schedule was changed to `"0 0 0 * * *"`.
- The managed role example described a service account as having no password while also configuring `passwordSecret`. Updated the comment to describe it as a monitoring user.
- The multiple-database examples granted privileges to roles that would not necessarily exist during bootstrap because CloudNativePG managed roles are reconciled after bootstrapping. Updated the grants to use the bootstrap owner role shown in the snippet.
- The monitoring examples used `enablePodMonitor: true`, which the current API reference marks deprecated. Commented the field and noted that a PodMonitor should be created manually for scraping in newer CloudNativePG versions.

## Review Notes
- The article remains a valid CloudNativePG cluster creation guide after the corrections.
- CloudNativePG now also exposes separate `Database` and newer role-related APIs in recent releases, which could be covered in a future expansion, but the existing bootstrap SQL approach is still technically valid for initial database creation.
