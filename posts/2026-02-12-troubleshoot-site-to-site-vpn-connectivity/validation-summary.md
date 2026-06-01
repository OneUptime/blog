# Validation Summary: How to Troubleshoot Site-to-Site VPN Connectivity Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- AWS Site-to-Site VPN
- AWS CLI
- IPsec and IKE
- BGP
- Virtual Private Gateway
- Transit Gateway
- VPC route tables and route propagation
- Security groups and network ACLs
- VPC Flow Logs
- Amazon CloudWatch
- VPC Reachability Analyzer

## Sources Consulted
- AWS Site-to-Site VPN: How AWS Site-to-Site VPN works: https://docs.aws.amazon.com/vpn/latest/s2svpn/how_it_works.html
- AWS Site-to-Site VPN tunnel options: https://docs.aws.amazon.com/vpn/latest/s2svpn/VPNTunnels.html
- Configure tunnel options for AWS Site-to-Site VPN: https://docs.aws.amazon.com/vpn/latest/s2svpn/tunnel-configure.html
- Modify AWS Site-to-Site VPN tunnel options: https://docs.aws.amazon.com/vpn/latest/s2svpn/modify-vpn-tunnel-options.html
- AWS CLI modify-vpn-tunnel-options command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-vpn-tunnel-options.html
- Firewall rules for an AWS Site-to-Site VPN customer gateway device: https://docs.aws.amazon.com/vpn/latest/s2svpn/FirewallRules.html
- Static and dynamic routing in AWS Site-to-Site VPN: https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-static-dynamic.html
- Edit static routes for an AWS Site-to-Site VPN connection: https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-edit-static-routes.html
- Get started with AWS Site-to-Site VPN route propagation guidance: https://docs.aws.amazon.com/vpn/latest/s2svpn/SetUpVPNConnections.html
- Route tables and AWS Site-to-Site VPN route priority: https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-route-priority.html
- Monitor AWS Site-to-Site VPN tunnels using Amazon CloudWatch: https://docs.aws.amazon.com/vpn/latest/s2svpn/monitoring-cloudwatch-vpn.html
- AWS Site-to-Site VPN quotas: https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-limits.html
- VPC Reachability Analyzer documentation: https://docs.aws.amazon.com/vpc/latest/reachability/how-reachability-analyzer-works.html

## Issues Found
- Clarified the tunnel-down diagnosis. The post stated that both tunnels being down means an IKE/IPsec configuration issue. AWS troubleshooting also depends on endpoint reachability and firewall rules, so the text now includes customer gateway to AWS tunnel endpoint reachability.
- Scoped route propagation and static route commands to virtual private gateway VPN connections. AWS documents `enable-vgw-route-propagation` and `create-vpn-connection-route` in the virtual private gateway context, while Transit Gateway VPN routes are managed through transit gateway route tables.
- Updated the throughput checklist item. AWS standard VPN tunnels support up to 1.25 Gbps, but Large Bandwidth Tunnels on supported Transit Gateway or Cloud WAN attachments support up to 5 Gbps, so the original blanket limit was too broad.
- Updated the CloudWatch alarm example to include the `TunnelIpAddress` dimension. AWS documents `TunnelState` dimensions for `VpnId` and `TunnelIpAddress`; adding the tunnel IP makes the example match the stated goal of alerting when a specific tunnel goes down.

## Review Notes
The AWS CLI examples use current EC2 and CloudWatch command names and option names. The local environment does not have the AWS CLI installed, so command verification was performed against official AWS CLI and AWS service documentation rather than local `--help` output.
