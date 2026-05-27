# Validation Summary: How to Use Ansible for Environment Provisioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks, roles, variables, and in-memory inventory
- Amazon AWS Ansible collection
- Amazon EC2 instances
- Amazon VPC, subnets, route tables, internet gateways, and security groups
- YAML configuration

## Sources Consulted
- Ansible `amazon.aws.ec2_vpc_net` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_net_module.html
- Ansible `amazon.aws.ec2_vpc_net_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_net_info_module.html
- Ansible `amazon.aws.ec2_vpc_subnet` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_subnet_module.html
- Ansible `amazon.aws.ec2_vpc_igw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_igw_module.html
- Ansible `amazon.aws.ec2_vpc_route_table` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_route_table_module.html
- Ansible `amazon.aws.ec2_security_group` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_security_group_module.html
- Ansible `amazon.aws.ec2_instance` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- AWS VPC route table documentation: https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/VPC_Route_Tables.html

## Issues Found
- The compute provisioning role used `public_subnet_ids` and `private_subnet_ids`, but the network provisioning role never defined them. Added a `set_fact` task after subnet creation so the next play can launch instances into the created subnets.
- The smoke test used `http://{{ inventory_hostname }}/health`, but the generated inventory hostname is the EC2 Name tag and may not be resolvable. Changed the check to `http://localhost/health`, which is valid because the task runs on each web server.
- The teardown example claimed to delete "VPC and all dependencies" by calling `ec2_vpc_net` directly. The AWS modules require dependent resources such as route tables, internet gateways, and subnets to be removed first. Added VPC lookup, route table deletion, internet gateway deletion, subnet deletion, and then VPC deletion.
- The teardown omitted `region` from several AWS module calls even though the rest of the examples use `aws_region`. Added `region: "{{ aws_region }}"` for consistency and correctness.
- The security group deletion order was changed to remove dependent groups first: `db-sg`, then `app-sg`, then `web-sg`.

## Review Notes
The examples still assume the Ansible controller can reach instance private IP addresses for SSH. That is valid when the controller runs inside the VPC, over VPN, or through equivalent private network access, but teams provisioning from a public workstation would need a bastion host, public web server SSH access, or AWS Systems Manager Session Manager.
