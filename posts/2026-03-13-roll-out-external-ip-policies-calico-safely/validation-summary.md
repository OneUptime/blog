# Validation Summary: How to Roll Out External IP Policies in Calico Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+)
- Kubernetes
- `projectcalico.org/v3` NetworkPolicy API
- `calicoctl` CLI
- `kubectl` CLI

## Sources Consulted
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico selector syntax: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selector
- calicoctl command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico entity rules (source/destination): https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#entityrule

## Issues Found
No technical issues found. The YAML manifest is valid against the `projectcalico.org/v3` NetworkPolicy schema:
- `apiVersion`, `kind`, `metadata.name`, `metadata.namespace` are correct (NetworkPolicy is a namespaced Calico resource).
- `spec.order`, `spec.selector` with `all()`, `spec.ingress[].action: Allow`, `spec.ingress[].source.selector`, `spec.egress[].action`, `spec.egress[].protocol: UDP`, `spec.egress[].destination.ports`, and `spec.types: [Ingress, Egress]` all match the documented schema.
- The `calicoctl apply -f`, `calicoctl get networkpolicies -n <ns> -o wide`, and `kubectl exec` commands are syntactically correct.

## Review Notes
- The post title references "External IP Policies" but the example policy does not specifically demonstrate matching external IPs (e.g., using `nets`/`notNets` in `source`/`destination` entity rules). This is a scope/content gap rather than a technical inaccuracy, so no edit was made.
- Several sentences contain awkward phrasing such as "Roll Roll Out External IP Policies" and "how to roll Roll Out External IP Policies effectively." These are stylistic/grammatical issues, not technical errors, and were left unchanged per review guidelines.
- The post claims to describe a "phased rollout strategy" (per the description) but does not actually present phased rollout steps. Not a technical inaccuracy in the code, but worth improving in a future revision.
- Calico v3.26+ is a reasonable baseline; the resource schema shown is stable across recent v3 releases.
