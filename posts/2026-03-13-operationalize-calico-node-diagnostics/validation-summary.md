# Validation Summary: How to Operationalize Calico Node Diagnostics

## Status
validated

## Post Type
Operational guide / Runbook

## Technologies Covered
- Calico (Tigera operator-managed installation)
- Felix (Calico dataplane component)
- Kubernetes (kubectl, CronJob, DaemonSet)
- calicoctl
- Mermaid (flowchart diagram)

## Sources Consulted
- Calico/Tigera node configuration and health endpoints: https://docs.tigera.io/calico/latest/reference/component-resources/node/configuration
- Tigera Operator install reference (uses `calico-system` namespace and `TigeraStatus` CR): https://docs.tigera.io/calico/latest/operations/operator-migration
- Kubernetes DaemonSet status fields (`numberUnavailable`): https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#daemonsetstatus-v1-apps
- Kubernetes CronJob API (`batch/v1` GA since 1.21): https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- kubectl field-selector and jsonpath docs: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- calicoctl node diags reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/diags

## Issues Found
No technical issues found.

## Review Notes
- The runbook correctly distinguishes operator install (`calico-system` namespace, `TigeraStatus`) from manifest install (`kube-system`). The post is consistent with the operator-based model throughout.
- `calico-node -felix-live` matches the documented health check flag used by Calico's own liveness probes. Equivalent flags (`-felix-ready`, `-bird-live`, `-bird-ready`) exist if the runbook is later extended to cover BGP/readiness checks.
- The CronJob uses `numberUnavailable` from the DaemonSet status, which is correct. Note that this field reflects nodes currently selected by the DaemonSet that are unavailable; if the user later wants to alert on pods that are running but Felix-unhealthy (vs. pods missing entirely), they would need a separate check that execs into pods or polls a metrics endpoint.
- The `bitnami/kubectl:latest` image tag works but pinning to a specific version is recommended in production to avoid surprise breakages on image updates.
- The `grep -i "error\|panic"` pattern works in extended grep contexts; with default basic grep, `\|` is the literal pipe alternation operator in some environments. In practice GNU grep on standard Linux distros (and BusyBox grep in most kubectl images) treats this correctly, so the command works as written.
