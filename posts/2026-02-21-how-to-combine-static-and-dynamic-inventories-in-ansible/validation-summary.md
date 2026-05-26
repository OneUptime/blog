# Validation Summary: How to Combine Static and Dynamic Inventories in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory directories
- Static INI inventory
- Dynamic inventory plugins
- `amazon.aws.aws_ec2` inventory plugin
- `azure.azcollection.azure_rm` inventory plugin
- `ansible.builtin.constructed` inventory plugin
- Ansible `group_vars` and variable precedence
- Ansible CLI commands: `ansible-playbook`, `ansible-inventory`, `ansible`

## Sources Consulted
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- `amazon.aws.aws_ec2` inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- `ansible.builtin.constructed` inventory plugin documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/constructed_inventory.html
- `azure.azcollection.azure_rm` inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_inventory.html
- `ansible-inventory` CLI documentation: https://docs.ansible.com/projects/ansible-core/devel/cli/ansible-inventory.html

## Issues Found
- The parent-group example defined `[webservers:children]` in the first static inventory file before the dynamic `aws_role_web` group existed. Ansible inventory sources are loaded alphabetically, and parent/child group definitions can fail if child groups have not been loaded yet. I moved the parent group into a later inventory file.
- The heading "Use group_vars with a parent group" was technically misleading because parent/child group membership is inventory structure, not `group_vars`. I changed it to "Use an inventory parent group."
- The variable conflict section implied that all group variable conflicts are resolved only by inventory file load order. I clarified the distinction between inventory source load order and same-level group merge order.
- The `ansible_group_priority` example placed `ansible_group_priority` in `group_vars/`, which Ansible documentation explicitly disallows. I moved it into an inventory source example.
- The troubleshooting note tied general dynamic inventory plugin failures to `strict: true`. I narrowed the wording: Ansible may continue to other sources, while plugin options such as `strict` make invalid constructed expressions fatal for that source.
- The production tips used `02-aws.yml` for the AWS EC2 plugin. The `amazon.aws.aws_ec2` plugin requires the inventory config filename to end with `aws_ec2.yml` or `aws_ec2.yaml`, so I changed it to `02-aws_ec2.yml`.

## Review Notes
Ansible is not installed in the local workspace, so CLI examples could not be verified with local `--help` output. They were checked against official Ansible CLI documentation instead.
