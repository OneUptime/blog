# Validation Summary: How to Configure Advanced Kubernetes NetworkPolicy with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico Open Source
- Calico NetworkPolicy API
- kubectl
- calicoctl
- Mermaid

## Sources Consulted
- Kubernetes documentation: Network Policies, https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Calico documentation: Get started with Calico network policy, https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico documentation: What is network policy?, https://docs.tigera.io/calico/latest/about/kubernetes-training/about-network-policy
- Calico documentation: calicoctl apply, https://docs.tigera.io/calico/latest/reference/calicoctl/apply

## Issues Found
- The introduction said the `projectcalico.org/v3` API provided the flexibility for the shown advanced Kubernetes NetworkPolicy, but the main manifest is a Kubernetes `networking.k8s.io/v1` NetworkPolicy. Updated the wording to clarify that Calico enforces Kubernetes NetworkPolicy resources and that Calico's `projectcalico.org/v3` API adds extra policy capabilities beyond the standard Kubernetes API.
- The first access test was labeled "cross-namespace" even though both the frontend pod and API service are in the `production` namespace. Updated the comment to "same-namespace access."

## Review Notes
- The Kubernetes NetworkPolicy YAML is syntactically valid and uses the current `networking.k8s.io/v1` API.
- The combined `namespaceSelector` and `podSelector` entries correctly select pods matching the pod selector within namespaces matching the namespace selector.
- The second egress rule intentionally has no `to` selector, so it allows the selected pods to connect to any destination on UDP port 53 and TCP port 443. This is valid Kubernetes NetworkPolicy behavior, but production users should ensure that broad egress is intended.
- The example commands assume that the referenced pod names, service name, namespaces, and labels already exist.
