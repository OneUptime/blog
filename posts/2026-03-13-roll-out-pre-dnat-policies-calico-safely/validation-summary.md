# Validation Summary: How to Roll Out Pre-DNAT Policies for Calico Host Traffic Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (GlobalNetworkPolicy, pre-DNAT policies, HostEndpoints)
- Kubernetes (NodePort, LoadBalancer services)
- `calicoctl` CLI
- YAML configuration
- Mermaid diagrams

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Host Endpoints documentation: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico Pre-DNAT policy guide: https://docs.tigera.io/calico/latest/network-policy/hosts/protect-hosts
- `calicoctl` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/

## Issues Found
No technical issues found.

The post's technical claims are all consistent with official Calico documentation:
- `preDNAT: true` is a valid GlobalNetworkPolicy field that causes policy evaluation before DNAT translation.
- `applyOnForward: true` is correctly included — it is required by Calico whenever `preDNAT: true` is set.
- Only `Ingress` is included in `types`, which is correct because pre-DNAT policies do not support egress rules.
- API version `projectcalico.org/v3` is current.
- The `calicoctl apply` and `calicoctl get globalnetworkpolicies` invocations are valid.
- The selector `node == 'production-node'` correctly targets labels on HostEndpoints (which is appropriate for pre-DNAT policies operating on host traffic).
- The two-rule pattern (allow specific CIDRs, then deny remaining traffic to those ports) is a correct ordering for Calico's first-match evaluation.

## Review Notes
- The Calico v3.26+ prerequisite is conservative; pre-DNAT support has existed in Calico for many versions prior, but specifying a recent version is reasonable.
- Pre-DNAT policies require properly configured HostEndpoints on the target nodes; the prerequisites section mentions this, which is good.
- The introduction sentence "This guide covers roll out pre-DNAT policies in Calico..." is grammatically awkward (should be "rolling out") but this is a stylistic, not a technical, issue and per instructions only technical errors should be fixed.
- The mermaid diagram uses a literal newline inside a node label (`A[External Traffic\nto NodeIP:30000]`); rendering depends on the mermaid version, but the pattern is consistent with other posts in this series.
- The post correctly emphasizes testing and ensuring management traffic is allowed before applying deny rules — important operational guidance for pre-DNAT rollouts.
