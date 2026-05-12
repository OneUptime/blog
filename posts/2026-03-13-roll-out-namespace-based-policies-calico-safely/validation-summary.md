# Validation Summary: How to Roll Out Namespace-Based Policies in Calico Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+)
- Kubernetes
- Calico GlobalNetworkPolicy (projectcalico.org/v3)
- Calico NetworkPolicy (projectcalico.org/v3)
- kubectl / calicoctl
- Kubernetes namespace labels (including `kubernetes.io/metadata.name`)

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico namespace policy rules: https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy
- Kubernetes namespaces (immutable `kubernetes.io/metadata.name` label, GA in 1.22): https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/

## Issues Found
No technical issues found.

Items specifically verified:
- `apiVersion: projectcalico.org/v3` is the correct, current API version for both `GlobalNetworkPolicy` and `NetworkPolicy`.
- `namespaceSelector` on `GlobalNetworkPolicy` can match arbitrary custom labels (e.g., `calico-policy == 'enabled'`), not just predefined ones — the Calico docs explicitly support this.
- `selector: all()` is valid Calico selector syntax for "match all endpoints in scope".
- `order` is a float; lower values are evaluated first, so `order: 100` (NetworkPolicy) is correctly more specific than `order: 500` (GlobalNetworkPolicy).
- `kubernetes.io/metadata.name` is a standard, automatic, immutable label on namespaces (stable since Kubernetes 1.22).
- The DNS egress rule in Step 2 — `protocol: UDP` is at the rule level (sibling of `action` and `destination`), while `ports: [53]` is correctly nested under `destination`. Indentation is valid.
- `kind: NetworkPolicy` under `projectcalico.org/v3` is Calico's namespaced NetworkPolicy resource (distinct from `networking.k8s.io/v1` NetworkPolicy), and the `selector`, `ingress`, `egress`, `types` fields are correctly used.
- The `kubectl label namespace <name> <key>=<value>` syntax is correct.

## Review Notes
- The staging namespace is labeled in both Step 1 and Step 3. This is a minor stylistic duplication, not a technical error, so it was left unchanged.
- Calico v3.26+ as a prerequisite is reasonable; the features used here (namespaceSelector on GlobalNetworkPolicy, custom label matching) have been supported well before v3.26, so the post should remain valid for newer Calico versions (v3.27, v3.28, v3.29, v3.30) as well.
- The `for` loop in Step 5 greps `kubectl get events` for `fail|error` — note that `kubectl get events` shows events for the namespace's resources, not network-policy enforcement decisions, so connectivity regressions caused by the policy may not surface as events. Operators may want to pair this with application-level health checks. Not a technical inaccuracy — just worth noting.
