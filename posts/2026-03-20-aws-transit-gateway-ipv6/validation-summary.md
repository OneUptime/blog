# Validation Summary: How to Configure AWS Transit Gateway for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS Transit Gateway
- Amazon VPC
- IPv6
- AWS CLI
- Terraform AWS provider
- BGP route propagation for VPN / Direct Connect attachments

## Sources Consulted
- AWS CLI `create-transit-gateway`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-transit-gateway.html
- AWS CLI `create-transit-gateway-vpc-attachment`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-transit-gateway-vpc-attachment.html
- AWS CLI `create-transit-gateway-route`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-transit-gateway-route.html
- AWS CLI `enable-transit-gateway-route-table-propagation`: https://docs.aws.amazon.com/cli/latest/reference/ec2/enable-transit-gateway-route-table-propagation.html
- AWS CLI `search-transit-gateway-routes`: https://docs.aws.amazon.com/cli/latest/reference/ec2/search-transit-gateway-routes.html
- AWS CLI `create-route`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- Amazon VPC docs, Create a VPC attachment in AWS Transit Gateway: https://docs.aws.amazon.com/vpc/latest/tgw/create-vpc-attachment.html
- Amazon VPC docs, Amazon VPC attachments in AWS Transit Gateway: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html
- Amazon VPC docs, How AWS Transit Gateway works: https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html
- Amazon VPC docs, Transit gateway route tables in AWS Transit Gateway: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html
- AWS whitepaper, IPv6 on AWS: https://docs.aws.amazon.com/whitepapers/latest/ipv6-on-aws/amazon-vpc-connectivity-options-for-ipv6.html
- Terraform AWS provider `aws_ec2_transit_gateway`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ec2_transit_gateway.html.markdown
- Terraform AWS provider `aws_ec2_transit_gateway_vpc_attachment`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ec2_transit_gateway_vpc_attachment.html.markdown
- Terraform AWS provider `aws_ec2_transit_gateway_route`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ec2_transit_gateway_route.html.markdown

## Issues Found
- The AWS CLI example used the wrong transit gateway option key: `TransitGatewayAutoAcceptSharedAttachments`. The documented shorthand key is `AutoAcceptSharedAttachments`, so I corrected it.
- The VPC attachment example passed subnet IDs as one comma-delimited string. The AWS CLI documents `--subnet-ids` as a list argument, so I changed the example to use a Bash array and pass each subnet as a separate list item.
- The post implied a direct Transit Gateway “internet attachment” and used `$INTERNET_ATTACH_ID` in a TGW IPv6 default-route example. Transit Gateway routes traffic between supported attachments; it does not attach directly to the internet. I replaced that example with supported peer-VPC static routing and BGP-based propagation for on-premises attachments, and removed the direct-internet claim from the description and conclusion.
- The VPC route table section used `::/0` “for VPC-to-VPC routing,” which is misleading. For normal VPC-to-VPC and VPC-to-on-premises connectivity, you route specific remote IPv6 prefixes through the TGW. I replaced the examples with specific peer-VPC and on-premises IPv6 prefixes.
- The Terraform example referenced `aws_ec2_transit_gateway_vpc_attachment.internet.id`, which was undefined and modeled the same unsupported “internet attachment” concept. I replaced it with a valid second VPC attachment and routed that attachment’s IPv6 prefix through the TGW route table.
- The Terraform example would otherwise have mixed explicit static routing with default propagation on the same attachment. I disabled default propagation on the attachment used by the static-route example so the configuration matches the routing approach shown.
- The verification example used an invalid IPv6 literal (`2001:db8:vpc-b::instance`). I replaced it with a syntactically valid example IPv6 address and changed the TGW route lookup to an exact-match query for the example IPv6 prefix.

## Review Notes
- Transit Gateway supports IPv6 routing through dual-stack attachments and route tables, but a separate TGW-level IPv6 toggle is not required for basic VPC attachment routing. The important control for this post is `Ipv6Support=enable` on the VPC attachment.
- Transit gateway attachments cannot be created from IPv6-only subnets; the attachment subnets must also support IPv4. The post already frames the setup as dual-stack, which is the correct model.
- For VPN, Direct Connect gateway, and Connect attachments, AWS documentation distinguishes between static TGW routes and dynamically propagated routes learned over BGP. The edited post now reflects that distinction.
