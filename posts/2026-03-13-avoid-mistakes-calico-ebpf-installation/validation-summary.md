# Validation Summary: How to Avoid Common Mistakes with Calico eBPF Installation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Tigera Operator
- Helm
- eBPF dataplane
- kube-proxy

## Sources Consulted
- Calico Open Source documentation: Install in eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico Open Source documentation: Enabling the eBPF data plane, https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico Open Source documentation: Installing with Helm, https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Calico Open Source documentation: Helm installation reference, https://docs.tigera.io/calico/latest/reference/installation/helm_customization
- Calico Open Source documentation: Troubleshoot eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Kubernetes documentation: Debugging Kubernetes Nodes With Kubectl, https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The post treated a persistent BPF filesystem mount as a documented Calico eBPF installation prerequisite. Current Calico Open Source documentation instead emphasizes supported kernel versions and API server endpoint configuration. I replaced the bpffs preparation and fstab examples with kernel verification and the `kubernetes-services-endpoint` ConfigMap.
- The Helm example used the wrong chart and namespace: `projectcalico/calico` in `calico-system`. Current Calico Helm installation uses `projectcalico/tigera-operator` in the `tigera-operator` namespace. I corrected the chart, namespace, and values structure.
- The Helm example used `kubeProxy.enabled=false`, which is not a documented Calico Helm value. Current Calico eBPF installation guidance disables kube-proxy at cluster creation, for example with `kubeadm init --skip-phases=addon/kube-proxy`, or patches the kube-proxy DaemonSet later. I changed the example to disable kube-proxy during `kubeadm init`.
- The post claimed that applying the Installation resource before operator readiness could be "missed" by the operator. Kubernetes custom resources are reconciled after creation; the practical failure is applying the resource before the CRD is established. I changed the guidance to wait for the `installations.operator.tigera.io` CRD and the operator rollout.
- The kernel feature check used `/boot/config-$(uname -r)` inside a node debug container without entering the host filesystem and framed individual config options as the main requirement. I changed the examples to use `kubectl debug --profile=sysadmin` with `chroot /host uname -r`, matching Kubernetes node-debug behavior and Calico's documented kernel version requirements.

## Review Notes
The article now matches Calico Open Source 3.32 documentation as of 2026-05-14. Some environments, such as AKS or distributions that manage kube-proxy, require the documented "avoid conflicts" Felix configuration instead of disabling kube-proxy directly.
