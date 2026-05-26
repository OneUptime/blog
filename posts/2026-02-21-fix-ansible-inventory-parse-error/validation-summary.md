# Validation Summary: How to Fix Ansible Unable to parse as inventory source Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Ansible inventory
- Ansible inventory plugins
- Dynamic inventory scripts
- YAML and INI inventory files
- Ansible playbooks and built-in modules
- Amazon AWS EC2 inventory plugin
- community.general collection modules

## Sources Consulted
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible dynamic inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_dynamic_inventory.html
- ansible.builtin.yaml inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yaml_inventory.html
- Ansible inventory plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/inventory.html
- ansible-inventory CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- amazon.aws.aws_ec2 inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- ansible.builtin.hostname module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- ansible.builtin.cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html

## Issues Found
- The infrastructure provisioning example used `ansible.builtin.timezone`, but current Ansible documentation lists the timezone module as `community.general.timezone`. Updated the example to use `community.general.timezone` so the fully qualified collection name is correct for current Ansible versions.

## Review Notes
The core inventory troubleshooting guidance is accurate: YAML inventories should use the documented `all` group structure and valid YAML inventory extensions, dynamic inventory scripts are supported through the script inventory plugin, inventory plugins can be enabled/configured through Ansible inventory plugin settings, and `ansible-inventory --list` is the correct command for inspecting parsed inventory. The AWS EC2 dynamic inventory example uses the current `amazon.aws.aws_ec2` plugin name and a valid keyed group pattern. The examples that use `community.general` modules assume that collection is installed, which is commonly true for the full Ansible package but not for a minimal `ansible-core` installation.
