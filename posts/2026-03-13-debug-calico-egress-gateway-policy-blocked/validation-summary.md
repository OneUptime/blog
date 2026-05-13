# Validation Summary: How to Debug Calico Egress Gateway Policies When Traffic Is Blocked

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Enterprise EgressGatewayPolicy
- Calico Enterprise egress gateways
- Kubernetes namespace annotations
- calicoctl
- kubectl
- Prometheus policy metrics

## Sources Consulted
- Calico Enterprise EgressGatewayPolicy resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/egressgatewaypolicy
- Calico Enterprise egress gateway configuration guide: https://docs.tigera.io/calico-enterprise/latest/networking/egress/egress-gateway-on-prem
- Calico Enterprise egress gateway troubleshooting guide: https://docs.tigera.io/calico-enterprise/latest/networking/egress/troubleshoot
- Calico Enterprise calicoctl get reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/get
- Calico Enterprise policy metrics reference: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/policy-metrics
- Calico Open Source GlobalNetworkPolicy reference, used to verify that the original manifest was a standard network policy rather than an egress gateway policy: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy

## Issues Found
- The post described Calico Egress Gateway Policies but used a `GlobalNetworkPolicy` manifest. Replaced the manifest with the documented `projectcalico.org/v3` `EgressGatewayPolicy` structure using `spec.rules`, `destination.cidr`, `gateway.namespaceSelector`, `gateway.selector`, and `gatewayPreference`.
- The prerequisites said "Calico v3.26+" even though `EgressGatewayPolicy` is a Calico Enterprise egress gateway feature, not a generic Calico Open Source network policy feature. Updated the prerequisite to require Calico Enterprise with egress gateway support enabled.
- The verification command listed `calicoctl get globalnetworkpolicies`, which would not verify an egress gateway policy. Updated it to `calicoctl get egressgatewaypolicies -o wide`, matching the Calico Enterprise calicoctl resource list.
- The implementation did not show how the egress gateway policy is attached to workloads. Added the documented namespace annotation `egress.projectcalico.org/egressGatewayPolicy`.
- The metrics command searched for `felix_denied`, which is not the documented Calico Enterprise policy deny metric. Updated it to query Prometheus for `calico_denied_packets`.
- The architecture diagram implied that an egress gateway policy directly allows or denies traffic. Updated the diagram to show gateway selection, local routing, and forwarding through the egress gateway; packet allow/deny decisions remain network policy behavior.

## Review Notes
The corrected post now focuses on egress gateway policy selection and debugging. Calico Enterprise egress gateway policy controls which gateway is used for destinations; separate Calico network policies still control allow/deny behavior for client pod egress and egress gateway pod egress.
