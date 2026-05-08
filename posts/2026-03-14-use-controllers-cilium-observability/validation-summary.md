# Validation Summary: How to Use Controllers in Cilium Observability

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium in-pod CLI (`cilium-dbg`)
- Prometheus / PromQL
- Kubernetes CronJob
- Bash, Python, and JSONPath

## Sources Consulted
- Cilium command reference for `cilium-dbg status`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status/
- Cilium command cheatsheet for `cilium-dbg status --all-controllers`: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium API reference for controller status JSON fields: https://docs.cilium.io/en/stable/api/
- Cilium monitoring and metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The post used `cilium status controllers`, which is not the documented in-pod Cilium agent command. Updated commands to use `cilium-dbg status --all-controllers`, matching current Cilium command documentation.
- The JSON parsing examples treated command output as a top-level list. Updated them to read the `controllers` field from the status JSON object, matching the Cilium API model.
- The network-event correlation section used overly specific controller names that are not stable across Cilium versions and feature sets. Reworded the examples to describe controller groups and version-dependent names.
- The "recently active" example captured the comparison timestamp after the pod operation, so it could miss the controllers it intended to find. Updated it to capture `START` before creating the pod.
- The Prometheus error-ratio query used an `outcome` label and `controller` grouping that do not match Cilium's documented controller metrics. Updated it to use `cilium_controllers_group_runs_total` with `status="failure"` grouped by `group_name`.
- The Prometheus HTTP API examples embedded PromQL with spaces directly in the URL. Updated them to use `curl -G --data-urlencode`.
- The CronJob example piped JSON into `python3` while using a kubectl-focused image that may not include Python. Updated the health-check extraction to use `cilium-dbg` JSONPath output plus `awk`.
- The CronJob reused the Cilium service account without defining the `pods` and `pods/exec` permissions needed by the check. Added a minimal ServiceAccount, Role, and RoleBinding in `kube-system`.
- The troubleshooting guidance listed exact "critical" controller names that may not exist in a given Cilium deployment. Updated it to focus on endpoint regeneration, policy processing, Kubernetes synchronization, and IPAM/operator activity as seen in the cluster's own output.

## Review Notes
- The threshold values remain practical starting points rather than official Cilium SLOs, so the post now frames them as values to tune for each cluster.
