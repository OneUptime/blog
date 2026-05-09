# Validation Summary: How to Test Network Policies with Calico on Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes namespaces, pods, and services
- kubectl
- Calico GlobalNetworkPolicy
- calicoctl
- Rancher projects and namespaces

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Rancher Projects and Kubernetes Namespaces documentation: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/projects-and-namespaces

## Issues Found
- The post said "Or via kubectl" under Rancher project creation, but the commands only create Kubernetes namespaces and labels. I clarified that these commands label namespaces for the `namespaceSelector` examples and do not create Rancher projects.
- The Calico GlobalNetworkPolicy was named as if it specifically denied node-exporter access. Because the example is a general cluster-wide ingress deny for destination port 9100 on selected Calico endpoints, I renamed it to `rancher-deny-tcp-9100`.
- The Calico GlobalNetworkPolicy matched destination port 9100 without explicitly stating the protocol. I added `protocol: TCP`, matching Calico's documented examples for TCP port rules.

## Review Notes
The Kubernetes NetworkPolicy examples are valid and rely on additive ingress policy behavior: once `ns-b` pods are isolated for ingress, the later allow policy adds TCP/80 access from namespaces labeled `project=a`. The guide assumes the reader waits for pods and services to become ready before running connectivity checks; adding explicit readiness checks could make the tutorial more robust in the future.
