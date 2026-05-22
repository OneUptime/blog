# Validation Summary: How to Use Dynamic Blocks for VPN Tunnel Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS Site-to-Site VPN
- AWS Virtual Private Gateway
- AWS Transit Gateway VPN attachments
- AWS CloudWatch alarms and VPN metrics

## Sources Consulted
- Terraform Registry: `aws_vpn_connection` resource, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection
- Terraform Registry: `aws_vpn_connection_route` resource, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection_route
- Terraform Registry: `aws_vpn_gateway_route_propagation` resource, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_gateway_route_propagation
- Terraform Registry: `aws_cloudwatch_metric_alarm` resource, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS Site-to-Site VPN User Guide: Create an AWS Site-to-Site VPN connection, https://docs.aws.amazon.com/vpn/latest/s2svpn/create-vpn-connection.html
- AWS Site-to-Site VPN User Guide: Monitor AWS Site-to-Site VPN tunnels using Amazon CloudWatch, https://docs.aws.amazon.com/vpn/latest/s2svpn/monitoring-cloudwatch-vpn.html

## Issues Found
- The description and opening paragraph said the tunnel configuration was managed with dynamic blocks. The AWS provider exposes tunnel settings as fixed `tunnel1_*` and `tunnel2_*` attributes rather than repeatable nested blocks, so I changed the wording to refer to Terraform expressions and `for_each`.
- The CloudWatch alarm example created one alarm per tunnel but only used the `VpnId` dimension. AWS documents `TunnelIpAddress` as the dimension for filtering a specific tunnel, so I added `TunnelIpAddress = each.value.ip` to the alarm dimensions.

## Review Notes
The examples use Terraform optional object attributes, which require a modern Terraform version. The post does not specify a Terraform version, but the syntax is current for modern Terraform releases.
