# Validation Summary: How to Enforce Namespace Defaults and Quotas for Kubernetes Ephemeral Storage

## Status

validated

## Post Type

Technical guide / Kubernetes policy tutorial

## Technologies Covered

- Kubernetes local ephemeral storage (`ephemeral-storage`)
- Kubernetes `LimitRange`
- Kubernetes `ResourceQuota`
- Kubernetes namespaces and admission control
- `emptyDir` volumes
- Generic ephemeral volumes and PersistentVolumeClaims
- StorageClass-scoped storage quotas
- kubelet storage accounting and eviction
- `kubectl`

## Sources Consulted

- [Kubernetes: Local ephemeral storage](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)
- [Kubernetes: Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes: Limit Ranges](https://kubernetes.io/docs/concepts/policy/limit-range/)
- [Kubernetes API: LimitRange v1](https://kubernetes.io/docs/reference/kubernetes-api/core/limit-range-v1/)
- [Kubernetes: Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Kubernetes: Ephemeral Volumes](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/)
- [Kubernetes: Volumes and `emptyDir`](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)
- [Kubernetes: Init Containers resource sharing](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/#resource-sharing-within-containers)
- [Kubernetes: Sidecar Containers resource sharing](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/#resource-sharing-within-containers)
- [Kubernetes: Pod Overhead](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-overhead/)
- [Kubernetes: Limit Storage Consumption](https://kubernetes.io/docs/tasks/administer-cluster/limit-storage-consumption/)
- [Kubernetes: Configure Default Memory Requests and Limits for a Namespace](https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/memory-default-namespace/)
- [Kubernetes API Concepts: Dry-run](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run)
- [Kubernetes: `kubectl apply`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)
- [Kubernetes: JSONPath Support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes: Node-pressure Eviction](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/)
- [Kubernetes image registry: `pause:3.10` manifest](https://registry.k8s.io/v2/pause/manifests/3.10)

## Issues Found

- Kubelet storage-limit enforcement was described as unconditional. The introduction and `emptyDir.sizeLimit` explanation now state that accounting and limit-based eviction depend on kubelet being able to observe the underlying storage through a supported node filesystem layout. The storage-source list was also scoped to the principal per-Pod usage counted against `ephemeral-storage` limits, rather than all disk consumers on a node.
- Namespace quota totals and the Pod local-storage limit were described as simple sums of container declarations. The post now uses effective Pod requests and limits, explains that the simple sum applies only when there are app containers and no Pod overhead, and notes the special aggregation rules for init containers and Pod overhead. It also specifies that only disk-backed `emptyDir` usage counts against the local ephemeral-storage limit.
- The request-defaulting explanation did not make the LimitRange interaction explicit. It now explains that when a container supplies a limit but omits its request, Kubernetes copies the limit into the request and does not use the LimitRange `defaultRequest` for that resource; `defaultRequest` supplies the distinct request when both values are omitted.
- The Deployment server-side dry-run example could be read as validating the Pods that the Deployment would later create. The post now states that dry-run admission applies only to the submitted Deployment and that a representative Pod must be tested separately for Pod defaults and quota admission.
- Generic ephemeral volume quota timing was too broad. The post now explains that the Pod is admitted before the ephemeral volume controller creates the generated PVC, so PVC quota or PVC LimitRange rejection happens later and prevents the Pod from starting.
- Admission rejections were presented as ordinary namespace events. The post now states that a rejected Pod create/apply request returns the admission error directly and normally creates no Pod event; event inspection is reserved for failures that occur after admission, including generated-PVC failures and runtime eviction.
- The rollout warning said a controller could fail only while replacing an existing replica. It now covers every new Pod creation, including scale-up, rollout, and replacement.

## Review Notes

All APIs and fields shown are current, non-deprecated core `v1` APIs. The four complete YAML manifests decoded successfully with `kubectl` v1.34.1 client dry-run, the partial `emptyDir` example decoded when embedded in a Pod, and all shell snippets passed `bash -n`. All documentation links resolve to the intended official pages; the post's older LimitRange API path redirects to the current `/core/limit-range-v1/` page. The `registry.k8s.io/pause:3.10` image tag is present. Admission behavior should still be tested against the target cluster version and its configured admission stack, as the post recommends.
