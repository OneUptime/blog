# Validation Summary: MLRun Jobs Stuck in `Pending`: Check Events, Quotas, Volumes, and Nodes

## Status
validated

## Post Type
Technical troubleshooting guide with Bash and kubectl command examples.

## Technologies Covered
- MLRun run submission, monitoring, and inherited node selectors.
- Kubernetes pod lifecycle, events, admission, and scheduling.
- ResourceQuota, LimitRange, CPU and memory requests and limits.
- Node selectors, affinity, taints, and tolerations.
- PersistentVolumeClaims, PersistentVolumes, and StorageClass binding modes.
- kubectl and JSONPath.

## Sources Consulted
- [MLRun configuring runs and functions](https://docs.mlrun.org/en/stable/runtimes/configuring-job-resources.html): selector inheritance, precedence, empty-string overrides, and UI troubleshooting.
- [MLRun run model implementation](https://docs.mlrun.org/en/stable/_modules/mlrun/model.html): completion waiting and timeout behavior.
- [Kubernetes Debug Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-pods/): describe output, events, and scheduling diagnosis.
- [Kubernetes Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/): Pending includes scheduling and container preparation.
- [Kubernetes resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/): requests drive scheduling; limits govern runtime usage.
- [Kubernetes Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/): quota violations can reject creation before a pod exists.
- [Kubernetes Limit Ranges](https://kubernetes.io/docs/concepts/policy/limit-range/): default requests and limits and admission constraints.
- [Kubernetes assigning pods to nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/): selectors, affinity, labels, and node assignment.
- [Kubernetes taints and tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/): placement restrictions.
- [Kubernetes Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/): claim references, binding, node affinity, and mount failures.
- [Kubernetes StorageClass volume binding modes](https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-binding-mode): delayed binding with WaitForFirstConsumer.
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/): multiple resource types, namespace, wide/YAML/JSONPath output, sorting, and labels.
- [kubectl describe reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/): named resources and all resources of a type.
- [kubectl JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/): field selection, iteration, and newline literals.
- [kube-apiserver reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/): finite event retention through event-ttl.

## Issues Found
1. The storage paragraph treated a pending claim as necessarily requiring storage repair. Added the WaitForFirstConsumer exception and directed readers to claim events and the StorageClass binding mode. Delayed binding can be expected while pod scheduling is unresolved.
2. The volume instructions said to list the pod's referenced claims, but `kubectl get pvc` lists all claims in the namespace. Added a JSONPath command that prints the claim names referenced in the pod's volumes before the existing inspection commands.

## Review Notes
- Reviewed every command and JSONPath expression against the official CLI documentation. Bash syntax checks passed for all five command blocks. No deprecated command or API usage was identified.
- The post's five original technical documentation links resolve to relevant official resources. The added storage reference also resolves correctly.
- MLRun selector merging and empty-string removal are documented; the existing instruction to consult the installed release remains appropriate. The post specifies no exact software version.
- Lowering a memory request does not itself lower the memory limit. The stated possibility of later memory failure is valid because under-requesting can permit placement on a node with insufficient memory under load.
- Namespace workload access does not automatically grant permission to list cluster-scoped nodes; readers need suitable RBAC access for that command.
- Commands use placeholder namespace, pod, and claim names. Validation was documentation-based plus local shell syntax checks; no live Kubernetes cluster or MLRun run was used.
