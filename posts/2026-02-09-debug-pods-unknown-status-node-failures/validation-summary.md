# Validation Summary: How to Debug Pods with Unknown Status After Node Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes Pods, Nodes, taints, tolerations, and eviction behavior
- kubectl commands for node and pod diagnosis
- StatefulSet recovery behavior
- PodDisruptionBudget configuration
- Kubernetes Python client
- Kubernetes RBAC
- Prometheus/kube-state-metrics alerting

## Sources Consulted
- Kubernetes Pod Lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes Taints and Tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes Force Delete StatefulSet Pods documentation: https://kubernetes.io/docs/tasks/run-application/force-delete-stateful-set-pod/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes Node-pressure Eviction documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes Disruptions and PodDisruptionBudget documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics node metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- Official Kubernetes Python client repository: https://github.com/kubernetes-client/python

## Issues Found
- The post described `pod-eviction-timeout` as the current default mechanism and suggested checking it by grepping node taints. Updated this to check node taints and pod tolerations, and explained the default `node.kubernetes.io/not-ready` and `node.kubernetes.io/unreachable` tolerations with `tolerationSeconds=300`.
- The post implied Deployment and StatefulSet pods are automatically replaced the same way after the timeout. Updated this to distinguish Deployment/ReplicaSet replacement from StatefulSet identity safety requirements.
- The `kubectl drain --force` description said to use it when drain hangs due to Unknown pods. Updated it to match the official kubectl behavior: `--force` is for continuing when unmanaged pods are present.
- The StatefulSet node-inspection example used `docker ps`, which is outdated for clusters using CRI runtimes after dockershim removal. Replaced it with `crictl ps`.
- The split-brain section implied PodDisruptionBudgets prevent split-brain. Updated it to clarify that PDBs limit voluntary disruptions and that split-brain prevention requires application-level quorum and fencing.
- The fencing Pod example had a PDB selector that did not match the Pod. Added the matching `app: database` label and clarified that `preStop` only runs during graceful termination, not hard node failure.
- The Python controller used only `load_kube_config()`, which would not work as shown inside the Deployment. Added `load_incluster_config()` with a local kubeconfig fallback.
- The Prometheus alert for Unknown pods used a per-pod gauge as if `$value` were a pod count. Changed the expression to sum matching series.
- The NodeNotReady alert only matched `Ready=false`, missing unreachable nodes where `Ready=unknown`. Updated it to match both `false` and `unknown`.
- The best-practices section referred to setting `pod-eviction-timeout`. Updated it to recommend setting `tolerationSeconds` for not-ready and unreachable taints.
- The health-check guidance said probes help Kubernetes understand pod state even during network issues. Adjusted this to normal operation and recovery, since the control plane cannot receive kubelet updates during node communication failures.

## Review Notes
The post is technically relevant and valid after the corrections. The automated force-delete controller remains an illustrative example and should be treated cautiously for stateful workloads because automated force deletion can violate StatefulSet at-most-one semantics without external fencing.
