# Validation Summary: How to Deploy PostgreSQL Operator (CloudNativePG) with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Helm
- CloudNativePG
- PostgreSQL
- Barman Cloud CNPG-I plugin
- External Secrets Operator
- Prometheus PodMonitor

## Sources Consulted
- CloudNativePG Helm chart repository and chart index: https://github.com/cloudnative-pg/charts and https://cloudnative-pg.github.io/charts/index.yaml
- CloudNativePG supported releases and Kubernetes compatibility: https://cloudnative-pg.io/docs/1.29/supported_releases/
- CloudNativePG API reference for Cluster, ScheduledBackup, and ObjectStore-related fields: https://cloudnative-pg.io/docs/1.29/cloudnative-pg.v1/
- CloudNativePG backup documentation: https://cloudnative-pg.io/docs/1.29/backup/
- CloudNativePG PostgreSQL upgrade documentation: https://cloudnative-pg.io/docs/1.29/postgres_upgrades/
- CloudNativePG rolling update documentation: https://cloudnative-pg.io/docs/1.29/rolling_update/
- CloudNativePG monitoring documentation: https://cloudnative-pg.io/docs/1.29/monitoring/
- Barman Cloud CNPG-I plugin documentation: https://cloudnative-pg.io/plugin-barman-cloud/docs/
- Argo CD custom health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- External Secrets Operator CRD schema: https://github.com/external-secrets/external-secrets
- PostgreSQL release notes: https://www.postgresql.org/docs/release/

## Issues Found
- The CloudNativePG operator Helm chart version was outdated. Updated `targetRevision` from `0.22.0` to `0.28.2`, which maps to CloudNativePG 1.29.1 in the official chart index.
- The Kubernetes prerequisite said `1.25+`, but the current CloudNativePG chart requires Kubernetes `>=1.29.0-0`. Updated the prerequisite wording to tie the requirement to the selected chart.
- The PostgreSQL image used an old minor version (`16.2`). Updated the example to `16.14`, the current PostgreSQL 16 minor release as of the review date.
- The backup example used CloudNativePG's in-tree `barmanObjectStore` configuration, which is deprecated in current CloudNativePG releases. Replaced it with the Barman Cloud plugin configuration and added the required `ObjectStore` resource.
- The scheduled backup used a five-field Unix cron expression. CloudNativePG `ScheduledBackup.spec.schedule` requires a six-field cron expression including seconds, so the schedule was changed to `0 0 2 * * *`.
- The scheduled backup did not specify the plugin backup method. Added `method: plugin` and `pluginConfiguration` for the Barman Cloud plugin.
- The upgrade section implied major-version image changes were zero-downtime rolling upgrades. CloudNativePG only treats minor version updates this way; major upgrades are offline in-place upgrades. Updated the section to use a minor-version example and added a major-upgrade downtime caveat.
- The monitoring section implied cluster PodMonitors were enabled by the operator chart. Updated it to clarify that the chart can create the operator PodMonitor and current CloudNativePG guidance is to create PostgreSQL cluster PodMonitors explicitly using the `cnpg.io/cluster` label.

## Review Notes
The Argo CD Application, ExternalSecret, custom health check, Cluster, ObjectStore, and ScheduledBackup snippets were reviewed for YAML syntax and parsed successfully. The Argo CD health check remains a simple phase-based example; production users may want to expand it to inspect CloudNativePG status conditions for more granular reporting.
