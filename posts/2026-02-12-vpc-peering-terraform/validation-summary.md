# Validation Summary: How to Set Up VPC Peering with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS VPC Peering
- Amazon VPC route tables
- Amazon VPC security groups
- Amazon VPC DNS peering options
- AWS IAM
- AWS CLI
- Terraform
- HashiCorp AWS provider

## Sources Consulted
- AWS VPC Peering: What is VPC peering? https://docs.aws.amazon.com/vpc/latest/peering/modify-peering-connections.html
- AWS VPC Peering: How VPC peering connections work https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-basics.html
- AWS VPC Peering: Create a VPC peering connection https://docs.aws.amazon.com/vpc/latest/peering/create-vpc-peering-connection.html
- AWS VPC Peering: Accept or reject a VPC peering connection https://docs.aws.amazon.com/vpc/latest/peering/accept-vpc-peering-connection.html
- AWS VPC Peering: Update your route tables for a VPC peering connection https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-routing.html
- AWS VPC Peering: Update your security groups to reference peer security groups https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-security-groups.html
- AWS VPC Peering: Enable DNS resolution for a VPC peering connection https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-dns.html
- AWS CLI v2: describe-vpc-peering-connections https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpc-peering-connections.html
- AWS Service Authorization Reference: Amazon EC2 actions https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- Terraform AWS provider: aws_vpc_peering_connection https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_peering_connection
- Terraform AWS provider: aws_vpc_peering_connection_accepter https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_peering_connection_accepter
- Terraform AWS provider: aws_vpc_peering_connection_options https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_peering_connection_options

## Issues Found
- The DNS peering option was described too broadly as enabling DNS resolution across the peering connection. AWS documents this option as controlling how public DNS hostnames resolve across peering, so the wording was narrowed to public-hostname-to-private-IP behavior.
- The cross-account IAM role policy only allowed accepting and describing peering connections, but the Terraform example also tags the accepter-side resource and modifies peering DNS options. Added `ec2:CreateTags` and `ec2:ModifyVpcPeeringConnectionOptions`.
- The connectivity test suggested `ping` without noting that ICMP must be allowed. Updated the comment so the test is conditional on security groups and network ACLs allowing ICMP.

## Review Notes
The Terraform and AWS CLI snippets are syntactically consistent with the current provider and AWS CLI documentation. Terraform and AWS CLI binaries were not installed in this environment, so commands were verified against official documentation rather than executed locally.
