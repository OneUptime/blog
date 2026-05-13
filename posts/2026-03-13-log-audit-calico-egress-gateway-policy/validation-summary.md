# Validation Summary: How to Log and Audit Calico Egress Gateway Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico network policy
- Calico Enterprise / Calico Cloud egress gateways
- Kubernetes
- calicoctl
- Prometheus-style Felix metrics

## Sources Consulted
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico Enterprise egress gateway documentation: https://docs.tigera.io/calico-enterprise/latest/networking/egress/egress-gateway-on-prem
- Calico EgressGatewayPolicy resource documentation: https://docs.tigera.io/calico-cloud/reference/resources/egressgatewaypolicy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Enterprise policy metrics documentation: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/recommended-metrics

## Issues Found
- The post described logging and auditing egress gateway policy behavior, but the policy example used only `Allow` actions. Added Calico `Log` actions before the matching `Allow` actions and a final `Log` plus `Deny` rule so the example actually logs matched and denied egress traffic.
- The original example used a destination `selector` for permitted egress. Calico selectors match known endpoints and network sets, not arbitrary external destinations. Replaced this with a CIDR under `destination.nets`, which is the documented way to match IP destinations.
- The policy included an ingress rule even though the guide is about egress traffic. Removed the unrelated ingress rule and kept `types: Egress`.
- The prerequisite list implied generic Calico support for egress gateway routing. Clarified that egress gateway routing requires Calico Enterprise or Calico Cloud.
- The verification command searched for `felix_denied`, which is not the documented denied policy metric. Replaced it with `calico_denied_packets`.
- The log review command tailed `/var/log/calico/felix.log`, which is Felix process logging rather than the packet logs produced by policy `Log` actions. Replaced it with a kernel journal query for the default Calico packet log prefix.
- The `calicoctl get` example used a plural resource name. While calicoctl accepts pluralized resources, the documented form is `globalnetworkpolicy`, so the command was changed to match official examples.

## Review Notes
The corrected policy is an audit/enforcement policy for traffic that uses an egress gateway, not an `EgressGatewayPolicy` routing resource. In Calico Enterprise or Calico Cloud, an `EgressGatewayPolicy` or egress gateway annotations are still required separately to route selected workloads through gateway pods.
