# Validation Summary: How to Create AWS Site-to-Site VPN Connections with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- AWS Site-to-Site VPN
- AWS Virtual Private Gateway
- AWS Customer Gateway
- AWS provider resources for OpenTofu/Terraform
- BGP and static VPN routing

## Sources Consulted
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command docs: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS Site-to-Site VPN concepts: https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html
- AWS Site-to-Site VPN tunnel options: https://docs.aws.amazon.com/vpn/latest/s2svpn/tunnel-configure.html
- AWS Site-to-Site VPN workflow: https://docs.aws.amazon.com/vpn/latest/s2svpn/how_it_works.html
- AWS provider `aws_vpn_gateway`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpn_gateway.html.markdown
- AWS provider `aws_vpn_gateway_attachment`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpn_gateway_attachment.html.markdown
- AWS provider `aws_customer_gateway`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/customer_gateway.html.markdown
- AWS provider `aws_vpn_connection`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpn_connection.html.markdown
- AWS provider `aws_vpn_connection_route`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpn_connection_route.html.markdown
- AWS provider `aws_vpn_gateway_route_propagation`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpn_gateway_route_propagation.html.markdown

## Issues Found
- The introduction described a single IPsec tunnel, but AWS Site-to-Site VPN connections include two tunnels for high availability. Updated the wording to reflect the actual AWS behavior.
- The `aws_vpn_gateway` example set `vpc_id` while also creating a separate `aws_vpn_gateway_attachment`. The provider docs state that `vpc_id` already performs the attachment, so I removed `vpc_id` from the gateway resource to make the separate attachment resource correct.
- The `static_routes_only` comment said static routing was for policy-based VPN devices. AWS documentation says AWS Site-to-Site VPN uses route-based VPNs and the provider docs say static routes are for devices that do not support BGP, so I corrected the explanation.
- The static route snippet was presented without clarifying that it only applies when `static_routes_only = true`. I updated the snippet comment to make that requirement explicit.
- The `vpn_configuration` output claimed to provide a downloadable device configuration but only returned the VPN ID. I changed it to output `customer_gateway_configuration`, which is the provider's documented XML configuration attribute.

## Review Notes
- `tofu` was not installed in the local environment, so the CLI commands were verified against the official OpenTofu documentation rather than local `--help` output.
- AWS Virtual Private Gateway based Site-to-Site VPN supports IPv4 traffic only; IPv6 Site-to-Site VPN requires a transit gateway or Cloud WAN. The post does not claim IPv6 support, so no content change was required.
