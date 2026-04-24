# Validation Summary: How to Manage Kubernetes Nodes from Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- kubectl
- kubeadm
- Linux node maintenance on Ubuntu/Debian-based systems

## Sources Consulted
- Portainer Documentation, "Details" (Kubernetes cluster details): https://docs.portainer.io/sts/user/kubernetes/cluster/details
- Portainer Documentation, "Inspect a node": https://docs.portainer.io/user/kubernetes/cluster/details/node
- Kubernetes Documentation, `kubectl drain`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes Documentation, `kubectl cordon`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cordon/
- Kubernetes Documentation, `kubectl get`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Documentation, "Taints and Tolerations": https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes Documentation, "Assigning Pods to Nodes": https://kubernetes.io/docs/concepts/configuration/assign-pod-node/
- Kubernetes Documentation, "Upgrading Linux nodes": https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/upgrading-linux-nodes/
- Kubernetes Documentation, "Creating a cluster with kubeadm": https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
- Kubernetes Documentation, `kubeadm reset`: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-reset/

## Issues Found
- The Portainer navigation path was incorrect. I changed `Cluster → Nodes` to `Cluster → Details`, which matches the current Portainer documentation.
- The Step 1 node list overstated specific CPU and memory columns. I narrowed it to documented fields and added the official note that node stats require the metrics API.
- The node inspection example did not match Portainer's documented node details. I updated it to use fields Portainer explicitly documents, including availability, kubelet version, Kubernetes API, labels, taints, and applications running on the node.
- The Portainer label-editing and node-action instructions were inaccurate. I replaced the unsupported `Edit` and `Cordon` wording with the documented labels section and `Availability` states `Pause` and `Drain`.
- The multiline `kubectl drain` example was invalid shell because the line-continuation backslashes were followed by inline comments. I moved the comments onto separate lines so the command is executable.
- The OS update section included outdated and incomplete Kubernetes component upgrade commands with hard-coded package versions. I removed those commands and replaced them with a direction to follow the distribution's documented upgrade procedure when upgrading Kubernetes components.
- The node-removal sequence for kubeadm-managed nodes was out of order. I reordered it to drain the node, run `kubeadm reset` on the node, then delete the node object from the cluster, and I added `--force` to the drain example to match the official cleanup guidance for unmanaged pods.
- The pod distribution command depended on the current column layout of `kubectl get pods -o wide`. I replaced it with a supported `custom-columns` form from the official `kubectl get` documentation.
- The conclusion overclaimed zero downtime. I reworded it to say draining helps minimize disruption during maintenance rather than guarantee zero downtime.

## Review Notes
- Portainer UI wording varies slightly across documentation branches, but the revised post now uses the current documented navigation and node availability terminology.
- Kubernetes component upgrade steps are distribution- and installer-specific. The post is more accurate after removing the hard-coded kubeadm and kubelet package version example.
- I validated the commands and claims against official documentation, but I did not execute them against a live Kubernetes cluster in this workspace.
