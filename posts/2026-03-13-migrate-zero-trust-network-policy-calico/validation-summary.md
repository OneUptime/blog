# Validation Summary: How to Migrate to Zero Trust Network Policy in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Kubernetes
- Calico `GlobalNetworkPolicy`
- Calico `NetworkPolicy`
- Zero trust network segmentation
- `kubectl exec`

## Sources Consulted
- Calico Open Source documentation: Enable a default deny policy for Kubernetes pods - https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico Open Source resource reference: Global network policy - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source resource reference: Network policy - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation: Use log rules to test network policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico Open Source documentation: Stage, preview impacts, and enforce policy - https://docs.tigera.io/calico/latest/network-policy/staged-network-policies

## Issues Found
- The introduction stated that every connection is evaluated against explicit policy rules and nothing is permitted by default. Calico follows Kubernetes pod semantics: pods are default allow until applicable ingress or egress policies select them. Updated the wording to say this behavior applies after default-deny policy is applied.
- The introduction claimed comprehensive logging of every traffic decision. Calico supports `Log` actions and staged policies, but logging every decision is not automatic. Updated the text to refer to log rules and staged policies for previewing and troubleshooting traffic decisions.
- The global default-deny example selected `all()` across the cluster, which Calico documentation warns can affect system namespaces and control plane components. Added a `namespaceSelector` excluding common system namespaces, following Calico's documented best-practice pattern.
- The system traffic policy allowed ingress to port 10250, described as kubelet traffic. That is not a safe or generally correct workload policy example. Removed the kubelet ingress rule and kept DNS as the required system-traffic example.
- The DNS allow rule originally allowed any destination on TCP/UDP port 53. Changed it to target kube-dns endpoints with `selector: 'k8s-app == "kube-dns"'`, matching Calico's documented default-deny guidance.
- The application example only allowed API ingress from frontend. Under egress default deny, frontend-to-API traffic also needs a frontend egress allow. Added a second namespaced Calico `NetworkPolicy` allowing frontend egress to API port 8080.
- The default-deny verification command used `random-ip`, which would test DNS failure rather than network-policy denial. Changed it to curl the API service from a pod that is not explicitly allowed.
- The lateral movement verification used HTTP against a database port. Changed it to a TCP connectivity check with `nc`.
- The conclusion referred to "monitoring mode" and broad comprehensive logging. Updated it to refer to staged policies or log rules, which are the documented Calico mechanisms for discovering traffic before enforcement.

## Review Notes
The YAML policy block was parsed successfully with PyYAML, and `git diff --check` reported no whitespace errors. The examples still assume the demo pods have labels such as `tier == 'frontend'` and `tier == 'api'`, and that the test container image includes the tools used in the verification commands.
