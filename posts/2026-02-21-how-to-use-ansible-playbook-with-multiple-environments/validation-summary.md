# Validation Summary: How to Use Ansible Playbook with Multiple Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible inventory and group variables
- Ansible Vault
- Ansible roles, modules, and conditionals
- AWS EC2 dynamic inventory via `amazon.aws.aws_ec2`
- Molecule role testing
- Bash wrapper scripts

## Sources Consulted
- Ansible inventory guide: https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html
- Ansible `host_group_vars` vars plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/host_group_vars_vars.html
- Ansible Vault CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Ansible variables and `--extra-vars` documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible `include_role` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible `template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `pip` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/pip_module.html
- Amazon AWS EC2 inventory plugin documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- Molecule configuration documentation: https://ansible.readthedocs.io/projects/molecule/configuration/

## Issues Found
- The AWS dynamic inventory example used `plugin: aws_ec2`, while current official documentation identifies the plugin as `amazon.aws.aws_ec2` in the `amazon.aws` collection and documents its `boto3`/`botocore` requirements. Updated the snippet to use `plugin: amazon.aws.aws_ec2` and added a short requirement note.

## Review Notes
The top-level `group_vars/all.yml` pattern is valid for `ansible-playbook`, but playbook-directory variables override inventory-directory variables if the same variable is defined in both places. The examples avoid that conflict. The local environment did not have Ansible installed, so CLI behavior was verified against official documentation rather than local `--help` output.
