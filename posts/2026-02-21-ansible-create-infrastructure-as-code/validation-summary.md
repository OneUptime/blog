# Validation Summary: How to Use Ansible to Create Infrastructure as Code

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks, roles, inventory, variables, handlers, and idempotency
- Ansible built-in modules: `command`, `file`, `add_host`, `apt`, `template`, `service`
- Amazon AWS Ansible collection modules for EC2, VPCs, subnets, internet gateways, route tables, and security groups
- AWS VPC and EC2 infrastructure concepts
- Ansible Vault and external secrets management

## Sources Consulted
- Ansible playbook introduction and desired state/idempotency documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_intro.html
- Ansible introduction: https://docs.ansible.com/projects/ansible-core/devel/getting_started/introduction.html
- `amazon.aws.ec2_instance` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- `amazon.aws.ec2_vpc_net` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_vpc_net_module.html
- `amazon.aws.ec2_vpc_subnet` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_vpc_subnet_module.html
- `amazon.aws.ec2_vpc_igw` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_vpc_igw_module.html
- `amazon.aws.ec2_vpc_route_table` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_vpc_route_table_module.html
- `amazon.aws.ec2_security_group` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_security_group_module.html
- `amazon.aws.ec2_vpc_net_info`, `ec2_vpc_subnet_info`, and `ec2_vpc_route_table_info` module documentation for teardown patterns: https://docs.ansible.com/ansible/latest/collections/amazon/aws/
- `ansible.builtin.command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- `ansible.builtin.add_host` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/add_host_module.html
- `ansible-playbook` CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html
- AWS VPC deletion documentation: https://docs.aws.amazon.com/vpc/latest/userguide/delete-vpc.html
- AWS EC2 DeleteVpc API documentation: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DeleteVpc.html
- Terraform state documentation: https://developer.hashicorp.com/terraform/language/state

## Issues Found
- The post described Ansible as procedural rather than declarative. Official Ansible documentation says playbooks run tasks in order, but tasks commonly declare desired state. Updated the wording to reflect both the ordered execution model and desired-state behavior.
- The compute role added EC2 instances with `add_host`, but the configuration section implied that a separate `configure.yml` run could use those in-memory hosts. `add_host` only affects the current playbook run, so the post now notes that separate runs need static or dynamic inventory.
- The compute role referenced `ami_id`, `ssh_key_name`, and `ssh_key_path`, but the example variables file did not define them. Added example values so the snippets are internally consistent.
- The teardown playbook used environment variables from `all.yml` without loading that file. Added the same `vars_files` entry used by the provisioning playbook.
- The teardown playbook terminated instances without `wait: true`, then immediately attempted to delete dependent resources. Added `wait: true` to reduce dependency failures during cleanup.
- The teardown playbook claimed that deleting the VPC removes subnets, internet gateways, and route tables. AWS documentation says created VPC resources must be deleted or detached before deleting the VPC, so the example now looks up the VPC ID and removes the public subnets, public route table, internet gateway, and security group before deleting the VPC.

## Review Notes
The teardown example covers the resources shown in the post. A production teardown should also account for any additional dependencies introduced later, such as NAT gateways, load balancers, endpoints, non-default network ACLs, and database resources. The configuration examples use short built-in module names such as `apt` and `template`; these still work, although Ansible documentation recommends fully qualified collection names in modern playbooks.
