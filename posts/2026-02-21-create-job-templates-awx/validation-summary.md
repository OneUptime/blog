# Validation Summary: How to Create Job Templates in AWX

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWX
- Ansible Automation Platform Controller API
- `awx.awx` Ansible collection
- AWX job templates, credentials, surveys, launches, and schedules
- Ansible playbook YAML
- REST API calls with `curl`

## Sources Consulted
- AWX Job Templates user guide: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/job_templates.html
- AWX Multi-Credential Assignment guide: https://docs.ansible.com/projects/awx/en/24.6.1/administration/multi-creds-assignment.html
- AWX OpenAPI schema: https://docs.ansible.com/projects/awx/en/latest/open_api/
- `awx.awx.job_template` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/job_template_module.html
- `awx.awx.job_launch` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/job_launch_module.html
- `awx.awx.schedule` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/schedule_module.html

## Issues Found
- The API job template creation example used a `credential` field in the `POST /api/v2/job_templates/` payload. The current AWX OpenAPI schema for job template creation does not include that field, and AWX documents credential assignment through the job template credentials subresource. I removed `credential` from the create payload and added a separate `POST /api/v2/job_templates/1/credentials/` association example.
- Several `awx.awx.job_template` examples used the singular `credential` parameter. The current module documentation marks `credential` as deprecated and recommends `credentials`. I changed those examples to use `credentials` lists.

## Review Notes
The remaining examples match the documented AWX 24.6.1 / `awx.awx` 24.6.1 parameters and formats. The `awx.awx` collection documentation notes that the collection is planned for removal from the bundled Ansible package in Ansible 14, but it remains installable directly with `ansible-galaxy collection install awx.awx`.
