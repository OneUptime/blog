# Validation Summary: How to Use Ansible to Manage Kubernetes Network Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- kubernetes.core Ansible collection
- Kubernetes NetworkPolicy
- Kubernetes networking and CNI policy enforcement
- YAML

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Ansible kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc5737

## Issues Found
- The default-deny explanation said "everything is denied." Kubernetes NetworkPolicy has important exceptions and scope limits, including traffic from a pod's local node and reply traffic for allowed connections. Updated the wording to describe denied ingress and egress connections covered by NetworkPolicy more precisely.
- The frontend ingress task name said it allowed traffic "from any source," but the policy only allows traffic from namespaces labeled `kubernetes.io/metadata.name: ingress-nginx`. Updated the task name to match the selector.
- The external payment provider example used `203.0.113.0/24` and `198.51.100.0/24`, which are RFC 5737 documentation address blocks. Updated the comments to identify them as example ranges.
- The summary claimed Network Policies "cost nothing to run" and "add no latency." That is too absolute because enforcement behavior and performance depend on the CNI implementation. Reworded it to say NetworkPolicies require no application code changes, while enforcement and performance characteristics depend on the networking implementation.

## Review Notes
The Kubernetes API fields and Ansible module usage are valid for the documented NetworkPolicy v1 resource and the `kubernetes.core.k8s` / `kubernetes.core.k8s_info` modules. The DNS example assumes the cluster DNS pods use the common `k8s-app: kube-dns` label in the `kube-system` namespace; some managed clusters or custom CoreDNS deployments may use different labels.
