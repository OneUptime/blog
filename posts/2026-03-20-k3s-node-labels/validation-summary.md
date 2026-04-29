# Validation Summary: How to Configure K3s Node Labels

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- `kubectl`
- Node labels
- Pod scheduling (`nodeSelector`, `nodeAffinity`)
- Ansible (`kubernetes.core.k8s`)

## Sources Consulted
- K3s installation configuration docs: https://docs.k3s.io/installation/configuration
- K3s agent CLI docs: https://docs.k3s.io/cli/agent
- K3s server CLI docs: https://docs.k3s.io/cli/server
- K3s advanced configuration docs: https://docs.k3s.io/advanced
- Kubernetes labels and selectors docs: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes assigning Pods to nodes docs: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes `kubectl label` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes node labels populated by the kubelet: https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes nodes concept docs: https://kubernetes.io/docs/concepts/architecture/nodes/
- Ansible `kubernetes.core.k8s` module docs: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html

## Issues Found
- The config-file installation example used `curl -sfL https://get.k3s.io | sh - agent`, which is not a valid way to pass the `agent` argument to the install script. I changed it to `curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="agent" sh -s -`, which matches the documented K3s installation patterns.
- The “Well-Known Labels” section incorrectly stated that K3s adds `node.kubernetes.io/instance-type=k3s` and used fixed values such as `kubernetes.io/arch=amd64`. I replaced that with the Kubernetes-documented preset node labels and placeholders, because these labels are populated by Kubernetes/kubelet and their values are environment-dependent.

## Review Notes
- The post is correct that install-time `--node-label` / `node-label` settings are for node registration time; later label changes should be made with `kubectl label`.
- Preset labels such as `node.kubernetes.io/instance-type`, `topology.kubernetes.io/region`, and `topology.kubernetes.io/zone` may be absent if the kubelet cannot determine them.
