# Validation Summary: How to Use Terraform terraform_remote_state with Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform remote state and outputs
- Ansible playbooks
- Ansible built-in modules
- community.general Ansible collection

## Sources Consulted
- HashiCorp Terraform `terraform_remote_state` data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- HashiCorp Terraform `terraform output` command documentation: https://developer.hashicorp.com/terraform/cli/commands/output
- HashiCorp Terraform remote state documentation: https://developer.hashicorp.com/terraform/language/state/remote
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible delegation and `run_once` documentation: https://docs.ansible.com/ansible/2.9/user_guide/playbooks_delegation.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `ansible.builtin.service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html

## Issues Found
- The shell example used `terraform output -json db_endpoint | tr -d '"'` to read a single output value. Terraform's official CLI documentation recommends `terraform output -raw NAME` for directly reading simple string, number, or boolean outputs in scripts. Changed the command to `terraform output -raw db_endpoint`.
- The infrastructure workflow used `ansible.builtin.timezone`, but the timezone module is provided by the `community.general` collection, not `ansible.builtin`. Changed it to `community.general.timezone`.

## Review Notes
- `terraform_remote_state` exposes only root module outputs to Terraform configuration, but access to those outputs generally requires access to the full state snapshot. Future revisions could mention this security caveat when discussing remote state access.
- The Ansible `run_once` and delegation pattern used for reading Terraform outputs is valid for the default linear strategy, but behavior can differ with the free strategy or serial batches.
