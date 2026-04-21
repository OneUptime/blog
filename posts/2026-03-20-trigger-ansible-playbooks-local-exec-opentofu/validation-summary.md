# Validation Summary: How to Trigger Ansible Playbooks from OpenTofu Using local-exec

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform-compatible HCL
- OpenTofu `local-exec` provisioner
- OpenTofu `terraform_data` managed resource
- Ansible `ansible-playbook`
- Ansible inventory and host variables
- AWS EC2 examples

## Sources Consulted
- OpenTofu local-exec provisioner documentation: https://opentofu.org/docs/language/resources/provisioners/local-exec/
- OpenTofu provisioners syntax, creation-time, destroy-time, `self`, and `on_failure` documentation: https://opentofu.org/docs/language/resources/provisioners/syntax/
- OpenTofu `terraform_data` managed resource documentation: https://opentofu.org/docs/language/resources/tf-data/
- OpenTofu `filemd5` function documentation: https://opentofu.org/docs/language/functions/filemd5/
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible host list inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/host_list_inventory.html
- Ansible inventory guide and behavioral inventory parameters: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible runtime variable documentation for `--extra-vars`: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- GitHub author profile link: https://github.com/nawazdhandala

## Issues Found
- The SSH readiness wording said a sleep or retry would "ensure" SSH is ready. OpenTofu documents that a created resource is not guaranteed to be operable yet, so the wording was changed to say SSH has time to become available.
- The private key path variable in the SSH wait example was unquoted. It was changed to `--private-key "${var.private_key_path}"` so shell paths with spaces or special characters are handled more safely.
- The inventory file example called the generated static INI inventory a "dynamic inventory file." Ansible uses "dynamic inventory" for inventory plugins/scripts, so the wording was changed to "inventory file."
- The do-nothing provisioner container used `null_resource`. OpenTofu provides the built-in `terraform_data` resource for this pattern without requiring the external null provider, so the example was updated to `terraform_data` with `triggers_replace`.

## Review Notes
OpenTofu and Ansible CLI binaries were not installed in the local environment, so validation was performed against official documentation rather than local command execution. The remaining examples are technically valid snippets, but production use should prefer idempotent Ansible playbooks, retry logic over fixed sleeps, and explicit handling of SSH host key behavior where appropriate.
