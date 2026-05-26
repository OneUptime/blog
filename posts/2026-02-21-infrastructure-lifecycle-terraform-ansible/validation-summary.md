# Validation Summary: How to Manage Infrastructure Lifecycle with Terraform and Ansible

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform CLI
- Ansible playbooks
- Ansible built-in modules
- Ansible community.general collection
- UFW
- cron
- SSH server configuration

## Sources Consulted
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform apply command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform destroy command reference: https://developer.hashicorp.com/terraform/cli/commands/destroy
- Ansible built-in collection index: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/index.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible community.general.timezone module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible community.general.ufw module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible ansible.builtin.uri module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible ansible.builtin.file module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible ansible.builtin.lineinfile module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible ansible.builtin.cron module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible ansible.builtin.service module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html

## Issues Found
- The timezone example used `ansible.builtin.timezone`, but the current documented module is `community.general.timezone`. Updated the task to use the correct fully qualified collection name.
- The SSH hardening task used regexes that would not match commented default settings in common `sshd_config` files. Updated the regexes to match either commented or uncommented directives.
- The scheduled compliance scan copied a script to `/opt/scripts/compliance_scan.sh` without first ensuring `/opt/scripts` exists. Added an `ansible.builtin.file` task to create the directory.
- Several comments referred to "this module" even though the post is about Terraform and Ansible workflows, not a single module. Updated those references to "these tools."

## Review Notes
- Terraform command examples are valid according to the official CLI docs, including saved plan usage with `terraform plan -out=...` and `terraform apply plan.tfplan`.
- `terraform destroy -target=module.staging` is syntactically valid, but targeted destroys should be used carefully because they intentionally operate on a subset of the dependency graph.
- The Ansible examples assume Linux hosts with SSH, UFW, cron, and the required Ansible collections available.
