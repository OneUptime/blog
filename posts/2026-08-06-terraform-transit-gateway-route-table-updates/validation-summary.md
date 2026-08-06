# Validation Summary: Update Transit Gateway Route Tables with Terraform Safely

## Status

validated

## Post Type

Technical guide and network-operations runbook

## Technologies Covered

- AWS Transit Gateway
- AWS Transit Gateway route tables, routes, associations, and propagations
- HashiCorp Terraform
- HashiCorp AWS provider
- AWS CLI
- AWS Transit Gateway Flow Logs and VPC Flow Logs
- BGP, AWS Site-to-Site VPN, and AWS Direct Connect

## Sources Consulted

- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [Transit gateway route tables](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html)
- [AssociateTransitGatewayRouteTable API](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_AssociateTransitGatewayRouteTable.html)
- [DisassociateTransitGatewayRouteTable API](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DisassociateTransitGatewayRouteTable.html)
- [ReplaceTransitGatewayRoute API](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_ReplaceTransitGatewayRoute.html)
- [AWS CLI: search-transit-gateway-routes](https://docs.aws.amazon.com/cli/latest/reference/ec2/search-transit-gateway-routes.html)
- [AWS CLI: get-transit-gateway-route-table-propagations](https://docs.aws.amazon.com/cli/latest/reference/ec2/get-transit-gateway-route-table-propagations.html)
- [AWS CLI: get-transit-gateway-route-table-associations](https://docs.aws.amazon.com/cli/latest/reference/ec2/get-transit-gateway-route-table-associations.html)
- [AWS Transit Gateway Flow Logs](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-flow-logs.html)
- [VPC Flow Log records](https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html)
- [Terraform AWS provider: Transit Gateway route table association](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route_table_association)
- [Terraform AWS provider: Transit Gateway route](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route)
- [Terraform AWS provider: Transit Gateway route table propagation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route_table_propagation)
- [Terraform AWS provider: Transit Gateway VPC attachment](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_vpc_attachment)
- [Terraform AWS provider: VPN connection](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection)
- [Terraform AWS provider v5.2.0 release notes](https://github.com/hashicorp/terraform-provider-aws/releases/tag/v5.2.0)
- [Terraform lifecycle meta-argument](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle)
- [Terraform `depends_on` meta-argument](https://developer.hashicorp.com/terraform/language/meta-arguments/depends_on)
- [Terraform module refactoring with `moved` blocks](https://developer.hashicorp.com/terraform/language/modules/develop/refactoring)
- [Terraform import workflow](https://developer.hashicorp.com/terraform/language/import)
- [Terraform plan command](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [Terraform apply command](https://developer.hashicorp.com/terraform/cli/commands/apply)
- [Managing sensitive data in Terraform state and plan files](https://developer.hashicorp.com/terraform/language/manage-sensitive-data)
- [AWS Direct Connect routing policies and BGP communities](https://docs.aws.amazon.com/directconnect/latest/UserGuide/routing-and-bgp.html)
- [Redundant AWS Site-to-Site VPN connections for failover](https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-redundant-connection.html)

## Issues Found

- The `search-transit-gateway-routes` command filtered only for `active` routes, so it could not return the blackhole routes that the following validation checklist tells readers to inspect. Changed the filter to request both valid route states, `active` and `blackhole`.
- The cutover checklist grouped Transit Gateway and VPC Flow Logs together as sources of rejects. Transit Gateway Flow Logs expose route-related loss counters such as `packets-lost-no-route` and `packets-lost-blackhole`, while VPC Flow Logs expose `REJECT` actions. Updated the checklist to distinguish those signals.

## Review Notes

- The HCL snippet is syntactically valid and uses current AWS provider resource and attribute names. It is intentionally illustrative and assumes the referenced Transit Gateway, VPN, VPC attachments, and existing route-table configuration are defined elsewhere.
- Current AWS provider behavior marks the Transit Gateway route table ID and attachment ID on associations and propagations as replacement-triggering fields. Static-route destination, table ID, next-hop attachment, and blackhole changes are also replacement-triggering fields. The post correctly advises readers to trust the saved plan for their pinned provider version.
- `moved` blocks require Terraform 1.1 or later, configuration-driven `import` blocks require Terraform 1.5 or later, and `replace_existing_association` was added to the AWS provider in version 5.2.0. The post does not claim compatibility with older versions.
- All external documentation links in the post returned HTTP 200 during validation.
