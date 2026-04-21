# Validation Summary: How to Create Subnets with IPv4 CIDR Ranges Using Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform AWS provider
- AWS VPC
- AWS subnets
- IPv4 CIDR ranges
- AWS Availability Zones
- Amazon EKS subnet tagging
- AWS Load Balancer Controller subnet discovery

## Sources Consulted
- Terraform `cidrsubnet` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform `count` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Terraform splat expression documentation: https://developer.hashicorp.com/terraform/language/expressions/splat
- Terraform CLI `apply` command documentation: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform CLI `output` command documentation: https://developer.hashicorp.com/terraform/cli/commands/output
- Terraform AWS provider `aws_subnet` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- Terraform AWS provider `aws_availability_zones` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- AWS EC2 `DescribeAvailabilityZones` API documentation: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DescribeAvailabilityZones.html
- Amazon VPC Internet Gateway documentation: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- Amazon VPC route table examples: https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html
- Amazon EKS VPC and subnet requirements: https://docs.aws.amazon.com/eks/latest/userguide/network-reqs.html
- Amazon EKS Auto Mode subnet tagging: https://docs.aws.amazon.com/eks/latest/userguide/tag-subnets-auto.html
- AWS Load Balancer Controller subnet discovery documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.2/deploy/subnet_discovery/

## Issues Found
- The description claimed the post used `for_each` patterns, but the examples use `count`. Updated the description to say `count patterns`.
- The post implied that `map_public_ip_on_launch = true` is what makes a subnet public. AWS defines a public subnet by its route table route to an Internet Gateway, so the introduction now clarifies the distinction.
- The Availability Zones data source only filtered by state. Because the EC2 API can include Local Zones and Wavelength Zones, the snippet now filters `zone-type = availability-zone`.
- The `cidrsubnet()` reference used invalid HCL-style assignments such as `cidrsubnet(...) = "..."`. Converted those examples to HCL comments that show the expected return values.
- The conclusion said `Tier = "public"/"private"` tags are for load balancers and EKS auto-discovery. EKS and AWS Load Balancer Controller use `kubernetes.io/role/elb` and `kubernetes.io/role/internal-elb`, so the conclusion now distinguishes internal organization tags from required discovery tags.
- The conclusion said `cidrsubnet()` avoids hardcoded values, but the example still hardcodes the VPC CIDR. Updated the wording to say it avoids manual subnet calculation and repeated subnet CIDR literals.

## Review Notes
Terraform and OpenTofu were not installed in the local workspace, so I could not run `terraform validate` against a temporary configuration. The syntax and behavior were reviewed against official documentation. The examples still assume an existing `aws_vpc.main` and separate route table, Internet Gateway, and NAT configuration where true public/private routing is required.
