# Validation Summary: How to Run Ansible Provisioner in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform `local-exec` provisioner
- Terraform `terraform_data` resource
- Ansible
- Ansible playbooks and inventory
- AWS EC2
- UFW
- Cron

## Sources Consulted
- Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- Terraform resource block reference: https://developer.hashicorp.com/terraform/language/block/resource
- Terraform `terraform_data` resource reference: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- HashiCorp `null_resource` documentation: https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible `wait_for_connection` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_connection_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible built-in collection index: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/index.html

## Issues Found
- The post recommended `null_resource` as the best practice for running provisioners without a real managed resource. HashiCorp's current Terraform documentation recommends the built-in `terraform_data` resource for this use case, and the null provider documentation says to use `terraform_data` on Terraform 1.4 and later. Updated the examples and surrounding text from `null_resource`/`triggers` to `terraform_data`/`triggers_replace`.
- The Ansible playbook used `ansible.builtin.timezone`, but the current timezone module is `community.general.timezone`, not part of `ansible.builtin`. Updated the module FQCN.
- The SSH restart handler used the `sshd` service name while the Terraform examples target Ubuntu hosts. On Ubuntu, the OpenSSH service is named `ssh`. Updated the handler and notification to `restart ssh` with `name: ssh`.

## Review Notes
- Terraform provisioners are valid but HashiCorp documents them as a last-resort mechanism when provider-native or image-based approaches are not available.
- The `community.general.timezone` and `community.general.ufw` examples require the `community.general` collection, which is included with the full `ansible` package but not with `ansible-core`.
- The `terraform_data` examples assume Terraform 1.4 or later.
