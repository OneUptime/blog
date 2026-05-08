# Validation Summary: Zero Trust Egress Control with Calico Egress Gateway Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Enterprise and Calico Cloud
- Kubernetes
- Calico GlobalNetworkPolicy
- Calico EgressGatewayPolicy
- calicoctl
- kubectl
- Prometheus metrics

## Sources Consulted
- Calico Enterprise EgressGatewayPolicy resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/egressgatewaypolicy
- Calico egress gateways use case documentation: https://docs.tigera.io/use-cases/egress-gateways
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl apply reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Enterprise policy metrics documentation: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/policy-metrics
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands

## Issues Found
- The post described a `GlobalNetworkPolicy` as an Egress Gateway Policy. I kept the network policy for allow-list style egress control, renamed it to `zero-trust-egress-control`, and added a separate `EgressGatewayPolicy` resource with the correct `kind`, `spec.rules`, destination `cidr`, gateway selectors, and `gatewayPreference` fields.
- The prerequisites implied Calico open source v3.26+ was sufficient. Calico Open Source does not support egress gateways, so I changed the prerequisite to Calico Enterprise or Calico Cloud with Calico CNI and egress gateway support enabled.
- The original policy allowed only UDP DNS on port 53. DNS can require TCP as well, so I added an equivalent TCP port 53 rule.
- The implementation did not bind the EgressGatewayPolicy to workloads. I added the required namespace annotation using `egress.projectcalico.org/egressGatewayPolicy`.
- The verification command queried `globalnetworkpolicies` for the original resource only. I changed it to verify both the `GlobalNetworkPolicy` and the `EgressGatewayPolicy`.
- The metrics example used a non-existent `felix_denied` metric on `localhost:9091`. Calico Enterprise policy metrics expose denied packet counters as `calico_denied_packets` on the policy metrics endpoint, commonly port `9081`, so I corrected the metric command.
- The architecture diagram showed EgressGatewayPolicy allowing or denying traffic. EgressGatewayPolicy selects gateway routing; network policy performs allow/deny enforcement. I updated the diagram labels accordingly.

## Review Notes
The guide remains an example and assumes an existing egress gateway deployment with labels matching `egress-code == 'red'` in the selected namespace. In a future expansion, the post could include the egress gateway deployment and IP pool resources, but those additions were outside this validation pass.
