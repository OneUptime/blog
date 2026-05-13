# Validation Summary: Configure Calico NetworkPolicy Resource

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico NetworkPolicy
- Kubernetes networking
- calicoctl
- YAML configuration
- Network policy tiers, selectors, rules, actions, and named ports

## Sources Consulted
- Calico Open Source NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source Tier resource reference: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico Open Source automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico Open Source calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply

## Issues Found
- The introduction described egress policies and named ports as additional capabilities beyond standard Kubernetes NetworkPolicy. Kubernetes NetworkPolicy also supports egress policy and named ports, so this was changed to highlight Calico-specific capabilities: ordered policy evaluation, explicit rule actions, action logging, and tiers.
- The first full NetworkPolicy YAML example had two `destination` keys in the DNS egress rule. YAML duplicate keys can cause the first value to be overwritten or rejected, so the `namespaceSelector` and `ports` fields were combined under a single `destination` block.
- The policy evaluation diagram ended with `Default: Allow` after no match in the default tier. Calico tier processing uses the tier default action when a tier applies but no rule takes action, so the diagram was corrected to say `Tier default action`.

## Review Notes
- The `calicoctl apply -f allow-http-ingress.yaml` command matches the official `calicoctl apply` syntax.
- The examples rely on Calico Open Source 3.32 documentation. The post does not pin a Calico version, so future Calico changes may require another review.
