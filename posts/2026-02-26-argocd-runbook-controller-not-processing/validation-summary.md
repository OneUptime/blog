# Validation Summary: ArgoCD Runbook: Controller Not Processing Applications

## Status
validated

## Post Type
Runbook / Troubleshooting Guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Redis
- Prometheus metrics

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Application Controller command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Argo CD argocd-cmd-params-cm reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD app get command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_get/
- Argo CD app deletion documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl set resources reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/

## Issues Found
- The post used `deployment/argocd-application-controller` and patched a Deployment, but official Argo CD manifests and HA documentation use a StatefulSet for `argocd-application-controller`. Updated controller log, rollout, patch, resource, environment, and pprof commands to target the StatefulSet.
- The post referenced `argocd_app_reconcile_pending`, which is not listed in current official Argo CD application controller metrics. Replaced it with documented metrics, including `argocd_app_reconcile` and `argocd_cluster_cache_age_seconds`.
- The post described controller leader election checks using a Lease. Current Argo CD HA documentation describes controller scaling through StatefulSet replicas and `ARGOCD_CONTROLLER_REPLICAS` for sharding. Replaced the leader-election section and stuck-lease remediation with shard configuration checks and fixes.
- The API throttling fix replaced controller args with default processor values and could discard other args. Changed it to patch documented `argocd-cmd-params-cm` keys for controller status and operation processors, followed by a StatefulSet restart.
- The reconciliation interval example used `timeout.reconciliation: "300"`, but Argo CD documents this value as a duration string such as `60s`, `1m`, or `1h`. Updated it to `5m`.
- The OOMKill memory-limit patch used a JSON Patch `replace` operation that fails if the memory limit path does not already exist. Replaced it with `kubectl set resources`, which is the appropriate kubectl command for setting container resource limits.
- The Redis wording overstated Redis as a hard dependency that may freeze or crash the controller. Adjusted the explanation to say Redis is used for caching and outages can produce Redis errors and stale cache behavior.
- The goroutine dump command omitted the requirement that controller profiling be enabled. Added that caveat before the pprof command.
- The "too many applications" sharding guidance implied sharding distributes application load unconditionally. Clarified that Argo CD controller sharding distributes managed clusters across replicas, so it helps when load spans multiple clusters.

## Review Notes
The runbook is technically relevant and useful after the corrections. Some operational thresholds, such as what latency level is concerning for `argocd_app_reconcile`, remain environment-specific and should be tuned to the installation's baseline.
