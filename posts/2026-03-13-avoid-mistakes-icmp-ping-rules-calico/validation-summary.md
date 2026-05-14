# Validation Summary: Common Mistakes to Avoid with ICMP and Ping Rules

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico NetworkPolicy and GlobalNetworkPolicy
- Kubernetes
- ICMP and ping
- calicoctl
- kubectl
- YAML

## Sources Consulted
- Calico "Use ICMP/ping rules in policy" documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/icmp-ping
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- RFC 792, Internet Control Message Protocol: https://www.rfc-editor.org/rfc/rfc792

## Issues Found
- The policy-order command sorted on column 4, but Calico's documented namespaced `networkpolicy -o wide` output places `ORDER` before `SELECTOR`. Updated the command to use the documented singular resource name and sort on column 2.
- The bidirectional policy example did not specify `protocol: ICMP`, so it would allow all protocols matching the selectors rather than an ICMP ping rule. Added `protocol: ICMP` and `icmp.type: 8` to both rules.
- The bidirectional policy wording implied both directions are always required. Updated it to state that both source egress and destination ingress rules are needed when both directions are restricted by policy.

## Review Notes
The DNS egress snippet is syntactically valid Calico policy because TCP and UDP rules can match destination port 53. In production, DNS egress is often restricted further to the cluster DNS service or CoreDNS endpoints instead of allowing all destinations on port 53.
