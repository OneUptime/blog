# Validation Summary: How to Migrate Jobs During Dapr Scheduler Upgrade

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Dapr Scheduler service
- Dapr Jobs API (v1.0-alpha1)
- Helm (Dapr chart upgrades)
- Kubernetes (StatefulSet rollout)
- Bash scripting
- curl

## Sources Consulted
- Dapr Jobs API reference: https://docs.dapr.io/reference/api/jobs_api/
- Dapr Scheduler service overview: https://docs.dapr.io/concepts/dapr-services/scheduler/
- Dapr Kubernetes upgrade guide: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-upgrade/
- Dapr Scheduler persistence guide: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-persisting-scheduler/
- Dapr v1.14 release notes: https://github.com/dapr/dapr/releases/tag/v1.14.0

## Issues Found

1. **Incorrect version claim (1.13 to 1.14):** The post stated migration is "especially important when going from Dapr 1.13 to 1.14." The Jobs API was introduced in Dapr 1.14 — there are no jobs to export from a 1.13 installation. Fixed to clarify the migration applies when upgrading from 1.14 to later versions (e.g., 1.15+).

2. **Overstated etcd format change claim:** The post claimed "the embedded etcd data format or schema may change" as a definitive reason for export/import. This specific scenario is not documented in official Dapr upgrade guides. Softened the language to reflect that it is a precautionary best practice rather than a documented requirement.

3. **`--reuse-values` in Helm upgrade:** The Dapr Kubernetes upgrade documentation does not recommend `--reuse-values`. It can cause problems when new chart versions introduce new required values or change defaults. Changed to `--wait`, which is consistent with the official upgrade guide.

4. **StatefulSet name:** The post used `statefulset/dapr-scheduler`, but the Dapr Helm chart typically deploys the scheduler as `dapr-scheduler-server`. Fixed both occurrences (upgrade and rollback sections).

5. **GET/POST roundtrip limitation:** The export-then-import approach works well for jobs defined with `schedule` and `repeats`, but the GET response returns `dueTime` and `ttl` as resolved absolute RFC3339 timestamps rather than the original relative durations. Added a note warning users to review and adjust these fields before re-importing.

## Review Notes
- The Jobs API endpoint prefix `v1.0-alpha1` is correct as of the latest documentation, but since it is an alpha API, future Dapr versions may promote it to `v1.0` stable, which would require updating the endpoints in this post.
- The post hardcodes job names in the export script rather than dynamically listing them. The Dapr Jobs API does not currently provide a "list all jobs" endpoint, so this is a reasonable workaround, but readers should be aware they need to maintain their own job inventory.
- The official Dapr Kubernetes upgrade procedure requires updating CRDs manually before running `helm upgrade`. The post omits this step. This was not added to avoid scope creep, but readers following this guide should consult the official upgrade docs for the complete procedure.
