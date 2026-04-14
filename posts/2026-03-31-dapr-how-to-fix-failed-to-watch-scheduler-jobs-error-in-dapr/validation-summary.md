# Validation Summary: How to Fix 'Failed to Watch Scheduler Jobs' Error in Dapr

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (runtime and CLI)
- Dapr Scheduler service
- Kubernetes (kubectl, NetworkPolicy, pod annotations)
- Docker (self-hosted mode)

## Sources Consulted
- Dapr v1.14.0 release notes: https://github.com/dapr/dapr/releases/tag/v1.14.0
- Dapr Scheduler Helm chart templates (StatefulSet, Service): https://github.com/dapr/dapr/tree/master/charts/dapr/charts/dapr_scheduler/templates
- Dapr CLI `dapr upgrade` reference: https://docs.dapr.io/reference/cli/dapr-upgrade/
- Dapr self-hosted upgrade guide: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-upgrade/
- Dapr arguments and annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr self-hosted with Docker docs: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/

## Issues Found

1. **Incorrect pod label selector for scheduler**: The post used `app=dapr-scheduler` in `kubectl get pods` and `kubectl logs` commands. The correct label per the Helm chart is `app=dapr-scheduler-server`. Fixed both occurrences.

2. **Incorrect scheduler configuration reference**: The post instructed readers to check `kubectl describe configmap -n dapr-system dapr-config` and look for a `schedulerHostAddress` field. This field does not exist in the Dapr Configuration CRD or configmap. The scheduler address is configured via the `--scheduler-host-address` daprd CLI flag or the `dapr.io/scheduler-host-address` Kubernetes pod annotation. Fixed to reference the correct configuration mechanism.

3. **Invalid `dapr upgrade` command for self-hosted mode**: The post suggested running `dapr upgrade` in self-hosted mode, but this command is Kubernetes-only (`dapr upgrade -k`). The documented self-hosted upgrade procedure is to uninstall, install the new CLI version, and reinitialize with `dapr init`. Fixed to show the correct self-hosted upgrade workflow.

4. **Incorrect self-hosted scheduler process check**: The post used `ps aux | grep daprd` to check for the scheduler process. In self-hosted mode, the Dapr Scheduler runs as a separate Docker container (`daprio/scheduler`), not as part of the `daprd` process. Fixed to use `docker ps | grep dapr-scheduler` and updated the surrounding instructions accordingly.

## Review Notes
- The default scheduler port differs between Kubernetes (50006) and self-hosted Docker Compose mode (50007). The post focuses on Kubernetes where 50006 is correct, but the self-hosted section could benefit from noting this difference in a future update.
- The `SchedulerReminders` feature flag behavior changed between Dapr 1.14 (opt-in preview) and 1.15 (enabled by default). The post's suggestion to set it to `false` to disable scheduler reminders is valid but readers on Dapr 1.15+ should be aware that this reverts to legacy state-store-based reminders.
- The NetworkPolicy example is well-structured and uses the correct `kubernetes.io/metadata.name` namespace selector label.
