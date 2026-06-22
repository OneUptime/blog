# Validation Summary: How to Drain and Cordon Kubernetes Nodes for Maintenance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes Nodes
- DaemonSets
- PodDisruptionBudgets
- Kubernetes Jobs
- Bash

## Sources Consulted
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes kubectl cordon reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cordon/
- Kubernetes safely drain a node task: https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes disruptions concept documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/

## Issues Found
- The post described `kubectl drain` as evicting all pods. Kubernetes documentation states that drain evicts or deletes pods, excludes mirror pods, does not delete DaemonSet-managed pods, and requires flags for certain pod classes. Updated wording to "evicts or deletes eligible pods."
- The DaemonSet explanation implied drain deletes DaemonSet pods and they restart later. Kubernetes documentation states drain ignores DaemonSet-managed pods when `--ignore-daemonsets` is used and does not delete them. Updated the comments accordingly.
- The label selector `--pod-selector='!critical=true'` was invalid for Kubernetes selector syntax. Changed it to `--pod-selector='critical!=true'`.
- The JSONPath example for finding pods without owner references used a negation form that is not portable in kubectl JSONPath. Replaced it with a kubectl Go template using `if not .metadata.ownerReferences`.
- The PDB troubleshooting script comment claimed it identified blocking pods, but the command only listed PDB selectors in relevant namespaces. Updated the comment so it accurately describes the command.
- The rolling restart script checked node readiness with `grep -q "Ready"`, which can also match `NotReady`. Replaced it with a JSONPath check for the Node Ready condition status equal to `True`.
- The conclusion said to always cordon before draining, even though `kubectl drain` cordons the node itself. Updated the takeaway to recommend cordoning before maintenance windows when scheduling should stop before the drain starts.

## Review Notes
The Kubernetes Job example is conceptual and would still require appropriate RBAC for the `node-maintenance` service account in a real cluster. The post does not include that RBAC because adding it would be a larger expansion rather than a correction to the existing content.
