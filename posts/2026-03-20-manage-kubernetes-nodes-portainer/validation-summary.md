# Validation Summary: How to Manage Kubernetes Nodes from Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- kubectl
- Kubernetes Metrics API / Metrics Server

## Sources Consulted
- Portainer Documentation, "Details": https://docs.portainer.io/user/kubernetes/cluster/details
- Portainer Documentation, "Inspect a node": https://docs.portainer.io/user/kubernetes/cluster/details/node
- Kubernetes Documentation, "Node Status": https://kubernetes.io/docs/reference/node/node-status/
- Kubernetes Documentation, "`kubectl cordon`": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cordon/
- Kubernetes Documentation, "`kubectl drain`": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes Documentation, "`kubectl label`": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes Documentation, "`kubectl taint`": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/
- Kubernetes Documentation, "`kubectl top`": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top
- Kubernetes Documentation, "`kubectl top node`": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_node/
- Kubernetes Documentation, "JSONPath Support": https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes Documentation, "Resource metrics pipeline": https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/

## Issues Found
- The Portainer navigation path was incorrect. The post said `Cluster > Nodes`, but current Portainer documentation uses `Cluster > Details`, with nodes listed in the `Nodes` section. I corrected the path and clarified the metrics-dependent usage stats behavior.
- The node inspection bullets overstated what Portainer documents on the node details page. I replaced the list with the documented node details: hostname, Kubernetes API endpoint, role, kubelet version, creation date, status, availability, resource usage/reservation, labels, taints, events, and applications running on the node.
- The JSONPath example for node conditions did not pair each condition with its status. I replaced it with a `range`-based JSONPath expression that outputs one `TYPE=STATUS` line per condition.
- The Portainer UI description referred to a `Cordon` button. Current Portainer documentation exposes node availability as `Active`, `Pause`, and `Drain`, so I updated the text to use the documented `Availability` control.
- The drain section overstated behavior by saying drain evicts all pods except DaemonSets and local storage pods. I corrected the wording to match Kubernetes documentation and to describe `--delete-emptydir-data` in terms of `emptyDir` data.
- The post used `kubectl top nodes`, while current Kubernetes documentation uses `kubectl top node`. I updated the command and added the missing Metrics API / Metrics Server prerequisite.

## Review Notes
- Portainer node usage stats are only available when the Metrics API is enabled.
- Portainer's node detail page also includes a YAML tab, but editing that YAML is only available in Portainer Business Edition.
