# Validation Summary: Configuring Installation Validation for Cilium on K3s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Cilium CLI
- Cilium Helm chart
- Kubernetes Jobs
- Kubernetes CronJobs
- Helm hooks
- K3s
- kubectl

## Sources Consulted
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium v1.19.3 Helm chart values: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/install/kubernetes/cilium/values.yaml
- Cilium CLI `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI `connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium CLI source for connectivity test names and filtering: https://github.com/cilium/cilium-cli
- Cilium stable release information: https://github.com/cilium/cilium
- Helm chart hooks documentation: https://helm.sh/docs/topics/charts_hooks/
- Kubernetes TTL-after-finished Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- kubectl `port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The Helm values snippet used `agent.healthPort`, but the Cilium chart uses the top-level `healthPort` value for the agent health API. Removed the invalid nested value.
- The operator configuration comment said it enabled an operator health endpoint, but `operator.replicas` only controls replica count. Updated the comment to describe what the value actually does.
- The Helm install example pinned Cilium `1.16.5`, which is outdated for a 2026 guide. Updated it to Cilium `1.19.3`, the current stable release found in official Cilium release information.
- The Cilium connectivity test command used `dns-resolution`, which is not a Cilium CLI test name. Replaced it with `dns-only` and used repeated `--test` flags for clear filtering.
- The Helm hook Job ran `kubectl` without a service account, so it would normally use the default service account and fail RBAC checks. Added `serviceAccountName: cilium-validation`.
- The health-port verification command executed `curl` inside the Cilium DaemonSet, but the Cilium image should not be assumed to contain `curl`. Changed the example to use `kubectl port-forward` and run `curl` locally.

## Review Notes
- The validation Job uses `cluster-admin` for simplicity. This works technically, but a future hardening pass should replace it with the minimum RBAC needed by `cilium status`, `cilium connectivity test`, and the `kubectl` health checks.
- The Cilium CLI image uses the `latest` tag. This is valid, but production automation should pin a tested CLI version to keep validation behavior reproducible.
