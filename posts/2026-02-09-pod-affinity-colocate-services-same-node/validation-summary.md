# Validation Summary: How to Use Pod Affinity to Co-Locate Related Services on the Same Node

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes scheduler
- Pod affinity and pod anti-affinity
- Deployments
- Jobs
- kubectl

## Sources Consulted
- Kubernetes Assigning Pods to Nodes docs: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes Job API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/
- Kubernetes DaemonSet docs: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes node labels reference: https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes well-known labels reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The Job example omitted `restartPolicy`, which defaults to `Always` for Pods but is invalid for Job pod templates. Added `restartPolicy: OnFailure` because Kubernetes Jobs allow only `Never` or `OnFailure`.
- The weighted affinity explanation implied the scheduler chooses purely by the combined affinity score. Reworded it to clarify that affinity weights are added to other scheduler scores before the final node is selected.
- The logging example used a DaemonSet while saying log collectors preferentially run on nodes with application pods. A DaemonSet creates a Pod on every eligible node, so preferred pod affinity does not express that behavior. Changed the example to a Deployment with replicas so preferred pod affinity can influence placement as described.

## Review Notes
The examples use current stable Kubernetes API versions and current topology labels such as `kubernetes.io/hostname` and `topology.kubernetes.io/zone`. Future improvements could mention that inter-pod affinity and anti-affinity can add scheduler overhead in very large clusters, and that `hostPath` is suitable only when the workload intentionally depends on node-local paths.
