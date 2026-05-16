# Validation Summary: How to Troubleshoot Node Ready/NotReady Status on Talos Linux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Talos Linux
- Kubernetes node status and node conditions
- kubelet
- containerd
- Kubernetes CNI and Flannel
- kubectl
- talosctl

## Sources Consulted
- Kubernetes Node Status documentation: https://kubernetes.io/docs/reference/node/node-status/
- Kubernetes Taints and Tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes kube-controller-manager reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Talos Linux talosctl CLI reference: https://www.talos.dev/v1.11/reference/cli/
- Talos Linux troubleshooting documentation: https://www.talos.dev/v1.11/introduction/troubleshooting/
- Talos Linux v1alpha1 configuration reference: https://www.talos.dev/latest/reference/configuration/v1alpha1/config/

## Issues Found
- The post stated that the node monitor grace period default is 40 seconds. Current Kubernetes Node Status documentation lists `NodeMonitorGracePeriod` as defaulting to 50 seconds, so the text was updated.
- The node condition command used `.status.conditions[-1]`, which only reports the last condition rather than reliably showing all node conditions. It was replaced with a JSONPath command that prints every condition for each node.
- A network troubleshooting command was described as checking API server reachability but only displayed kubelet service status. It was changed to inspect kubelet logs for API server connection errors.
- The post used `talosctl ls`, but the current Talos CLI reference documents `talosctl list` for directory listings. The command was updated.
- The post referred to `pod-eviction-timeout` as the current eviction mechanism. Current Kubernetes behavior is based on `NoExecute` taints and default `node.kubernetes.io/not-ready` / `node.kubernetes.io/unreachable` tolerations with `tolerationSeconds=300`, so that explanation was corrected.

## Review Notes
The rest of the commands and configuration snippets are broadly consistent with current Kubernetes and Talos documentation. The Flannel examples assume the default Talos-managed Flannel CNI; clusters configured with `custom` or `none` CNI settings should adapt the label selectors and CNI troubleshooting commands to their installed CNI.
