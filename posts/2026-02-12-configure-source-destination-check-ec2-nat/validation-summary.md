# Validation Summary: How to Configure Source/Destination Check on EC2 for NAT Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2
- Amazon VPC
- NAT instances
- NAT Gateway
- AWS CLI
- Terraform AWS provider
- Linux IP forwarding
- iptables
- Security groups and route tables

## Sources Consulted
- AWS VPC User Guide: Enable private resources to communicate outside the VPC with NAT instances - https://docs.aws.amazon.com/vpc/latest/userguide/work-with-nat-instances.html
- AWS CLI Command Reference: modify-instance-attribute - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html
- AWS CLI Command Reference: describe-instance-attribute - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instance-attribute.html
- AWS CLI Command Reference: modify-network-interface-attribute - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-network-interface-attribute.html
- AWS CLI Command Reference: create-route - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS VPC User Guide: NAT gateway basics - https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-basics.html
- AWS VPC User Guide: Pricing for NAT gateways - https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html
- Terraform Registry: aws_instance resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform Registry: aws_route resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route
- Terraform Registry: aws_security_group resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
- The opening explanation said the instance would only "accept" matching traffic. AWS documents source/destination checks for traffic an instance sends or receives, so the wording was corrected to "send or receive."
- The list of intermediary use cases implied ordinary load balancers, traffic mirroring, and container networking always need source/destination check disabled. The wording was narrowed to transparent load balancers, inline monitoring appliances, and overlays where the EC2 instance forwards traffic for non-instance IPs.
- Several AWS placeholder IDs used non-hex strings or short IDs. They were changed to valid-looking placeholder EC2, AMI, subnet, security group, ENI, and route table IDs.
- The NAT setup commands installed `iptables-services` after using iptables and did not apply the persistent sysctl file or clear the default FORWARD chain. The commands were reordered and aligned with AWS's NAT instance setup guidance.
- The NAT setup assumed the primary interface was always `eth0`. A note was added to replace `eth0` with the instance's primary interface name when needed.
- The security group egress comment said HTTP and HTTPS outbound, but the command allowed all outbound traffic. The comment was corrected to match the command.
- The Terraform `user_data` repeated the same iptables ordering and persistence problems as the shell example. It was updated to install and start iptables services first, apply the sysctl file, clear the FORWARD chain, and then save rules.
- The NAT Gateway comparison said security was "NACLs only." This was clarified to "controlled by route tables and subnet NACLs" because NAT gateways do not support security groups but routing is also part of controlling use.
- The high availability script comment described a ping test, but the script only checks EC2 instance status. The comment was corrected.

## Review Notes
AWS CLI was not installed in the local environment, so CLI commands were verified against the current AWS CLI v2 online command reference instead of local `--help` output. NAT Gateway and EC2 instance costs vary by Region and can change; the post's approximate cost comparison remains directionally accurate, but future reviews should re-check pricing.
