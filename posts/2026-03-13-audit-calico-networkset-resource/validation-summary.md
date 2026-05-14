# Validation Summary: Audit Calico NetworkSet Resources

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico NetworkSet and GlobalNetworkSet resources
- Calico NetworkPolicy and GlobalNetworkPolicy selectors
- calicoctl
- Python standard library json, re, datetime, and ipaddress modules

## Sources Consulted
- Calico NetworkSet resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkset
- Calico GlobalNetworkSet resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset
- Calico GlobalNetworkPolicy resource documentation, including EntityRule selector semantics: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico selector syntax documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy#selector
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes annotations documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/
- Python ipaddress module documentation: https://docs.python.org/3/library/ipaddress.html

## Issues Found
- The unreferenced NetworkSet script checked only GlobalNetworkPolicies and used a broad substring search for label keys and values. This could miss GlobalNetworkSets referenced by namespaced NetworkPolicies that use `namespaceSelector: global()`, and it could produce false positives when unrelated selectors contained the same substrings. I updated the example to gather GlobalNetworkSets, GlobalNetworkPolicies, and NetworkPolicies, then conservatively match simple Calico selector expressions against GlobalNetworkSet labels while respecting the `global()` namespace selector requirement for namespaced NetworkPolicies.
- The policy-to-NetworkSet alignment example claimed to verify matching labels but only printed selector strings. I changed it to compare simple `key == "value"` selectors from GlobalNetworkPolicy rules with labels found on GlobalNetworkSets and emit OK/WARN results.

## Review Notes
- The updated selector checks intentionally cover common equality and set-membership selector patterns only. Full Calico selector evaluation can include boolean operators, negation, `has()`, substring operators, and namespace scoping, so production audits should treat these snippets as conservative audit helpers rather than a complete policy compiler.
- The post uses a custom `last-updated` annotation for freshness checks. That is technically valid because Kubernetes annotations are arbitrary string key/value metadata, but Calico does not maintain that annotation automatically; the update pipeline must set it.
