# Validation Summary: How to Use Ansible to Trigger Terraform Plans

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Terraform
- community.general Ansible collection
- Ansible playbooks and modules
- UFW
- Cron

## Sources Consulted
- Ansible community.general.terraform module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/terraform_module.html
- Ansible community.general.terraform upstream module source: https://raw.githubusercontent.com/ansible-collections/community.general/main/plugins/modules/terraform.py
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible ansible.builtin.cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible ansible.builtin.setup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible ansible.builtin.service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible variables documentation for extra vars: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html

## Issues Found
- The first Terraform task was labeled as initialization but used `community.general.terraform` with `state: present`, which performs an apply workflow rather than a standalone init. Removed the separate init task and moved `force_init: true` onto the `state: planned` task so the example plans changes without applying them.
- The planned changes debug message counted `stdout_lines`, which is not a count of Terraform resource changes. Updated it to display the Terraform plan output instead.
- The apply task depended on `tf_plan.changed`, but `state: planned` should not be used as the only gate for applying a saved plan. Updated the condition to use the explicit `auto_approve` flag.
- The timezone example used `ansible.builtin.timezone`, but current official documentation lists the module as `community.general.timezone`. Updated the FQCN.
- Several later example comments referred to "this module" even though the snippets demonstrated general Ansible workflow patterns rather than `community.general.terraform`. Adjusted the wording to avoid implying those snippets used the Terraform module.

## Review Notes
Ansible is not installed in the local workspace, so local `ansible-playbook --syntax-check` and `ansible-doc` verification could not be run. The examples were reviewed against the current official Ansible documentation and the upstream `community.general.terraform` module source. The `community.general.terraform` module requires the `community.general` collection and a Terraform binary on the host that executes the module.
