# Validation Summary: How to Use Terraform Outputs as Ansible Inventory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform outputs, expressions, `templatefile`, `yamlencode`, and `local_file`
- Ansible INI and YAML inventory
- Ansible playbooks and modules
- Bash and `jq`
- Ubuntu OpenSSH service management

## Sources Consulted
- Terraform `output` command: https://developer.hashicorp.com/terraform/cli/commands/output
- Terraform `output` block reference: https://developer.hashicorp.com/terraform/language/block/output
- Terraform `templatefile` function: https://developer.hashicorp.com/terraform/language/functions/templatefile
- Terraform `yamlencode` function: https://developer.hashicorp.com/terraform/language/functions/yamlencode
- Terraform `for` expressions: https://developer.hashicorp.com/terraform/language/expressions/for
- HashiCorp Local provider `local_file` resource: https://registry.terraform.io/providers/hashicorp/local/latest/docs/resources/file
- Ansible inventory guide: https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html
- Ansible `ansible-playbook` inventory examples: https://docs.ansible.com/ansible/6/user_guide/cheatsheet.html
- Ansible `community.general.timezone` module: https://docs.ansible.com/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` module: https://docs.ansible.com/ansible/latest/collections/community/general/ufw_module.html
- Ansible `ansible.builtin.hostname` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible `ansible.builtin.uri` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.cron` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ubuntu OpenSSH server documentation: https://ubuntu.com/server/docs/how-to/security/openssh-server/

## Issues Found
- The post used `ansible.builtin.timezone`, but current Ansible documentation lists the timezone module as `community.general.timezone`. Updated the playbook example to use the correct FQCN.
- The handler restarted service `sshd` while the surrounding examples use Ubuntu-style connection defaults. Ubuntu's OpenSSH server documentation uses `ssh.service`, so the handler now restarts `ssh`.
- The YAML inventory example omitted the database host shown in the earlier Terraform outputs and INI inventory examples. Added a `databases` child group with `db-1` so the YAML example carries the same inventory data.

## Review Notes
- Terraform and Ansible CLIs were not installed in the local environment, so Terraform/Ansible behavior was verified against official documentation. The installed `jq` 1.7 binary was used to validate the two `jq` filters with representative JSON.
- The `community.general.ufw` and `community.general.timezone` modules are not part of `ansible-core`; they require the `community.general` collection, which is included by the broader `ansible` package but may need separate installation in minimal ansible-core environments.
