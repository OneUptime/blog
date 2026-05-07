# Validation Summary: How to Configure IPv6 on AWS EC2 Instances

## Status
validated

## Post Type
Guide

## Technologies Covered
- Amazon EC2
- Amazon VPC IPv6 addressing
- AWS CLI
- Terraform and the HashiCorp AWS Provider
- Amazon Linux 2
- Amazon Linux 2023
- Ubuntu netplan
- EC2 Instance Metadata Service (IMDSv2)

## Sources Consulted
- Amazon EC2 User Guide: Manage the IPv6 addresses for your EC2 instances — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/working-with-ipv6-addresses.html
- Amazon EC2 User Guide: Amazon EC2 instance IP addressing — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-instance-addressing.html
- Amazon EC2 User Guide: Use instance metadata to manage your EC2 instance — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html
- AWS CLI Command Reference: `run-instances` — https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: `assign-ipv6-addresses` — https://docs.aws.amazon.com/cli/latest/reference/ec2/assign-ipv6-addresses.html
- Amazon Linux 2023 User Guide: Networking service — https://docs.aws.amazon.com/linux/al2023/ug/networking-service.html
- Amazon Linux 2 User Guide: Configure your network interface using ec2-net-utils for AL2 — https://docs.aws.amazon.com/linux/al2/ug/ec2-net-utils.html
- Red Hat Enterprise Linux Deployment Guide: interface configuration files (`IPV6INIT`, `DHCPV6C`) — https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/deployment_guide/s1-networkscripts-interfaces
- Terraform Registry: `aws_instance` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform Registry: `aws_security_group` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Netplan documentation: YAML configuration — https://netplan.readthedocs.io/en/latest/netplan-yaml/

## Issues Found
- The Terraform example used `2001:db8:admin::/48`, which is not a valid IPv6 CIDR because `admin` is not hexadecimal. It was changed to `2001:db8:1234::/48`.
- The launch example omitted the requirement that the subnet must already have an associated IPv6 CIDR block. A prerequisite comment was added to the CLI example.
- The Amazon Linux instructions treated Amazon Linux 2 and Amazon Linux 2023 the same. The post was corrected so the `/etc/sysconfig/network-scripts/ifcfg-eth0` guidance applies to Amazon Linux 2 only, while Amazon Linux 2023 is described as using `amazon-ec2-net-utils` with `systemd-networkd`.
- The netplan example wrote directly to `/etc/netplan/60-ipv6.yaml` without privilege escalation and hard-coded an interface name. It was updated to use `sudo tee` and detect the interface used by the default route before applying the configuration.
- The connectivity example used `ping6`, which is less portable than `ping -6`. The command was updated.
- The conclusion overstated IPv6 behavior by implying EC2 IPv6 addresses are always globally routable. AWS now distinguishes public and private IPv6 addressing, so the conclusion was corrected to say that public IPv6 does not require NAT and to clarify the supported launch-time assignment paths.

## Review Notes
- The post is technically relevant and was validated after the corrections above.
- Terraform inline `ingress` and `egress` rules remain supported, but current provider guidance prefers `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` for clearer rule management. This was not changed because the existing example is still valid.
- Local `aws` and `terraform` CLIs were not available in the review environment, so command validation was performed against current official documentation instead of local `--help` output.
