# Validation Summary: How to Use Ansible Inventory with Non-Standard SSH Ports

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory
- Ansible INI inventory format
- Ansible YAML inventory format
- Ansible connection variables
- SSH non-standard ports
- SSH ProxyJump / bastion hosts
- Ansible dynamic inventory
- amazon.aws.aws_ec2 inventory plugin

## Sources Consulted
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible YAML inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yaml_inventory.html
- Ansible configuration settings, DEFAULT_REMOTE_PORT: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html#default-remote-port
- Ansible variable precedence documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_variables.html#understanding-variable-precedence
- ansible-inventory CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- amazon.aws.aws_ec2 inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- OpenSSH ssh_config manual for ProxyJump: https://man.openbsd.org/ssh_config#ProxyJump

## Issues Found
- The introduction said the post covered "every way" to configure SSH ports in Ansible. This was too broad because Ansible can also receive connection settings through additional variables, command-line options, environment/config mechanisms, plugins, and SSH config. Changed it to "common ways" to keep the claim accurate.
- The dynamic inventory section referred only to "dynamic inventory scripts" while the AWS example uses the `amazon.aws.aws_ec2` inventory plugin. Changed the wording to "dynamic inventory plugins or scripts."

## Review Notes
- The `ansible_port` examples, INI host `hostname:port` syntax, YAML inventory structure, `group_vars` and `host_vars` usage, host-level overrides, and `remote_port` setting match current Ansible documentation.
- The `ansible-inventory --list`, `--host`, and `--graph` commands are current. The verbose `ansible ... -vvvv` connectivity check is consistent with Ansible CLI debugging guidance, though Ansible was not installed locally in this workspace to execute the commands.
- The AWS EC2 example uses the current fully qualified inventory plugin name `amazon.aws.aws_ec2` and a valid `compose` expression pattern for deriving host variables from metadata.
