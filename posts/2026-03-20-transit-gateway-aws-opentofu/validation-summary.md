# Validation Summary: How to Deploy AWS Transit Gateway with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Transit Gateway
- AWS VPC routing
- AWS Resource Access Manager
- AWS provider resources for OpenTofu/Terraform
- HCL configuration

## Sources Consulted
- AWS provider documentation: `aws_ec2_transit_gateway` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway
- AWS provider documentation: `aws_ec2_transit_gateway_vpc_attachment` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_vpc_attachment
- AWS provider documentation: `aws_ec2_transit_gateway_route_table` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route_table
- AWS provider documentation: `aws_ec2_transit_gateway_route_table_association` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route_table_association
- AWS provider documentation: `aws_ec2_transit_gateway_route` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route
- AWS provider documentation: `aws_route` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route
- AWS provider documentation: `aws_ram_resource_share` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ram_resource_share
- AWS provider documentation: `aws_ram_resource_association` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ram_resource_association
- AWS provider documentation: `aws_ram_principal_association` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ram_principal_association
- AWS Transit Gateway documentation: How AWS Transit Gateway works - https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html
- AWS Transit Gateway documentation: Amazon VPC attachments - https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html
- AWS Resource Access Manager documentation: Sharing your AWS resources - https://docs.aws.amazon.com/ram/latest/userguide/getting-started-sharing.html
- AWS Prescriptive Guidance: Preserve routable IP space in multi-account VPC designs for non-workload subnets - https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/preserve-routable-ip-space-in-multi-account-vpc-designs-for-non-workload-subnets.html
- OpenTofu language documentation: `count` meta-argument - https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu language documentation: `for_each` meta-argument - https://opentofu.org/docs/language/meta-arguments/for_each/
- RFC 1918: Address Allocation for Private Internets - https://www.rfc-editor.org/rfc/rfc1918

## Issues Found
- The Transit Gateway comment said `auto_accept_shared_attachments` auto-accepts attachments from the same account. The setting applies to shared attachment requests, especially cross-account attachment requests for a shared Transit Gateway. Updated the comment to avoid the same-account implication.
- The route table example disabled default association and propagation but did not associate the shared-services VPC attachment with any Transit Gateway route table. With explicit TGW routing, traffic entering from the shared-services attachment needs an associated route table. Added a shared route table, associated the shared attachment, and added routes back to production and development CIDRs.
- The VPC route table section only showed the production VPC route. AWS VPC attachment routing requires the relevant source and return-path subnet route tables to point traffic to the Transit Gateway. Added development and shared VPC route examples so the shown production/development-to-shared design has routes on all participating VPC sides.
- The `10.0.0.0/8` VPC route comment described the destination as all RFC1918 addresses. RFC1918 also includes `172.16.0.0/12` and `192.168.0.0/16`. Updated the wording to describe it as a summary route for 10.x private VPC CIDRs.

## Review Notes
The remaining resource names and argument names match current AWS provider documentation. The examples assume the participating VPC CIDRs fit under `10.0.0.0/8`; in production, exact VPC CIDRs or managed prefix lists may be preferable to broad summary routes. Cross-account RAM sharing behavior depends on AWS RAM integration with AWS Organizations; shares outside the organization, or shares without Organizations integration, may require acceptance in the receiving account.
