# Validation Summary: 10 Kubernetes Superpowers Developers Overlook (and How to Use Them)

## Status
validated

## Post Type
Guide / Tutorial (a curated list of advanced Kubernetes features with YAML and CLI examples)

## Technologies Covered
- Kubernetes scheduling: `topologySpreadConstraints`, Pod anti-affinity, `PriorityClass`
- Kubernetes availability/rollout: `PodDisruptionBudget`, Deployment `rollingUpdate` (`maxSurge`/`maxUnavailable`)
- Kubernetes autoscaling: `HorizontalPodAutoscaler` (`autoscaling/v2`) with `behavior` stabilization windows
- Kubernetes resource governance: `LimitRange`, `ResourceQuota`
- Kubernetes batch: `CronJob` (`concurrencyPolicy`, `startingDeadlineSeconds`)
- `kubectl debug` ephemeral containers, `kubectl diff --server-side` / server-side apply
- Policy-as-code: Kyverno `ClusterPolicy`, OPA Gatekeeper
- Observability: OpenTelemetry Collector (`kubeletstats`, `k8sobjects` receivers), kube-state-metrics, OneUptime

## Sources Consulted
- Pod Topology Spread Constraints — https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Pod Disruption Budgets — https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Pod Priority and Preemption — https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- HorizontalPodAutoscaler (v2) and scaling behavior — https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- LimitRange / ResourceQuota — https://kubernetes.io/docs/concepts/policy/limit-range/ , https://kubernetes.io/docs/concepts/policy/resource-quotas/
- CronJob — https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Ephemeral Containers & kubectl debug — https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/ , https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Server-Side Apply — https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kyverno validate rules & policy settings — https://kyverno.io/docs/policy-types/cluster-policy/validate/ , https://kyverno.io/docs/policy-types/cluster-policy/policy-settings/
- OpenTelemetry Collector receivers (kubeletstats, k8sobjects) — https://opentelemetry.io/docs/

## Issues Found
1. **Kyverno `validationFailureAction: enforce` (Section 9)** — Lowercase `enforce`/`audit` values were deprecated in favor of capitalized `Enforce`/`Audit` (introduced in Kyverno v1.9) and the lowercase forms were removed in v1.11.0. Current Kyverno releases reject the lowercase value. Changed `enforce` to `Enforce`.
2. **`kubectl debug deploy/payments ... --target=api` (Section 7)** — The `--target` flag injects an ephemeral container, and ephemeral containers can only be added to a running **Pod**, not a Deployment. Passing a Deployment with `--target` does not perform the in-place namespace-sharing injection the prose describes. Changed the command to target a running Pod (`kubectl debug -it pod/payments-abc123 --image=busybox:1.36 --target=api`) and added a clarifying comment.

## Review Notes
- Sections 1–6, 8, and 10 are technically accurate: the topology spread, PDB + `maxSurge`/`maxUnavailable: 0`, PriorityClass/preemption, HPA `behavior.scaleDown` (`autoscaling/v2`), LimitRange/ResourceQuota, CronJob concurrency, and `kubectl diff --server-side`/`--field-manager` examples all match current API shapes and field names.
- The kube-controller-manager flag `--horizontal-pod-autoscaler-downscale-stabilization` (Section 4) is real and current; note the per-HPA `behavior` block largely supersedes it for most users.
- Kyverno note (forward-looking, not changed): `spec.validationFailureAction` is itself deprecated in newer Kyverno in favor of the per-rule `spec.rules[*].validate.failureAction`. The post's top-level field still works, so only the value casing was corrected; a future refresh could migrate to the per-rule field.
- Section 7: a literal pod name (`payments-abc123`) is used as a placeholder since ephemeral-container injection needs a concrete Pod; readers should substitute an actual pod name (e.g. from `kubectl get pods`).
