# Validation Summary: How to Set Up EC2 Instances with IPv6 Addresses

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon EC2
- Amazon VPC
- IPv6 and dual-stack networking
- AWS CLI
- Security groups and network ACLs
- Internet gateways and egress-only internet gateways
- Terraform AWS provider

## Sources Consulted
- AWS EC2 User Guide: Amazon EC2 instance IP addressing - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-instance-addressing.html
- AWS EC2 User Guide: Manage the IPv6 addresses for your EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/working-with-ipv6-addresses.html
- AWS EC2 User Guide: Reference for Amazon EC2 instance configuration parameters - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-launch-parameters.html
- Amazon VPC User Guide: VPC CIDR blocks - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html
- Amazon VPC User Guide: Add IPv6 support for your VPC - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-migrate-ipv6-add.html
- AWS CLI Command Reference: associate-vpc-cidr-block - https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-vpc-cidr-block.html
- AWS CLI Command Reference: associate-subnet-cidr-block - https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-subnet-cidr-block.html
- AWS CLI Command Reference: modify-subnet-attribute - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-subnet-attribute.html
- AWS CLI Command Reference: run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: authorize-security-group-ingress - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI Command Reference: create-route - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS CLI Command Reference: create-egress-only-internet-gateway - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-egress-only-internet-gateway.html
- AWS blog: Introducing IPv6-only subnets and EC2 instances - https://aws.amazon.com/blogs/networking-and-content-delivery/introducing-ipv6-only-subnets-and-ec2-instances/
- Terraform Registry: aws_subnet resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- Terraform Registry: aws_instance resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform Registry: aws_route resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route

## Issues Found
- The overview incorrectly stated that AWS has no private IPv6 concept and implied all IPv6 addresses are publicly routable. AWS documents both public and private IPv6 address attributes. I updated the text to distinguish public IPv6 from private IPv6 ranges and to keep the security guidance focused on routing, security groups, and NACLs.
- The first `run-instances` example mixed top-level subnet/security-group selection with a `--network-interfaces` block for a simple single-interface launch. I changed it to the documented top-level `--ipv6-address-count 1` form with top-level subnet and security group options.
- The specific IPv6 launch example used a `--network-interfaces` shorthand form while also demonstrating a simple single-interface launch. I changed it to the documented top-level `--ipv6-addresses Ipv6Address=...` form with top-level subnet and security group options.
- The Terraform example defined a route table with IPv4 and IPv6 default routes but did not associate it with the subnet, so the advertised public subnet routing might not apply. I added an `aws_route_table_association`.
- The IPv6-only instance section implied that setting `AssociatePublicIpAddress=false` on the network interface created an instance with no IPv4 address. That only controls public IPv4 assignment; an IPv6-only instance must launch in an IPv6-only subnet, and EC2 requires a Nitro-based instance type. I updated the explanation and CLI example accordingly.
- The metadata note did not mention the IPv6 IMDS endpoint. I updated it to identify `fd00:ec2::254` and kept the documented `HttpProtocolIpv6=enabled` metadata option.

## Review Notes
The guide is technically relevant and current after the fixes. The security group examples allow SSH from `::/0`; this is syntactically valid but broad for production, so a future editorial pass could recommend limiting SSH to trusted IPv6 ranges.
