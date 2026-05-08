# Validation Summary: Building a Runbook for FailedCreatePodSandBox Errors After Installing Calico

## Status
validated

## Post Type
Guide / Runbook

## Technologies Covered
- Kubernetes
- kubectl
- Calico CNI
- Tigera Operator Installation API
- Calico IPAM and IPPool resources

## Sources Consulted
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes node debugging with kubectl documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IP address management documentation: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico installation customization documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/config-options

## Issues Found
- The `kubectl logs` command used `--field-selector spec.nodeName=NODE_NAME`, but `kubectl logs` supports label selectors and pod/resource arguments, not field selectors. Changed the example to first resolve the calico-node pod on the target node with `kubectl get pod --field-selector spec.nodeName=NODE_NAME`, then pass that pod name to `kubectl logs`.
- The Calico `Installation` resource was queried with `-n calico-system`, but the Tigera Operator `Installation` resource is cluster-scoped and must be named `default`. Changed the command to `kubectl get installations.operator.tigera.io default -o yaml`.
- The troubleshooting note used non-existent Installation CR fields `spec.cni.cniBinPath` and `spec.cni.cniConfDir`. Changed them to the documented fields `spec.cni.binDir` and `spec.cni.confDir`.
- The initial triage decision tree suggested that namespace-specific `FailedCreatePodSandBox` errors are likely caused by network policy. Network policies affect traffic after sandbox creation rather than the CNI sandbox setup itself, so the note was narrowed to namespace-specific IPAM issues.

## Review Notes
- The post assumes an operator-based Calico installation using the `calico-system` namespace. Manifest-based Calico installations may use `kube-system`, so teams should adapt namespace names to their installation method.
- The example IPPool is syntactically valid, but `ipipMode`, `vxlanMode`, and CIDR values must match the cluster's chosen encapsulation and pod network.
