# Validation Summary: How to Create AWS Client VPN Endpoints with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Client VPN
- Amazon VPC
- Amazon Route 53 Resolver / VPC DNS
- Amazon CloudWatch Logs
- AWS Directory Service authentication

## Sources Consulted
- Terraform Registry: `aws_ec2_client_vpn_endpoint` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_endpoint
- Terraform Registry: `aws_ec2_client_vpn_network_association` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_network_association
- Terraform Registry: `aws_ec2_client_vpn_authorization_rule` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_authorization_rule
- Terraform AWS Provider source: `vpnclient_authorization_rule.go` - https://github.com/hashicorp/terraform-provider-aws/blob/main/internal/service/ec2/vpnclient_authorization_rule.go
- AWS Client VPN Administrator Guide: Create an AWS Client VPN endpoint - https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-endpoint-create.html
- AWS Client VPN Administrator Guide: AWS Client VPN target networks - https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-target.html
- AWS Client VPN Administrator Guide: AWS Client VPN routes - https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-routes.html
- AWS Client VPN Administrator Guide: AWS Client VPN authorization rules - https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-rules.html
- Amazon VPC User Guide: Understanding Amazon DNS - https://docs.aws.amazon.com/vpc/latest/userguide/AmazonDNS-concepts.html
- OpenTofu docs: `cidrhost` function - https://opentofu.org/docs/v1.8/language/functions/cidrhost/
- OpenTofu docs: `tofu init` - https://opentofu.org/docs/cli/init/
- OpenTofu docs: `tofu plan` - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu docs: `tofu apply` - https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The DNS example hardcoded `10.0.0.2` as the VPC resolver. I replaced it with `cidrhost(var.vpc_cidr, 2)` because AmazonProvidedDNS is the primary VPC CIDR plus two, so `10.0.0.2` is only correct for some VPCs.
- The split-tunnel comment said it would route only VPC traffic through the VPN. I corrected it to match AWS behavior: split tunnel sends only the routes in the Client VPN route table through the VPN.
- The subnet association section omitted the AWS requirement that multiple target subnets be in different Availability Zones. I updated the text to state that requirement explicitly.
- The authorization rule example incorrectly combined a broad `authorize_all_groups = true` VPC rule with a supposedly restrictive DB subnet rule. AWS Client VPN authorization rules grant access rather than restrict it, so that pattern would not segment access as described.
- The group-scoped authorization rule also set `authorize_all_groups = false` alongside `access_group_id`. The provider schema treats those arguments as mutually exclusive, so I removed that field and converted the DB example into a commented alternative to the all-users rule.

## Review Notes
- The post is technically correct after the fixes. For local VPC access, associating a target subnet automatically creates the VPC local route; for peered VPCs, on-premises networks, or internet access, additional `aws_ec2_client_vpn_route` resources would still be required.
- OpenTofu was not installed in this workspace, so command syntax was verified against official OpenTofu documentation rather than local `tofu --help` output.
