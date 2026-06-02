# Validation Summary: How to Set Up AWS Site-to-Site VPN with BGP Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Site-to-Site VPN
- AWS Virtual Private Gateway
- AWS Customer Gateway
- AWS CLI
- BGP dynamic routing
- FRRouting
- StrongSwan
- Amazon CloudWatch VPN metrics and alarms
- VPC route propagation

## Sources Consulted
- AWS CLI Command Reference: create-customer-gateway - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-customer-gateway.html
- AWS CLI Command Reference: create-vpn-gateway - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpn-gateway.html
- AWS CLI Command Reference: create-vpn-connection - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpn-connection.html
- AWS CLI Command Reference: enable-vgw-route-propagation - https://docs.aws.amazon.com/cli/latest/reference/ec2/enable-vgw-route-propagation.html
- AWS Site-to-Site VPN: Customer gateway options - https://docs.aws.amazon.com/vpn/latest/s2svpn/cgw-options.html
- AWS Site-to-Site VPN: Configure tunnel options - https://docs.aws.amazon.com/vpn/latest/s2svpn/tunnel-configure.html
- AWS Site-to-Site VPN: Route tables and route priority - https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-route-priority.html
- AWS Site-to-Site VPN: Monitor VPN tunnels with CloudWatch - https://docs.aws.amazon.com/vpn/latest/s2svpn/monitoring-cloudwatch-vpn.html
- AWS Site-to-Site VPN: Customer gateway device requirements - https://docs.aws.amazon.com/vpn/latest/s2svpn/CGRequirements.html
- FRRouting BGP documentation - https://docs.frrouting.org/en/latest/bgp.html

## Issues Found
- The customer gateway example used `--public-ip`, which the AWS CLI now marks as deprecated. Changed it to `--ip-address`, the current parameter for the customer gateway device outside interface.
- The private ASN guidance only mentioned the 16-bit private range. Added the 32-bit private ASN range and noted that AWS CLI values above 2147483647 must use `--bgp-asn-extended`.
- The architecture section implied both VGW tunnels could be active for traffic at the same time. Clarified that both BGP sessions can be established, but a virtual private gateway selects one tunnel as the primary egress path and does not support ECMP across Site-to-Site VPN tunnels.
- The FRRouting example could fail to advertise or accept routes on default traditional FRR configurations because `bgp ebgp-requires-policy` requires explicit eBGP filters. Added `no bgp ebgp-requires-policy` to keep the simple example functional.
- The FRRouting `network` statements did not mention FRR's current import-check behavior. Added a note that the advertised prefixes must exist in the FRR routing table.
- The CloudWatch examples identified only the VPN ID for tunnel metrics. Added the `TunnelIpAddress` dimension so the examples target a specific tunnel, matching AWS VPN metric dimensions.

## Review Notes
- The AWS CLI is not installed in the local workspace, so CLI syntax was verified against official AWS CLI documentation rather than local `aws ... help` output.
- The Site-to-Site VPN setup is shown for a virtual private gateway. Transit gateway VPN attachments have additional capabilities, including ECMP, that are outside this post's current scope.
