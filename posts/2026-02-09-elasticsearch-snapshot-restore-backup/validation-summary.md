# Validation Summary: How to set up Elasticsearch snapshot and restore for backup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch snapshot and restore
- Elasticsearch S3 snapshot repositories
- Elasticsearch Snapshot Lifecycle Management (SLM)
- Kubernetes
- AWS S3
- Disaster recovery and backup workflows

## Sources Consulted
- Elasticsearch S3 repository documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/repository-s3.html
- Elasticsearch S3 repository settings reference: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/s3-repository-settings
- Elasticsearch snapshot/restore repository plugins reference: https://www.elastic.co/docs/reference/elasticsearch/plugins/snapshotrestore-repository-plugins
- Elasticsearch create snapshot API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-create
- Elasticsearch create or update SLM policy API: https://www.elastic.co/docs/api/doc/elasticsearch/v8/operation/operation-slm-put-lifecycle
- Elasticsearch restore snapshot API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-restore
- Elasticsearch get snapshot information API: https://www.elastic.co/docs/api/doc/elasticsearch/v9/operation/operation-snapshot-get
- Elasticsearch reload secure settings API: https://www.elastic.co/docs/api/doc/elasticsearch/v8/operation/operation-nodes-reload-secure-settings
- Elasticsearch secure settings documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/secure-settings.html

## Issues Found
- The post instructed readers to install the `repository-s3` plugin. Current Elasticsearch documentation states that S3, GCS, and Azure repository support is bundled by default, so I replaced the install/restart commands with a note that no plugin installation is required for current Elasticsearch versions.
- The S3 credential steps only added keystore entries on one node and did not reload secure settings. Elasticsearch secure settings are per-node and the S3 credential settings are reloadable, so I clarified that credentials must be added on every Elasticsearch node and added the `_nodes/reload_secure_settings` API call.
- The repository registration example used `region` as an S3 repository setting. Current Elasticsearch documentation defines `region` as an S3 client setting, not a repository setting, so I removed it from the repository JSON.
- The SLM policy used a five-field cron expression, `0 2 * * *`. Elasticsearch SLM examples use the cron scheduler format with seconds, minutes, hours, day-of-month, month, and day-of-week fields, so I changed it to `0 0 2 * * ?` for a 2:00 AM daily schedule.

## Review Notes
The remaining examples use valid Elasticsearch snapshot, SLM, and restore API paths and request fields. In production Kubernetes deployments, especially Elastic Cloud on Kubernetes, secure settings are often managed through Kubernetes secrets or the operator rather than by running `elasticsearch-keystore` manually inside pods.
