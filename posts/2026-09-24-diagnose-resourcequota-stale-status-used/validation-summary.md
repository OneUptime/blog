# Validation Summary: How to Diagnose a ResourceQuota Whose status.used Appears Stale or Incorrect

## Status
validated

## Post Type
Technical troubleshooting guide with shell commands and Kubernetes implementation details.

## Technologies Covered
- Kubernetes ResourceQuota, quota admission, and controller reconciliation
- Kubernetes Pods, Jobs, PersistentVolumeClaims, scopes, and PriorityClass
- kube-controller-manager and Kubernetes API metadata
- kubectl, Bash, and jq

## Sources Consulted
- [Kubernetes Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/) — resource keys, object counts, storage requests, scope selection, and enforcement.
- [Kubernetes v1.36.0 quota controller](https://github.com/kubernetes/kubernetes/blob/v1.36.0/pkg/controller/resourcequota/resource_quota_controller.go) — periodic recalculation, replenishment, initialization, discovery, error retries, and status updates. Retrieved the official raw source when the GitHub browser view failed.
- [Kubernetes v1.36.0 Pod quota evaluator](https://github.com/kubernetes/kubernetes/blob/v1.36.0/pkg/quota/v1/evaluator/core/pods.go) — persisted Pod counts, lifecycle exclusions, deletion-grace handling, effective resources, and feature gates.
- [Kubernetes v1.36.0 PVC quota evaluator](https://github.com/kubernetes/kubernetes/blob/v1.36.0/pkg/quota/v1/evaluator/core/persistent_volume_claims.go) — storage usage accounting.
- [Kubernetes API concepts: resource versions](https://kubernetes.io/docs/reference/using-api/api-concepts/#resource-versions) — version ordering, read consistency, and update conflicts.
- [Kubernetes finalizers](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/) — deletion timestamps and retention pending finalization.
- [kube-controller-manager reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/) — quota synchronization period and concurrent worker options.
- [kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) — named resource lookup, namespace, JSON output, and watch behavior.
- [kubectl version](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/) — YAML version output.
- [kubectl config current-context](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_current-context/) — current context inspection.
- [jq manual](https://jqlang.org/manual/) — field access and object construction.

## Issues Found
- **Outdated resourceVersion description:** The post called resource versions opaque despite targeting Kubernetes v1.36. The official API documentation specifies monotonically increasing integer ordering within the same API group and resource type for resources served by kube-apiserver, with conformance requirements starting in v1.35. Replaced that description with the supported ordering boundary. Retained the warning that resource versions are neither timestamps nor numeric measures of quota lag, and clarified that Pod and quota versions cannot be compared for this purpose.

## Review Notes
- Both Bash blocks passed `bash -n`. The exact jq filter ran successfully against a representative ResourceQuota JSON fixture and selected the expected metadata, spec, and status fields.
- Verified all kubectl commands and options against the official CLI references. No cluster commands were executed; live reconciliation and admission behavior were reviewed through documentation and source rather than an integration test.
- The pinned v1.36.0 source confirms that `count/pods` includes retained terminal objects, while Pod compute accounting excludes terminal Pods and applies deletion-grace rules. The effective resource calculation uses feature-dependent handling for Pod-level resources and in-place resizing.
- Confirmed that the controller prioritizes missing usage and spec/status limit differences, recalculates usage, updates status, and retries errors. Periodic reconciliation can be disabled, so the post correctly avoids promising a universal convergence time.
- Storage accounting is not limited to mounted or bound PVCs. Scope selection and overlapping quotas must be considered independently when comparing usage with inventory.
- The documentation and implementation references identify the intended resources. The implementation analysis remains explicitly pinned to v1.36.0; behavior in another cluster version or with different feature gates should be checked against that version.
- No further technical corrections were needed. The post structure and commands were preserved.
