# Validation Summary: How to Use ansible-navigator for Inventory Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible-navigator
- Ansible inventory files and directories
- Ansible execution environments
- amazon.aws AWS EC2 dynamic inventory plugin
- YAML

## Sources Consulted
- Ansible Navigator documentation: https://docs.ansible.com/projects/navigator/
- Ansible Navigator subcommands documentation: https://docs.ansible.com/projects/navigator/subcommands/
- Ansible Navigator settings documentation: https://docs.ansible.com/projects/navigator/settings/
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- ansible-inventory CLI documentation: https://docs.ansible.com/projects/ansible-core/devel/cli/ansible-inventory.html
- ansible.builtin.yaml inventory plugin documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/yaml_inventory.html
- amazon.aws.aws_ec2 inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html

## Issues Found
- The AWS EC2 dynamic inventory example used `plugin: amazon.aws.ec2`. The current official plugin name is `amazon.aws.aws_ec2`, so the snippet was updated.
- The AWS EC2 inventory example used `aws_inventory.yml`, but the official plugin documentation states that AWS EC2 inventory source files must end with `aws_ec2.yml` or `aws_ec2.yaml`. The examples were updated to use `inventory.aws_ec2.yml`.
- The ansible-navigator settings example used a top-level `inventories` key. Current ansible-navigator settings document inventory entries under `ansible.inventory.entries`, so the snippet was updated.
- The "Viewing Group Variables" section used `--graph` without `--vars`, which shows the group hierarchy rather than group variables. The section wording was corrected to describe viewing the group hierarchy.

## Review Notes
The local environment did not have `ansible-navigator` installed, so command behavior was verified against official ansible-navigator and ansible-inventory documentation rather than local CLI output. The post's validation playbook and static YAML inventory examples are syntactically valid and consistent with Ansible inventory documentation.
