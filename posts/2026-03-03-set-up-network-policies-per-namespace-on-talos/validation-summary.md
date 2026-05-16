# Validation Summary: How to Set Up Network Policies per Namespace on Talos

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- Kubernetes NetworkPolicy
- Cilium
- Hubble
- Helm
- kubectl
- Flannel
- Calico

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/network-policy-v1/
- Cilium Kubernetes installation with Helm: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium Talos installation guide: https://docs.cilium.io/en/stable/installation/k8s-install-helm/#talos
- Cilium Network Policy enforcement documentation: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Calico policy for Flannel guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/flannel/flannel

## Issues Found
- The Cilium installation command was a generic Helm install and did not include the Talos-specific settings required by the official Cilium Talos guide. Updated the command to include the Talos CNI/kube-proxy prerequisites and the documented Helm values for IPAM, kube-proxy replacement, host legacy routing for Talos DNS forwarding, capabilities, cgroup settings, and Kubernetes API endpoint.
- The reusable default-deny, DNS, intra-namespace, and ingress policy snippets hard-coded `metadata.namespace: team-backend` while the post applied them with `kubectl -n <namespace> apply`. A namespaced object with a conflicting namespace does not apply cleanly to another namespace, so the reusable snippets now omit `metadata.namespace`.
- The Hubble observation commands used `kubectl exec ds/cilium -- hubble observe`, which observes from a Cilium agent context. Updated them to the documented `hubble observe -P` pattern for querying Hubble Relay with local port-forwarding.
- The post described Cilium as "the most popular CNI" on Talos. Reworded this to "a common CNI" because the original ranking claim was not necessary for the technical guidance and was not backed by an authoritative source.

## Review Notes
- The NetworkPolicy examples use current `networking.k8s.io/v1` APIs and valid selector structure.
- The DNS example assumes CoreDNS/kube-dns pods are labeled `k8s-app: kube-dns`, which is common but should be adjusted if a cluster uses different DNS pod labels.
- The external egress example excludes common private RFC1918 ranges. Operators should align the `except` list with their actual Pod, Service, node, and internal network CIDRs.
