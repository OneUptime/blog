# Validation Summary: How to Use Ansible to Manage AWS EC2 Security Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Amazon AWS collection for Ansible
- AWS EC2 security groups
- Amazon VPC networking
- YAML
- Mermaid diagrams

## Sources Consulted
- Ansible `amazon.aws.ec2_security_group` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_security_group_module.html
- Ansible `amazon.aws.ec2_security_group_info` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_security_group_info_module.html
- AWS VPC security group rules documentation: https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- AWS default security group documentation: https://docs.aws.amazon.com/vpc/latest/userguide/default-security-group.html
- AWS VPC quotas documentation: https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html
- AWS EC2 delete security group documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/deleting-security-group.html

## Issues Found
- The post said the `ec2_security_group` module only adds rules by default and does not remove unmanaged rules. Current official Ansible documentation states that `purge_rules` and `purge_rules_egress` both default to `true`, so I updated the purging section to describe the current default behavior and how to opt into additive behavior with `false`.
- The post listed "2,500 security groups per VPC" as the default quota. AWS currently documents this quota as 2,500 VPC security groups per Region, so I corrected the wording.
- The post listed "60 inbound and 60 outbound rules per security group" without the IPv4/IPv6 distinction. AWS documents that this quota is enforced separately for inbound and outbound rules and separately for IPv4 and IPv6 rules, so I added that caveat.
- The deletion section said a security group cannot be deleted if attached to resources such as EC2, RDS, or ENIs. AWS documents deletion blockers as association with an instance or network interface, or being referenced by another security group rule, so I updated the wording to match.

## Review Notes
The Ansible examples use the current `amazon.aws.ec2_security_group` and `amazon.aws.ec2_security_group_info` module names and valid parameters such as `rules`, `rules_egress`, `cidr_ip`, `cidr_ipv6`, `group_id`, `group_name`, `rule_desc`, and AWS-style filters. The examples omit authentication setup, which is acceptable for a focused tutorial but should be handled through standard AWS credentials, profiles, or environment configuration in real use.
