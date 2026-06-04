# Validation Summary: How to Use CoreDNS Rewrite Plugin to Transform DNS Queries for External Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- CoreDNS
- CoreDNS rewrite plugin
- CoreDNS kubernetes, forward, cache, loop, reload, log, and prometheus plugins
- kubectl
- DNS record queries and responses

## Sources Consulted
- CoreDNS rewrite plugin documentation: https://coredns.io/plugins/rewrite/
- CoreDNS kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The "Conditional Rewriting Based on Query Type" example used invalid CoreDNS syntax (`rewrite name type A ...`). The rewrite plugin supports `type` as a field for changing request record types, not as a condition on name rewrites. I changed the section to request type rewriting and updated the examples to valid `rewrite type` rules.
- The answer rewrite example used invalid standalone `rewrite answer name ...` syntax and an invalid TTL rewrite without a match target. CoreDNS answer rewrites must be attached to a name rewrite, and TTL rewrites require a match type/name plus a TTL value. I replaced the snippet with a valid `rewrite stop { name ... answer name ... }` block and a valid `rewrite ttl regex ... 300` rule.
- The canary section claimed the snippet routed 10% of traffic to canary, but CoreDNS rewrite does not provide percentage-based traffic splitting by itself. I updated the wording and comment so the snippet describes deterministic canary routing, and kept the note explaining that true percentage-based canary routing requires service mesh features or weighted DNS responses.

## Review Notes
The remaining CoreDNS and Kubernetes examples are broadly aligned with current documentation. Some examples are illustrative and still require matching Kubernetes Services, namespaces, and cluster DNS settings to exist in a real cluster.
