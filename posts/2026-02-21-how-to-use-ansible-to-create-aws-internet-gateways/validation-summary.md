# Validation Summary: How to Use Ansible to Create AWS Internet Gateways

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- AWS VPC
- AWS Internet Gateway
- AWS route tables and subnets
- boto3 and botocore
- YAML playbooks

## Sources Consulted
- Ansible amazon.aws collection index: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/index.html
- Ansible amazon.aws.ec2_vpc_igw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_igw_module.html
- Ansible amazon.aws.ec2_vpc_igw_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_igw_info_module.html
- Ansible amazon.aws.ec2_vpc_net module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_net_module.html
- Ansible amazon.aws.ec2_vpc_subnet module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_subnet_module.html
- Ansible amazon.aws.ec2_vpc_route_table module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_route_table_module.html
- AWS VPC internet gateway documentation: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- AWS delete internet gateway documentation: https://docs.aws.amazon.com/vpc/latest/userguide/delete-igw.html
- AWS VPC quotas documentation: https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html
- AWS route table documentation: https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html

## Issues Found
- The prerequisites listed Ansible 2.14 or later, but the current amazon.aws collection documentation lists support for ansible-core 2.16 or newer. Updated the prerequisite to ansible-core 2.16 or later.
- The boto3 installation note did not include the current documented minimum dependency versions. Updated the note and command to install boto3 and botocore 1.34.0 or later.
- The deletion caveat said public IP addresses or Elastic IPs must be released before deleting an IGW. AWS documents the actual blocker as detaching an IGW while the VPC has resources with associated public IPv4 addresses or Elastic IP addresses. Updated the wording to say to disassociate Elastic IPs and remove or update those public IPv4 resources first.

## Review Notes
The playbook examples use current amazon.aws module names and parameters. The route table, subnet, VPC, IGW, and IGW info examples align with the current module documentation. The post focuses on IPv4 routing; adding IPv6 examples with `::/0` could be a future enhancement but is not required for correctness.
