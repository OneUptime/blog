# Validation Summary: How to Monitor Zero Trust Network Policy Impact in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+)
- Kubernetes Network Policy
- Calico `projectcalico.org/v3` GlobalNetworkPolicy and NetworkPolicy CRDs
- `calicoctl` and `kubectl`
- Zero Trust networking model / microsegmentation
- Mermaid diagrams

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico policy rules reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#entityrule
- Calico selector syntax: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selectors
- Calico get-started default-deny: https://docs.tigera.io/calico/latest/network-policy/policy-rules/policy-rules-overview
- Kubernetes kubelet ports reference (port 10250): https://kubernetes.io/docs/reference/networking/ports-and-protocols/
- IANA Service Name and Transport Protocol Port Number Registry (port 53 DNS)

## Issues Found
No technical issues found.

Verification details:
- `apiVersion: projectcalico.org/v3` is the correct, current API group/version for Calico CRDs.
- `GlobalNetworkPolicy` and `NetworkPolicy` are both valid resources.
- `order` semantics are correctly applied: lower numeric values are evaluated first, so the allow-system policy (order=1) is evaluated before the default deny (order=10000), which is the standard zero-trust layering pattern.
- A policy with `types: [Ingress, Egress]` and no matching rules denies all traffic of those types (Calico's implicit-deny behavior), which is correctly used here to implement default deny.
- `selector: all()` is valid Calico selector syntax that selects every endpoint.
- Action capitalization (`Allow`) matches Calico's required casing.
- Port 53 (DNS) and port 10250 (kubelet) are correctly identified.
- Label-selector expressions like `tier == 'api'` use Calico's documented selector grammar.
- The verification `kubectl exec ... curl --max-time 5` pattern correctly produces a non-zero exit on connection timeout / refusal, consistent with the expected behavior described.
- The Mermaid `flowchart TD` syntax with `\n` line breaks renders correctly on GitHub and the OneUptime blog renderer.

## Review Notes
- Title says "Monitor" but the body focuses primarily on implementing zero-trust policies plus a short verification section, with monitoring mentioned only briefly in the conclusion. The technical content is accurate; just noting that scope and title don't fully match.
- The introduction sentence "This guide covers monitor zero trust network policies" has a minor grammar issue (should be "monitoring"), but per instructions style/grammar fixes are out of scope for this review.
- The system-traffic policy applies `selector: all()` with a kubelet ingress allow on port 10250. Most application workloads do not listen on 10250, so this rule is effectively only meaningful on node-level host endpoints — readers operationalizing this should be aware. Not a correctness issue.
- For more recent Mermaid renderers, `<br/>` is preferred over `\n` for line breaks, but `\n` remains supported on GitHub-flavored Markdown.
