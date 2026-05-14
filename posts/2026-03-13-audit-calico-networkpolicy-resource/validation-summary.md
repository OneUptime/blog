# Validation Summary: Audit Calico NetworkPolicy Resources

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico NetworkPolicy
- Kubernetes NetworkPolicy behavior
- calicoctl
- kubectl
- Bash
- Python

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico default deny policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl user reference and resource aliases: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Kubernetes NetworkPolicy concept documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The unprotected pod audit script collected pod labels but only counted whether any NetworkPolicy existed in the namespace. I changed it to compare common Calico policy selectors against each pod's labels and to flag complex selectors for manual review, because Calico NetworkPolicy resources apply to endpoints selected by `spec.selector`.
- The overly permissive ingress check described "allow all traffic" when the code was specifically detecting ingress rules without a source restriction. I updated the wording and made the source test handle both missing and empty source objects.
- The PCI-DSS egress check treated any rule without `destination.nets` as broad, which incorrectly flags rules restricted by selectors or other destination fields. I changed it to flag rules with no destination restriction or explicit wildcard CIDRs.
- The default-deny check used a text grep, which could match unrelated names or table output. I changed it to inspect JSON and count policies whose metadata name is exactly `default-deny`.

## Review Notes
The selector evaluation script intentionally handles common Calico selector forms such as `all()`, `!all()`, equality, `has()`, `in {}`, and simple `&&` combinations. More complex Calico selector expressions are flagged for manual review rather than being treated as a match or non-match.
