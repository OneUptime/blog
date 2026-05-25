# Validation Summary: How to Build a Shared Services VPC with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS VPC
- AWS Transit Gateway
- AWS VPC endpoints and AWS PrivateLink
- Amazon Route 53 Resolver
- AWS Resource Access Manager
- AWS NAT Gateway
- AWS CodeArtifact

## Sources Consulted
- HashiCorp Terraform AWS Provider: `aws_vpc_endpoint` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint
- HashiCorp Terraform AWS Provider: `aws_route53_resolver_endpoint` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_endpoint
- HashiCorp Terraform AWS Provider: `aws_ec2_transit_gateway_vpc_attachment` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_vpc_attachment
- HashiCorp Terraform AWS Provider: `aws_security_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS VPC documentation: Gateway endpoints: https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
- AWS VPC documentation: Access AWS services through AWS PrivateLink: https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-access-aws-services.html
- AWS whitepaper: Centralized access to VPC private endpoints: https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/centralized-access-to-vpc-private-endpoints.html
- AWS Transit Gateway documentation: How AWS Transit Gateway works: https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html
- AWS Transit Gateway documentation: Amazon VPC attachments: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html
- AWS Prescriptive Guidance: Centralized egress: https://docs.aws.amazon.com/prescriptive-guidance/latest/transitioning-to-multiple-aws-accounts/centralized-egress.html
- AWS CodeArtifact documentation: Connect a CodeArtifact repository to a public repository: https://docs.aws.amazon.com/codeartifact/latest/ug/external-connection.html
- AWS CodeArtifact documentation: View or modify a repository configuration: https://docs.aws.amazon.com/codeartifact/latest/ug/config-repos.html

## Issues Found
- The original wording implied all shared services could be made available through either Transit Gateway or VPC peering. Updated it to distinguish Transit Gateway from non-transitive VPC peering, because peering does not support transitive routing patterns such as centralized egress.
- The VPC foundation snippet referenced private route tables later but did not create route tables, route table associations, or an internet gateway for the public NAT subnets. Added the missing Terraform resources.
- The VPC endpoint section treated gateway endpoints as centralizable for connected VPCs. Added the AWS limitation that S3 and DynamoDB gateway endpoints are attached to route tables in the endpoint VPC and are not reachable through VPC peering or Transit Gateway.
- The centralized interface endpoint section omitted the DNS requirement for spoke VPCs. Added a note that connected VPCs need centralized DNS, such as Route 53 Resolver forwarding or custom private hosted zones, to use standard AWS service names with centralized interface endpoints.
- The Route 53 Resolver examples referenced `aws_security_group.dns` without defining it. Added a minimal DNS security group allowing TCP and UDP port 53 from internal CIDRs.
- The NAT section created NAT gateways but did not add a private default route for shared-services private subnets. Added `aws_route.private_default`.
- The centralized NAT wording implied spoke VPC egress would work automatically. Added the required routing caveats for spoke subnet route tables, Transit Gateway route tables, TGW attachment subnet route tables, and return routes.
- The Transit Gateway attachment section implied attaching the VPC was sufficient for spoke reachability. Updated the text to require route-table association, propagation, and VPC subnet routes.
- The CodeArtifact section said build systems would not need to reach the internet. Updated it to say they do not need to reach public registries directly, since CodeArtifact external connections fetch from public repositories on behalf of clients.

## Review Notes
Terraform CLI validation could not be run because `terraform` is not installed in the review environment. The snippets are still partial examples and depend on caller-provided variables, CIDR choices, security policies, and Transit Gateway route-table resources.
