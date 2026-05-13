# Validation Summary: How to Migrate Existing Rules to ICMP and Ping Rules in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico NetworkPolicy and GlobalNetworkPolicy
- Kubernetes NetworkPolicy
- ICMP and ping policy rules
- calicoctl
- kubectl

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico ICMP/ping policy guide: https://docs.tigera.io/calico/latest/network-policy/policy-rules/icmp-ping
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico troubleshooting commands for policy inventory: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The replacement Calico policy did not include `protocol: ICMP`, so it was not specifically matching ICMP traffic. Added `protocol: ICMP` to the ingress rule.
- The replacement policy did not include ICMP match criteria for ping. Added `icmp.type: 8`, which matches ICMPv4 echo request traffic as shown in the official Calico ICMP/ping policy examples.
- The inventory step mentioned both Calico `NetworkPolicy` and `GlobalNetworkPolicy`, but only exported namespaced Calico network policies. Added `calicoctl get globalnetworkpolicies -o yaml` so global policies are captured before migration.

## Review Notes
- Kubernetes `NetworkPolicy` is defined for TCP, UDP, and optionally SCTP. ICMP behavior is undefined by the upstream Kubernetes API, so using Calico `projectcalico.org/v3` policy resources is the correct approach for explicit ICMP matching.
- The removal command deletes all Kubernetes network policies in the `production` namespace. It is syntactically valid, but in a real migration it should be scoped carefully to avoid deleting unrelated policies.
