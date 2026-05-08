# Validation Summary: Configuring Cilium Default Deny Ingress Network Policy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- CiliumClusterwideNetworkPolicy
- Kubernetes NetworkPolicy
- kubectl
- Kubernetes namespaces
- Network policy ingress enforcement

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Cilium Policy Enforcement Modes documentation: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Creating Policies from Verdicts documentation: https://docs.cilium.io/en/latest/security/policy-creation/
- Cilium Layer 3 Policy documentation: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium Kubernetes policy documentation: https://docs.cilium.io/en/stable/security/policy/kubernetes/
- Cilium Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/

## Issues Found
- The CiliumNetworkPolicy default-deny examples used `ingress: []`. Current Cilium documentation says an endpoint enters default-deny mode when a rule selects it and contains the relevant `ingress` or `egress` section, and official default-deny examples use `ingress: - {}`. Updated the namespaced, per-namespace loop, and clusterwide Cilium policy examples to use `ingress: - {}`.
- The Mermaid diagram said monitoring traffic was "All Allowed", but the sample allow policy only permits traffic from pods labeled `app: prometheus` to port `9090/TCP`. Updated the diagram label to "Monitoring -> Port 9090 Allowed".
- The troubleshooting note implied ingress-only default deny could break DNS. Kubernetes NetworkPolicy and Cilium policy behavior treat ingress and egress enforcement independently, and DNS lookup failures are typically caused by egress restrictions. Updated the note to apply only when default deny egress is also added.

## Review Notes
The Kubernetes NetworkPolicy default-deny ingress example is correct and matches the Kubernetes documentation. The Cilium allow policy examples use current `cilium.io/v2` APIs and valid L3/L4 policy structure. The example `fromEndpoints` selectors without namespace labels match endpoints in the policy namespace by default; if Prometheus runs in a separate namespace, the policy should add the appropriate namespace label selector.
