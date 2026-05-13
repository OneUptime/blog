# Validation Summary: How to Configure Calico Egress Gateway Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Enterprise / Calico Cloud
- Kubernetes
- Calico EgressGatewayPolicy resources
- calicoctl
- kubectl
- tcpdump

## Sources Consulted
- Calico Enterprise EgressGatewayPolicy resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/egressgatewaypolicy
- Calico Enterprise on-premises egress gateway guide: https://docs.tigera.io/calico-enterprise/latest/networking/egress/egress-gateway-on-prem
- Calico Enterprise calicoctl user reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/overview
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy

## Issues Found
- The core configuration used `kind: GlobalNetworkPolicy`, which is a Calico network policy resource, not an egress gateway policy. Changed it to `kind: EgressGatewayPolicy` with a valid `spec.rules` structure.
- The original policy example used ingress and egress allow rules, implying that egress gateway policies directly allow or deny traffic. Updated the wording and architecture to reflect that EgressGatewayPolicy selects gateways or local routing by destination; Calico network policy handles allow/deny enforcement.
- The prerequisites stated generic Calico v3.26+. Updated this to Calico Enterprise or Calico Cloud with egress gateway support enabled, matching the documented EgressGatewayPolicy feature.
- The implementation verified `globalnetworkpolicies`, which would not verify an EgressGatewayPolicy. Changed the command to retrieve the `egressgatewaypolicy` resource and added the required namespace annotation `egress.projectcalico.org/egressGatewayPolicy`.
- The verification commands checked a non-matching metric name and Felix deny logs, which are not a reliable verification path for egress gateway routing. Replaced them with annotation verification and an external `tcpdump` check of the egress gateway source IP, matching the official verification guidance.

## Review Notes
The guide now covers the EgressGatewayPolicy resource accurately, but it still assumes that egress gateway pods and matching labels already exist. A future expansion could include the separate gateway deployment and IP pool setup steps.
