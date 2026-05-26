# Validation Summary: How to Use Ansible to Create AWS VPCs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- AWS VPC
- AWS subnets
- AWS route tables
- AWS internet gateways
- AWS NAT gateways
- AWS Elastic IP addresses
- Amazon CloudWatch Logs
- VPC Flow Logs

## Sources Consulted
- Ansible amazon.aws collection index: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/index.html
- Ansible amazon.aws.ec2_vpc_net module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_net_module.html
- Ansible amazon.aws.ec2_vpc_subnet module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_subnet_module.html
- Ansible amazon.aws.ec2_vpc_igw module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_igw_module.html
- Ansible amazon.aws.ec2_eip module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_eip_module.html
- Ansible amazon.aws.ec2_vpc_nat_gateway module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_nat_gateway_module.html
- Ansible amazon.aws.ec2_vpc_nat_gateway_info module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_nat_gateway_info_module.html
- Ansible amazon.aws.ec2_vpc_route_table module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_route_table_module.html
- Ansible amazon.aws.ec2_vpc_route_table_info module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_route_table_info_module.html
- Ansible amazon.aws.cloudwatchlogs_log_group module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/cloudwatchlogs_log_group_module.html
- AWS VPC DNS attributes documentation: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-dns.html
- AWS VPC Flow Logs documentation: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html
- AWS IAM role for publishing flow logs to CloudWatch Logs: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-iam-role.html
- AWS create flow log that publishes to CloudWatch Logs documentation: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-cwl-create-flow-log.html

## Issues Found
- The VPC Flow Logs section said to enable flow logs, but the example only created a CloudWatch Logs log group. Updated the text to clarify that the log group is only a prerequisite and that a complete CloudWatch Logs flow log also needs a flow log resource and an IAM role.
- The teardown playbook claimed to tear down the VPC and all resources, but it referenced an undefined `nat_gateways` variable and skipped route tables, the internet gateway, and subnets before deleting the VPC. Updated the example to discover NAT gateways, Ansible-managed route tables, and Ansible-managed subnets, then delete them in dependency order before deleting the VPC.

## Review Notes
The create examples use current `amazon.aws` module names and parameters. The complete variables-based playbook intentionally stops after public routing; private subnet NAT routing and isolated database route tables would still need to be added for a full production topology.
