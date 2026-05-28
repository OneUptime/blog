# Validation Summary: How to Configure Maintenance Windows for Memorystore Redis Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Memorystore for Redis
- Google Cloud CLI (`gcloud redis`)
- Cloud Monitoring metrics
- Redis CLI
- Python
- redis-py

## Sources Consulted
- Google Cloud Memorystore for Redis maintenance overview: https://docs.cloud.google.com/memorystore/docs/redis/about-maintenance
- Google Cloud Memorystore for Redis maintenance windows guide: https://docs.cloud.google.com/memorystore/docs/redis/find-and-set-maintenance-windows
- Google Cloud SDK reference for `gcloud redis instances update`: https://docs.cloud.google.com/sdk/gcloud/reference/redis/instances/update
- Google Cloud SDK reference for `gcloud redis instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/redis/instances/create
- Google Cloud Memorystore for Redis supported monitoring metrics: https://docs.cloud.google.com/memorystore/docs/redis/supported-monitoring-metrics
- Google Cloud Memorystore for Redis tier capabilities: https://docs.cloud.google.com/memorystore/docs/redis/redis-tiers
- Redis Python client production usage documentation: https://redis.io/docs/latest/develop/clients/redis-py/produsage/
- redis-py retry helper documentation: https://redis.readthedocs.io/en/stable/retry.html
- redis-py client API source documentation: https://redis.readthedocs.io/en/latest/_modules/redis/client.html

## Issues Found
- The introduction said maintenance updates Redis versions generally. Google documents maintenance as including OSS Redis patch and minor version updates without breaking changes, so the wording was narrowed.
- The Basic Tier maintenance section and checklist stated that data is lost. Google documents Basic Tier as an ephemeral standalone cache that can withstand cold restart/full cache flush, while the maintenance page specifically states Basic Tier is unavailable for about 5 minutes. The wording was changed to plan for cold restarts and full cache flushes.
- The Cloud Monitoring query used `redis.googleapis.com/stats/calls`, but the documented Memorystore Calls metric is `redis.googleapis.com/commands/calls`. The command was corrected.
- The maintenance policy display command used `maintenancePolicy.weeklyMaintenanceWindow[].startTime.hours`, but the Memorystore for Redis documentation shows `maintenancePolicy.maintenanceWindow[].day` and `.hour`. The `--format` expression was corrected.
- The post implied Google maintenance notifications are automatic. Google documents that users must opt in and must have a maintenance window set to receive notifications, so the wording was clarified.
- The redis-py example used `retry_on_timeout=True`, which redis-py marks as deprecated in current client documentation. The example now uses `Retry(ExponentialBackoff(), 3)`.
- The command for removing the preferred maintenance window used `--clear-maintenance-policy`, which applies to newer `gcloud memorystore instances` commands, not `gcloud redis instances update`. The documented flag for Redis instances is `--maintenance-window-any`, so the command was corrected.

## Review Notes
The local environment did not have `gcloud` or the `redis` Python package installed, so CLI behavior and redis-py APIs were verified against official documentation. The Python code block was checked locally with Python AST parsing for syntax.
