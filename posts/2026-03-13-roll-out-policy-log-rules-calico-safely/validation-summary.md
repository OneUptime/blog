# Validation Summary: How to Roll Out Calico Policy Log Rules Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3 API)
- Kubernetes NetworkPolicy
- calicoctl CLI
- kubectl CLI
- YAML configuration

## Sources Consulted
- Calico v3 NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- calicoctl command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/
- Calico selector syntax (e.g. `all()`): https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selectors
- kubectl exec reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#exec

## Issues Found
No technical issues found. Verified:
- `apiVersion: projectcalico.org/v3` and `kind: NetworkPolicy` are valid.
- `spec.order`, `spec.selector: all()`, `spec.types: [Ingress, Egress]` are correct fields.
- Ingress rule structure with `action: Allow` and `source.selector` is valid.
- Egress rule structure with `action: Allow`, `protocol: UDP`, `destination.ports: [53]` is valid.
- `calicoctl apply -f` and `calicoctl get networkpolicies -n <ns> -o wide` are correct invocations.
- `kubectl exec -n <ns> <pod> -- curl ...` syntax is correct.

## Review Notes
- The post's title and framing reference "Policy Log Rules", but the example NetworkPolicy uses only `Allow` actions and does not demonstrate Calico's `Log` action (which is what would actually log matched packets via iptables LOG / nflog). The example is technically valid Calico, but does not illustrate the topic the title promises.
- The prose contains duplicated phrasing in the Introduction and Conclusion ("how to roll Roll Out..." / "Roll Roll Out..."). These are stylistic, not technical, so left unchanged per the review scope.
- Calico v3.26+ is a reasonable minimum; nothing in the YAML is version-restricted beyond that.
