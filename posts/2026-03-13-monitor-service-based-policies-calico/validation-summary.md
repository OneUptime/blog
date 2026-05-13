# Validation Summary: How to Monitor Service-Based Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3 NetworkPolicy)
- Kubernetes (Services, Endpoints)
- calicoctl CLI
- kubectl CLI
- Mermaid diagrams

## Sources Consulted
- [Calico NetworkPolicy reference (resources)](https://docs.tigera.io/calico/latest/reference/resources/networkpolicy) — confirmed ServiceMatch schema with `name` and `namespace` fields under `destination.services`, and the egress-rule restriction that no other selection criteria can be combined.
- [calicoctl get output formats](https://docs.tigera.io/calico/latest/reference/calicoctl/get) — confirmed `-o wide` is a supported output format.
- [Calico policy for Kubernetes services](https://docs.tigera.io/calico/latest/network-policy/services) — confirmed services-in-egress is a supported feature.

## Issues Found
No technical issues found.

- The YAML manifest (`apiVersion: projectcalico.org/v3`, `kind: NetworkPolicy`, `spec.egress[].destination.services.{name,namespace}`) matches the official ServiceMatch schema.
- `kubectl get service`, `kubectl get endpoints`, and `kubectl exec` invocations are syntactically correct and use standard flags (`-n`, `-o jsonpath`, `--max-time`).
- `calicoctl get networkpolicy`, `calicoctl get networkpolicies`, and the `-o wide` / `-o yaml` flags are valid per the calicoctl reference.
- The Mermaid `flowchart TD` diagram uses valid syntax (including `-.-x` for the dashed denied edge).

## Review Notes
- The Calico version floor (`v3.26+`) listed in Prerequisites is conservative; service-match in egress rules has been available since earlier 3.x releases (around v3.20/3.21). The stated requirement is not incorrect, just stricter than strictly necessary.
- There is a minor grammar issue in the Introduction ("techniques for monitor service-based Calico policies"); per the review scope (technical correctness only), no stylistic edits were made.
- `kubectl get endpoints` still works in current Kubernetes releases but the underlying Endpoints API is being phased out in favor of EndpointSlices. Future revisions could note `kubectl get endpointslices` as the modern equivalent.
- The post is light on actual "monitoring" content (metrics, dashboards, alerts) given its title — most commands shown are verification/troubleshooting rather than ongoing monitoring. This is a scope observation, not a technical inaccuracy.
