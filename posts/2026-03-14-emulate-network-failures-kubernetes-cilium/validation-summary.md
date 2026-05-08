# Validation Summary: How to Emulate Network Failures in a Kubernetes Cluster Running Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Cilium
- CiliumNetworkPolicy
- Hubble CLI
- DNS/CoreDNS
- Network policy deny rules

## Sources Consulted
- Cilium Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium Policy Enforcement Modes documentation: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium Layer 3 Policy documentation: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium Deny Policies documentation: https://docs.cilium.io/en/stable/security/policy/deny/
- Cilium DNS-based Policy documentation: https://docs.cilium.io/en/stable/security/dns/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Hubble CLI `observe` help text from the official Cilium repository: https://github.com/cilium/cilium

## Issues Found
- The introduction and description claimed the post covered traffic control and latency injection using native Cilium features, but the examples only use Cilium network policy for drops and selective blocking. I removed those claims so the scope matches Cilium policy behavior shown in the post.
- The complete isolation policy used `ingress: []` and `egress: []`. Cilium's documented default-deny example uses a present rule section with an empty rule, such as `egress: - {}`. I changed the isolation policy to use `ingress: - {}` and `egress: - {}` so it explicitly puts the selected endpoint into default-deny mode in both directions.
- The partial external-DNS example allowed only `cluster` egress and then denied `world` UDP/53, which would block external APIs too and would not make normal cluster DNS resolution fail. I changed the allow baseline to `toEntities: all`, clarified that the failure is direct external resolver access, and updated the test command to query `8.8.8.8` explicitly.
- The DNS and port-specific deny examples used `egressDeny` without an allow baseline. Cilium deny policies take precedence over allow policies and selected endpoints enter default-deny mode, so these examples could block more egress than intended. I added `egress: - toEntities: all` before the specific deny rules.
- Two Hubble commands combined `--namespace` with pod-specific filters (`--pod` or `--from-pod`). The Hubble CLI marks those filters as conflicting. I removed the redundant `--namespace` flag because the pod filters already include the namespace prefix.
- The Hubble JSON analysis snippet tried to read a destination port from `flow.destination.port`, but Hubble exposes L4 ports under `flow.l4.TCP`, `flow.l4.UDP`, or `flow.l4.SCTP`. I changed the snippet to read `destination_port` from the L4 protocol object.

## Review Notes
- The examples assume pod names or prefixes such as `target-service` exist in the `default` namespace. In a real cluster, users may need to use the actual pod name, a deployment exec target such as `deployment/target-service`, or labels depending on their workload layout.
- Hubble flag availability can vary with older Hubble CLI versions, but the reviewed flags are present in the current official Cilium/Hubble CLI help.
