# Validation Summary: How to Upgrade Elasticsearch Without Downtime

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Elasticsearch
- Elasticsearch rolling upgrades
- Elasticsearch snapshot and restore
- Elastic Cloud on Kubernetes (ECK)
- Kubernetes manifests and kubectl
- Linux package management with apt and yum
- Bash scripting

## Sources Consulted
- Elastic Docs: Upgrade Elasticsearch - https://www.elastic.co/docs/deploy-manage/upgrade/deployment-or-cluster/elasticsearch
- Elastic Docs: Upgrade your deployment or cluster - https://www.elastic.co/docs/deploy-manage/upgrade/deployment-or-cluster
- Elastic Docs: Upgrade your deployment on Elastic Cloud on Kubernetes (ECK) - https://www.elastic.co/docs/deploy-manage/upgrade/deployment-or-cluster/upgrade-on-eck
- Elastic Docs: Upgrade Elastic Cloud on Kubernetes - https://www.elastic.co/docs/deploy-manage/upgrade/orchestrator/upgrade-cloud-on-k8s
- Elastic API Docs: Get deprecation information - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-migration-deprecations
- Elastic Docs: Shared file system repository - https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore/shared-file-system-repository

## Issues Found
- The upgrade path list omitted the current 9.x path. Added the 8.19 -> 9.x path and clarified that the latest 8.x version is required first.
- The filesystem snapshot repository example did not mention the required shared mount and `path.repo` configuration. Added a short note before registering the repository.
- The post recommended synced flush for pre-8.0 upgrades. Current Elastic rolling-upgrade guidance uses the regular flush API, so the section now uses `POST /_flush`.
- The node upgrade order was too broad for current data-tiered clusters. Updated the list to specify frozen, cold, warm, hot, then other data nodes before non-master/non-data nodes and master-eligible nodes.
- The automation script used Elasticsearch node names directly as SSH targets without warning that they must resolve to hosts. Added a clarification comment.
- The ECK manifest used an older example version. Updated the example `spec.version` to the current documented target version, 9.4.2.
- The rollback procedure incorrectly described downgrading an upgraded Elasticsearch cluster in place. Replaced it with the supported approach: stop the failed upgrade path if needed, rebuild an empty cluster on the previous version, and restore a pre-upgrade snapshot.
- The best-practice wording said "Plan for Downgrade." Changed it to "Plan for Rollback" to match Elasticsearch's no-downgrade support policy.

## Review Notes
The post is technically relevant and implementation-focused. The automated script remains an illustrative starting point rather than production-ready orchestration; real environments should map node names to SSH hosts, handle data tiers explicitly, pause ML upgrade mode when applicable, upgrade plugins, and check command failures.
