# Validation Summary: How to Configure VPC Subnet CIDR Reservations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS VPC
- Amazon EC2 subnet CIDR reservations
- AWS CLI
- Terraform AWS Provider
- Amazon EKS / Amazon VPC CNI prefix delegation
- IPv4 CIDR planning

## Sources Consulted
- AWS VPC User Guide: Subnet CIDR reservations - https://docs.aws.amazon.com/vpc/latest/userguide/subnet-cidr-reservation.html
- AWS VPC User Guide: Subnet CIDR blocks and AWS-reserved subnet addresses - https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html
- AWS CLI Command Reference: create-subnet-cidr-reservation - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-subnet-cidr-reservation.html
- AWS CLI Command Reference: get-subnet-cidr-reservations - https://docs.aws.amazon.com/cli/latest/reference/ec2/get-subnet-cidr-reservations.html
- AWS CLI Command Reference: delete-subnet-cidr-reservation - https://docs.aws.amazon.com/cli/latest/reference/ec2/delete-subnet-cidr-reservation.html
- AWS CLI Command Reference: run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: create-network-interface - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-network-interface.html
- Amazon EC2 User Guide: Prefix delegation for network interfaces - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-prefix-eni.html
- Amazon EKS Best Practices Guide: Prefix Mode for Linux - https://docs.aws.amazon.com/eks/latest/best-practices/prefix-mode-linux.html
- Elastic Load Balancing User Guide: Create a Network Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/network/network-load-balancer-getting-started.html
- Terraform Registry: aws_ec2_subnet_cidr_reservation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_subnet_cidr_reservation
- OneUptime linked post: How to Set Up Shared VPCs with AWS Resource Access Manager - https://oneuptime.com/blog/post/2026-02-12-set-up-shared-vpcs-with-aws-resource-access-manager/view

## Issues Found
- The post described reservation modes as "explicitly" and "not at all." AWS supports `explicit` reservations for manually assigned individual IPs and `prefix` reservations for prefix delegation, so the description was corrected.
- The post stated that a `/24` subnet has 254 usable IPs. AWS reserves the first four and last IPv4 address in each subnet, so this was corrected to 251 usable IPs in AWS.
- Several examples used non-canonical CIDR starts such as `10.0.1.10/28` and `10.0.1.200/26`, then described address ranges that those CIDRs do not represent. These were changed to CIDR-aligned ranges such as `10.0.1.16/28` and `10.0.1.192/26`.
- The explicit IP assignment examples used addresses outside the corrected explicit reservation. They were updated to use `10.0.1.16` and `10.0.1.17`.
- The planning layout included ranges such as `.10-.25`, `.26-.41`, and `.100-.127`, which are not single CIDR-aligned reservation blocks. The layout was adjusted to CIDR-aligned ranges.
- The load balancer examples were narrowed to internal Network Load Balancers, where AWS supports specifying private IPv4 addresses in subnet mappings.
- The EKS shell example implied the `.192/26` calculation worked for any subnet CIDR. It now states that the example assumes `/24` subnets.
- The linked shared VPC post URL was checked and resolves to the intended OneUptime article.

## Review Notes
The Terraform resource arguments and AWS CLI command names/options are current and match the official documentation. The EKS prefix delegation guidance is accurate for VPC CNI prefix mode, with the caveat now noted that the sample shell calculation is for `/24` subnets.
