# Validation Summary: How to Set Up a Site-to-Site VPN Connection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Site-to-Site VPN
- AWS Virtual Private Gateway
- AWS Customer Gateway
- AWS EC2 CLI
- AWS CloudFormation
- IPsec and IKEv2
- strongSwan
- BGP and static VPN routing

## Sources Consulted
- AWS Site-to-Site VPN: How AWS Site-to-Site VPN works: https://docs.aws.amazon.com/vpn/latest/s2svpn/how_it_works.html
- AWS Site-to-Site VPN: Get started with AWS Site-to-Site VPN: https://docs.aws.amazon.com/vpn/latest/s2svpn/SetUpVPNConnections.html
- AWS Site-to-Site VPN: Static and dynamic routing: https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-static-dynamic.html
- AWS Site-to-Site VPN: Route tables and route priority: https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-route-priority.html
- AWS Site-to-Site VPN: Tunnel options: https://docs.aws.amazon.com/vpn/latest/s2svpn/VPNTunnels.html
- AWS Site-to-Site VPN: Quotas: https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-limits.html
- AWS Site-to-Site VPN: Static and dynamic configuration files: https://docs.aws.amazon.com/vpn/latest/s2svpn/example-configuration-files.html
- AWS CLI `create-customer-gateway`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-customer-gateway.html
- AWS CLI `create-vpn-gateway`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpn-gateway.html
- AWS CLI `create-vpn-connection`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpn-connection.html
- AWS CloudFormation `AWS::EC2::VPNConnection`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpnconnection.html
- AWS CloudFormation `AWS::EC2::VPNConnectionRoute`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpnconnectionroute.html
- strongSwan IPsec protocol documentation: https://docs.strongswan.org/docs/latest/howtos/ipsecProtocol.html
- strongSwan FAQ on ESP proposals: https://docs.strongswan.org/docs/latest/support/faq.html

## Issues Found
- The customer gateway CLI example used `--public-ip`, which the current AWS CLI marks as deprecated. Changed it to `--ip-address`, the current option for the customer gateway outside interface address.
- The configuration download section described the `describe-vpn-connections` output as router-specific. That command returns generic XML configuration details; vendor-specific sample configuration files are provided through the console or `get-vpn-connection-device-sample-configuration`. Updated the wording and command comment.
- The strongSwan example used `authby=secret`. Updated it to the clearer current PSK authentication form, `authby=psk`.
- The route table section said static routing requires manually adding VPC route table routes even after enabling route propagation. AWS documentation states static VPN routes are propagated when route propagation is enabled and the VPN is `UP`; manual route entries are needed when route propagation is not enabled. Updated the paragraph to match AWS behavior.
- The CloudFormation VPN connection did not explicitly depend on the VPC gateway attachment. Added `DependsOn: VpnGatewayAttachment` so stack creation waits for the virtual private gateway attachment before creating the VPN connection.
- The performance section did not mention that ECMP for higher aggregate VPN bandwidth requires transit gateway VPN connections with dynamic routing, and it omitted current Large Bandwidth Tunnel limits. Updated the wording to include those constraints.

## Review Notes
The tutorial remains focused on a virtual private gateway setup, while mentioning transit gateway where relevant for ECMP and Large Bandwidth Tunnels. The strongSwan snippet is still a generic example; production deployments should use the AWS-generated parameters for the specific VPN connection and customer gateway device.
