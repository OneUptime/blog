# Validation Summary: How to Configure Longhorn Orphaned Replica Cleanup - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn
- Kubernetes
- `kubectl`
- Kubernetes CronJob
- YAML

## Sources Consulted
- Longhorn documentation: Orphaned Data Cleanup — https://longhorn.io/docs/1.11.1/advanced-resources/data-cleanup/orphaned-data-cleanup/
- Longhorn documentation: Settings reference — https://longhorn.io/docs/1.11.1/references/settings/
- Longhorn Knowledge Base: Restoring Data from an Orphaned Replica Directory — https://longhorn.io/kb/restoring-data-from-an-orphaned-replica-directory/
- Longhorn Knowledge Base: Resolving Backing Image Unavailability Issue — https://longhorn.io/kb/troubleshooting-resolving-backing-image-unavailability-issue/
- Longhorn documentation: Install with Kubectl — https://longhorn.io/docs/1.11.1/deploy/install/install-with-kubectl/
- Kubernetes documentation: CronJob — https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes documentation: `kubectl patch` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
1. The post used the wrong Longhorn setting name and value for automatic orphan cleanup. It referenced `orphan-auto-deletion` with a boolean value, but current Longhorn documentation uses `orphan-resource-auto-deletion` with a semicolon-separated list of resource types such as `replica-data`. I corrected the command and explanation.
2. The post used incorrect Longhorn resource names in several commands. It referenced `lhorphan` and `lhnode`, but current Longhorn documentation uses `orphan` / `orphans.longhorn.io` and `nodes.longhorn.io`. I updated the list, inspect, delete, verification, and CronJob commands.
3. Step 5 referenced the unrelated `remove-snapshots-during-filesystem-trim` setting. That setting controls snapshot handling during filesystem trim and does not clean orphaned replica directories. I replaced it with the correct `orphan-resource-auto-deletion-grace-period` setting.
4. The introductory explanation and causes list overstated or mischaracterized how orphaned replica directories are created. I rewrote those lines to match Longhorn’s documented behavior and knowledge-base guidance.
5. The disk-space verification step assumed `/var/lib/longhorn` unconditionally. I kept the default-path example but clarified that readers should substitute their configured Longhorn disk path when it differs.

## Review Notes
- Longhorn uses `replica-data` in the automatic cleanup setting, but orphan resources for replica directories are labeled with `longhorn.io/orphan-type=replica`. That naming difference is expected in current docs, but it is easy to confuse.
- Longhorn’s orphaned data cleanup does not clean stale or error replicas; those are handled separately through `staleReplicaTimeout`.
- The CronJob manifest is valid with `apiVersion: batch/v1`, which is the stable CronJob API in current Kubernetes documentation.
