# Validation Summary: How to Test Network Policies with Calico with Binary Management on Bare Metal

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico network policy enforcement
- kubectl
- calicoctl
- BusyBox wget
- Ansible playbooks
- Linux iptables

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Calico workload endpoint documentation: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico network policy overview: https://docs.tigera.io/calico/latest/about/about-network-policy
- Calico eBPF dataplane documentation: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Ansible shell module documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/shell_module.html
- Ansible playbook error handling documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Local BusyBox wget help output from BusyBox 1.36.1

## Issues Found
- The BusyBox client examples used `wget --timeout=5`. BusyBox wget documents `-T SEC` as the portable timeout option, while `--timeout` is a GNU wget long option. Updated the kubectl and Ansible examples to use `wget -qO- -T 5`.
- The Felix verification step implied that `iptables` is always the dataplane inspection point. Calico can also use an eBPF dataplane, so the text now scopes the `iptables -L | grep cali-` check to clusters using the standard iptables dataplane.

## Review Notes
The Kubernetes NetworkPolicy manifests use the current `networking.k8s.io/v1` API and match Kubernetes default-deny and allow-list semantics. The `kubectl run`, `kubectl expose pod`, `kubectl exec -- COMMAND`, `calicoctl get workloadendpoint -n`, and Ansible `register` / `failed_when` patterns are valid.
