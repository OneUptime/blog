# Validation Summary: How to Debug Terraform-Ansible Integration Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Terraform CLI
- Terraform provisioners
- Ansible CLI
- Ansible playbooks
- Ansible inventory
- Ansible built-in modules
- Ansible community.general collection

## Sources Consulted
- Terraform `output` command documentation: https://developer.hashicorp.com/terraform/cli/commands/output
- Terraform refresh-only state workflow: https://developer.hashicorp.com/terraform/tutorials/state/refresh
- Terraform `terraform_data` resource documentation: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/resources/provisioners/syntax
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible `ansible-inventory` CLI documentation: https://docs.ansible.com/projects/ansible-core/devel/cli/ansible-inventory.html
- Ansible `wait_for_connection` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_connection_module.html
- Ansible variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible `setup` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible `hostname` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible `service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible `uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html

## Issues Found
- Replaced `terraform refresh` with `terraform plan -refresh-only` and `terraform apply -refresh-only`. The standalone `terraform refresh` command is deprecated, and Terraform's current docs recommend reviewing refresh-only changes before applying them.
- Replaced `null_resource` with `terraform_data` in the standalone provisioner example. Terraform 1.4 and later provide `terraform_data` as the built-in resource for arbitrary operations and provisioners that are not tied to a provider-managed resource.
- Replaced `ansible.builtin.timezone` with `community.general.timezone`. The current Ansible documentation lists the timezone module in the `community.general` collection, not `ansible.builtin`.
- Reworded stale references to "this module" because the post is a troubleshooting guide, not documentation for a single Ansible module.

## Review Notes
- The Ansible and Terraform CLIs were not installed in the local environment, so command verification was performed against official documentation rather than local `--help` output.
- The `community.general.timezone` and `community.general.ufw` examples require the `community.general` collection and target-side tools such as `ufw` or timezone database packages where applicable.
