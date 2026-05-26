# Validation Summary: How to Use Terraform Cloud with Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform Cloud / HCP Terraform API
- Terraform remote state outputs
- Ansible dynamic inventory
- Ansible playbooks and built-in modules
- Python
- Bash
- JSON API

## Sources Consulted
- HashiCorp Developer: HCP Terraform Workspaces API - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HashiCorp Developer: HCP Terraform State Versions API - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/state-versions
- HashiCorp Developer: Terraform Enterprise State Version Outputs API - https://developer.hashicorp.com/terraform/enterprise/api-docs/state-version-outputs
- Ansible Core Documentation: Developing dynamic inventory - https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_inventory.html
- Ansible Documentation: ansible.builtin.uri module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible Documentation: ansible.builtin.cron module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible Documentation: community.general.ufw module - https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible Documentation: ansible.builtin.hostname module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html

## Issues Found
- The Terraform Cloud output examples used `current-state-version?include=outputs` and parsed the `included` array. While related resources can be included from state version responses, HashiCorp documents `GET /workspaces/:workspace_id/current-state-version-outputs` as the direct endpoint for reading the latest workspace output values. Updated the Bash and Python examples to use that endpoint and parse the returned `data` array.
- The dynamic inventory example omitted the documented `ungrouped` group from the inventory skeleton. Updated the inventory structure so `all.children` includes `ungrouped` and the inventory contains an `ungrouped` group.
- The Ansible command example did not make the dynamic inventory script executable. Added `chmod +x inventory/tfc_inventory.py` before running `ansible-playbook`.

## Review Notes
- The local environment did not have Ansible installed, so Ansible behavior was checked against official documentation rather than local `ansible-playbook` execution.
- The embedded Bash and Python examples passed syntax checks, and the YAML snippets parsed successfully with PyYAML.
- The `community.general.ufw` module is part of the `community.general` collection, not `ansible-core`; users running only `ansible-core` must install that collection separately.
