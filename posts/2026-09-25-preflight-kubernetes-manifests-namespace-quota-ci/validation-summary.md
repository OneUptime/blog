# Validation Summary: How to Preflight Kubernetes Manifests Against Remaining Namespace Quota in CI

## Status
validated

## Post Type
Technical guide with Bash commands and a jq Pod-template extraction example.

## Technologies Covered
- Kubernetes Deployments, ReplicaSets, Pods, ResourceQuota, and LimitRange
- Kubernetes API server dry-run, admission, authorization, and admission webhooks
- kubectl and Kustomize
- Bash and jq
- CI/CD rollout budgeting, resource quantities, and scheduling

## Sources Consulted
- Kubernetes API concepts: dry-run, generated values, and authorization — https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run
- Kubernetes quota admission implementation: request checking precedes the dry-run branch that skips quota updates — https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/apiserver/pkg/admission/plugin/resourcequota/controller.go
- Resource quotas: resource keys, usage, scopes, and enforcement — https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Deployments: controller behavior, rolling updates, surge, and terminating overlap — https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kubectl create reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/
- kubectl apply reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- kubectl get reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl kustomize reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Local CLI help: `kubectl create --help`, `kubectl apply --help`, and `kubectl config current-context --help`
- jq manual: object construction, `--arg`, and the alternative operator — https://jqlang.org/manual/
- Resource management: CPU and memory quantities and resource requests — https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Sidecar containers: effective resource accounting — https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Pod overhead: admission-time overhead and quota accounting — https://kubernetes.io/docs/concepts/scheduling-eviction/pod-overhead/
- Limit ranges: defaults and admission constraints — https://kubernetes.io/docs/concepts/policy/limit-range/
- Taints and tolerations: node taints and Pod tolerations — https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/

## Issues Found
- The final scheduling caveat described a node as having tolerations. Tolerations are configured on Pods; taints are applied to nodes. Updated that sentence to refer explicitly to node resources, volume topology, node taints, and Pod tolerations. The quota-versus-scheduling distinction is preserved.

## Review Notes
- Confirmed that a Deployment dry-run does not create its future replicas. A representative Pod creation exercises Pod admission, including defaults and mutations, but does not reserve quota. Independent successful dry-runs therefore cannot establish that aggregate demand fits.
- Confirmed that dry-run requires the corresponding write authorization and compatible admission webhooks. The discussion of identity, ownership, generated labels, and workload-specific differences appropriately limits the representative probe.
- Confirmed that rollout budgeting must include overlapping demand, every applicable quota, and resource-specific accounting. The CPU example is correct: eight existing CPU plus three additional one-CPU requests exceeds a ten-CPU ceiling.
- The warning about terminating overlap is appropriate: rollout resource consumption can exceed the nominal replica-plus-surge count. Quota accounting must determine when usage has been released. Quota scopes named Terminating and NotTerminating specifically concern `activeDeadlineSeconds`, which a future calculator must distinguish from deletion in progress.
- Both Bash examples passed `bash -n`. Executed the exact jq filter against Deployment fixtures with and without template labels and annotations; confirmed namespace assignment, metadata fallbacks, and unchanged Pod specification. Local kubectl help confirms the documented dry-run flags and current-context command.
- The post is a design guide, not a complete quota calculator. It assumes an existing namespace, production overlay, and a single intended Deployment in `deployment.json`. A calculator must match the target cluster's accounting behavior and reject unsupported constructs as the post directs.
- No live-cluster admission or rollout test was performed. Cluster policies, permissions, injected containers, and runtime quota behavior remain environment-dependent.
- All technical links in the post resolved to the intended official documentation or upstream source. The quota source link uses the moving master branch; it is not a release-pinned implementation reference. The post makes no specific Kubernetes-version claim and uses no deprecated API or CLI flag identified in this review.
