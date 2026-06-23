# Validation Summary: How to Secure MetalLB with Kubernetes Network Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes Services of type LoadBalancer
- MetalLB
- Calico GlobalNetworkPolicy
- CiliumNetworkPolicy
- ingress-nginx ConfigMap settings
- kubectl commands

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes source IP for Services documentation: https://kubernetes.io/docs/tutorials/services/source-ip/
- MetalLB usage documentation: https://metallb.io/usage/
- MetalLB native manifest labels and speaker `hostNetwork` setting: https://raw.githubusercontent.com/metallb/metallb/v0.16.1/config/manifests/metallb-native.yaml
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Cilium Network Policy documentation: https://docs.cilium.io/en/stable/security/policy/
- Cilium Layer 7 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/

## Issues Found
- The introduction said MetalLB traffic flows directly to pods. Updated this to explain that traffic reaches a node and is forwarded by the Kubernetes service proxy to backend pods.
- The IP-based NetworkPolicy examples did not mention source IP preservation. Added a caveat that external source matching depends on what source IP the CNI sees, and that `externalTrafficPolicy: Local` should be used and tested when original client IP matching is required.
- The MetalLB speaker NetworkPolicy example implied standard Kubernetes NetworkPolicy can reliably secure speaker-to-speaker and API server traffic. Updated the section to explain that MetalLB speakers normally run with `hostNetwork: true`, so behavior is CNI-dependent and may require node firewall or CNI-specific host policies. Also removed the unreliable Kubernetes API server selector rule.
- The complete Service example used the old `metallb.universe.tf/address-pool` annotation. Updated it to the current `metallb.io/address-pool` annotation.
- The complete Service example restricted ingress by source IP without preserving client source IP. Added `externalTrafficPolicy: Local` to align the example with the intended source-IP filtering behavior.
- The Calico logging example did not mention that `Log` is non-terminal. Added a note that log rules record matching packets and then continue policy evaluation.

## Review Notes
- All YAML snippets parse successfully.
- The post correctly notes that Kubernetes NetworkPolicy enforcement requires a CNI plugin that implements NetworkPolicy.
- The Cilium L7 policy example uses Cilium-specific policy features and is appropriately identified as an advanced Cilium example.
