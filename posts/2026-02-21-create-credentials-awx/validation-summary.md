# Validation Summary: How to Create Credentials in AWX

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWX / Ansible Automation Platform Controller credentials
- awx.awx Ansible collection
- AWX REST API v2
- AWX custom credential types and injectors
- AWX external credential lookups
- AWX RBAC role assignments
- HashiCorp Vault, Azure, AWS, Google Compute Engine, and Ansible Vault credential examples

## Sources Consulted
- AWX Credentials documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/credentials.html
- AWX Custom Credential Types documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/credential_types.html
- AWX Secret Management System documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/credential_plugins.html
- AWX RBAC documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/rbac.html
- awx.awx.credential module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/credential_module.html
- awx.awx.credential_type module documentation: https://docs.ansible.com/ansible/latest/collections/awx/awx/credential_type_module.html
- awx.awx.credential_input_source module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/credential_input_source_module.html
- awx.awx.role_team_assignment module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/role_team_assignment_module.html
- AWX OpenAPI Reference: https://docs.ansible.com/projects/awx/en/latest/open_api/explorer.html

## Issues Found
- The API example embedded `cat ~/.ssh/production_key` directly inside a JSON string. SSH private keys contain newlines, so this can produce invalid JSON. Changed the example to build the request body with `jq -n --arg ssh_key_data`, then pipe it to `curl -d @-`.
- The external credential lookup example used `credential_input_sources` inside `awx.awx.credential`, which is not a supported parameter. Changed it to create the target Machine credential first, then use `awx.awx.credential_input_source` with `target_credential`, `input_field_name`, `source_credential`, and `metadata`.
- The RBAC example posted to `/api/v2/credentials/1/object_roles/`, which the current AWX API documents as a listing endpoint. Changed it to POST to `/api/v2/role_team_assignments/` with `team`, `role_definition`, and `object_id`, and added a note that the IDs are environment-specific.

## Review Notes
- The awx.awx collection documentation notes that the collection will be removed from the bundled Ansible package in Ansible 14, but it remains installable with `ansible-galaxy collection install awx.awx`.
- Numeric IDs for `organization`, `credential_type`, `team`, `role_definition`, and `object_id` are examples only and must be looked up in the target AWX instance.
