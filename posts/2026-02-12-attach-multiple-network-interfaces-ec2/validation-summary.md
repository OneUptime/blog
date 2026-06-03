# Validation Summary: How to Attach Multiple Network Interfaces to an EC2 Instance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS EC2 Elastic Network Interfaces
- AWS CLI for EC2 networking
- Linux policy-based routing with iproute2
- Amazon Linux 2 / RHEL network-scripts
- Ubuntu netplan
- Terraform AWS provider
- Elastic IP addresses
- VPC Flow Logs and CloudWatch

## Sources Consulted
- AWS EC2 User Guide: Elastic network interfaces - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-eni.html
- AWS EC2 User Guide: Maximum IP addresses per network interface - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AvailableIpPerENI.html
- AWS EC2 User Guide: Create a network interface - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-network-interface.html
- AWS EC2 User Guide: Network interface attachments - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network-interface-attachments.html
- AWS CLI Command Reference: create-network-interface - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-network-interface.html
- AWS CLI Command Reference: modify-network-interface-attribute - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-network-interface-attribute.html
- AWS CLI Command Reference: associate-address - https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-address.html
- Terraform AWS Provider: aws_network_interface - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_interface.html
- Terraform AWS Provider: aws_network_interface_attachment - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_interface_attachment.html
- Red Hat Enterprise Linux 7 Networking Guide: policy routing with route/rule files - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/networking_guide/
- Netplan documentation: DHCP overrides, routes, and routing policy - https://netplan.readthedocs.io/
- OneUptime linked Terraform article - https://oneuptime.com/blog/post/2026-02-12-create-ec2-instance-terraform/view
- OneUptime linked CloudWatch monitoring article - https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-infrastructure-monitoring/view

## Issues Found
- The Amazon Linux 2 / RHEL persistence example used `sudo cat > /etc/...`, which would not write the target files as root because shell redirection runs before `sudo`. Changed those examples to `sudo tee ... > /dev/null`.
- The Ubuntu netplan example used `route-metric: 200` on the secondary DHCP interface, which still installs DHCP-provided routes in the main table. Changed it to `use-routes: false` so the secondary interface does not add a second main-table default route while the explicit policy route remains in table 100.
- The Terraform example described the secondary ENI as being in a different subnet but did not state the same-Availability-Zone requirement. Updated the comment to say the subnet must be in the same Availability Zone.
- The troubleshooting section said some instance types require a reboot after attaching an ENI. AWS documentation frames the caveat as warm/hot-attached interfaces sometimes requiring manual OS configuration, while Amazon Linux and Windows Server automatically recognize them. Reworded the note to focus on OS configuration rather than instance type reboot requirements.
- Clarified the policy-routing explanation so it refers to responses for traffic received on eth1 being sourced and routed through eth1.

## Review Notes
The AWS CLI commands, Terraform resource names and arguments, ENI limit query, Elastic IP association example, source/destination check guidance, and VPC Flow Logs monitoring recommendation are consistent with the official documentation. The examples still use placeholder IDs and example IP addresses, so users must substitute values from their own VPC, subnet, instance, and ENI.
