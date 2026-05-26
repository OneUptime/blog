# Validation Summary: How to Create EC2 with Multiple Network Interfaces in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon EC2
- Elastic Network Interfaces
- Amazon VPC networking
- Amazon Linux network configuration

## Sources Consulted
- AWS EC2 User Guide: Elastic network interfaces: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-eni.html
- AWS EC2 User Guide: Maximum IP addresses per network interface: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AvailableIpPerENI.html
- AWS EC2 Instance Types Guide: General purpose instance network specifications: https://docs.aws.amazon.com/ec2/latest/instancetypes/gp.html
- AWS EC2 Instance Types Guide: Compute optimized instance network specifications: https://docs.aws.amazon.com/ec2/latest/instancetypes/co.html
- Terraform AWS Provider documentation: aws_network_interface: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_interface
- Terraform AWS Provider documentation: aws_network_interface_attachment: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_interface_attachment
- Terraform AWS Provider documentation: aws_instance: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The examples used the deprecated `aws_instance.network_interface` block for primary and secondary ENIs. Updated the examples to use `primary_network_interface` for the primary ENI and `aws_network_interface_attachment` for additional ENIs, matching current Terraform AWS Provider guidance.
- The basic public subnet example lacked an internet gateway, public route table, and public IPv4 assignment setting, so the "public" web interface would not be reachable as described. Added the required public subnet routing resources and enabled `map_public_ip_on_launch`.
- The AMI data source was referenced but not shown in the main example. Added an Amazon Linux 2023 AMI data source.
- The OS routing snippet used `/etc/sysconfig/network-scripts/ifcfg-eth1`, which is not appropriate for Amazon Linux 2023. Updated the snippet to configure `eth1` with `nmcli`.
- The floating ENI example used `create_before_destroy` while describing accidental destruction protection. Replaced it with `prevent_destroy`, which matches the stated intent.
- The explicit multi-IP example set both `private_ips` and `private_ips_count = 0`. Removed `private_ips_count` from the explicit IP example to avoid misleading configuration.
- The reusable module used a dynamic deprecated `network_interface` block. Updated it to use `primary_network_interface` plus `aws_network_interface_attachment` resources for secondary ENIs.

## Review Notes
Terraform is not installed in this workspace, so I could not run `terraform fmt` or `terraform validate` locally. The corrected snippets were reviewed against the current AWS Provider resource documentation and AWS EC2 networking documentation.
