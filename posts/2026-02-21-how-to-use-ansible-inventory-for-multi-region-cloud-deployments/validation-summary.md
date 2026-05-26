# Validation Summary: How to Use Ansible Inventory for Multi-Region Cloud Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible static YAML inventory
- Ansible inventory patterns and `--limit`
- Ansible `group_vars`
- `amazon.aws.aws_ec2` dynamic inventory plugin
- `azure.azcollection.azure_rm` dynamic inventory plugin
- `ansible.builtin.constructed` inventory plugin
- Bash deployment scripting

## Sources Consulted
- Ansible YAML inventory plugin documentation: https://docs.ansible.com/projects/ansible-core/2.14/collections/ansible/builtin/yaml_inventory.html
- Ansible inventory patterns documentation: https://docs.ansible.com/ansible/latest/inventory_guide/intro_patterns.html
- Ansible `host_group_vars` vars plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/host_group_vars_vars.html
- Ansible `amazon.aws.aws_ec2` inventory plugin documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- Ansible `azure.azcollection.azure_rm` inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_inventory.html
- Ansible `ansible.builtin.constructed` inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/constructed_inventory.html

## Issues Found
1. **Dynamic inventory commands omitted the inventory source**: The AWS EC2 dynamic inventory section defined `inventory/aws_ec2.yml`, but the follow-up `ansible-playbook` examples did not pass `-i inventory/aws_ec2.yml`. Added the inventory argument so the commands use the dynamic inventory file described in the post instead of relying on an external default inventory configuration.

## Review Notes
- The static YAML inventory structure follows Ansible's `all`, `vars`, `children`, and `hosts` inventory format.
- The group intersection examples using `:&` are consistent with Ansible inventory pattern syntax.
- The `amazon.aws.aws_ec2` inventory filename, `keyed_groups`, `compose`, EC2 filters, and cache options are consistent with the current collection documentation.
- The Azure inventory filename, `include_vm_resource_groups`, `auth_source`, `keyed_groups`, and `private_ipv4_addresses[0]` expression are consistent with the current `azure.azcollection.azure_rm` inventory documentation.
- The constructed inventory `groups` expressions use supported Jinja2 conditionals over host variables made available by earlier inventory sources.
- `ansible-playbook` and `ansible-inventory` were not installed in the local workspace, so examples were not executed locally.
