# Validation Summary: How to Fix Calico Node Not Ready Status

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- kubectl
- Calico
- Kubernetes CNI
- DaemonSets
- kubelet

## Sources Consulted
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes node status documentation: https://kubernetes.io/docs/reference/node/node-status/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes node-pressure eviction documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Calico system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico CNI plugin installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-cni-plugin
- Calico FAQ on hosted install CNI paths: https://docs.tigera.io/calico/latest/reference/faq

## Issues Found
- The introduction said one common fix was uncordoning the node after eviction. Kubernetes node-pressure eviction does not inherently cordon a node, so this was changed to freeing node resources after eviction.
- The post treated `/opt/cni/bin` as the universal CNI binary location. Calico uses this as the common Linux default, but installations can configure different paths, so the wording now says the configured CNI binary directory, commonly `/opt/cni/bin` on Linux nodes.
- The DaemonSet restart section implied `kubectl rollout restart daemonset calico-node -n kube-system` redeploys only on one node and always regenerates CNI binaries. The command restarts the DaemonSet's pods, and CNI reinstall behavior depends on manifest-based Calico installs that include the CNI installer. The wording was corrected.
- The description and root cause list mentioned Felix datastore connectivity, but the post did not diagnose or fix that condition. That claim was removed to keep the guide aligned with the actual troubleshooting steps.

## Review Notes
The kubectl commands use valid selectors and resource forms according to the Kubernetes documentation. The namespace and DaemonSet name assume a manifest-based Calico installation that deploys `calico-node` in `kube-system`; operator-based installs may use different namespaces and resources.
