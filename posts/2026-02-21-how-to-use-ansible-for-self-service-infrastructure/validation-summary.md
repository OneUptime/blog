# Validation Summary: How to Use Ansible for Self-Service Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- AWX job templates and surveys
- AWX RBAC
- Amazon AWS Ansible collection
- Amazon EC2

## Sources Consulted
- Ansible AWX Job Templates and Surveys: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/job_templates.html
- Ansible AWX RBAC: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/rbac.html
- Ansible AWX Workflows: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/workflows.html
- awx.awx.job_template module: https://docs.ansible.com/projects/ansible/10/collections/awx/awx/job_template_module.html
- awx.awx.role module: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/role_module.html
- amazon.aws.ec2_instance module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- amazon.aws.ec2_instance_info module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_info_module.html
- Ansible now() function: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_templating_now.html
- Ansible facts and ansible_date_time guidance: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- ansible.builtin.to_datetime filter: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/to_datetime_filter.html

## Issues Found
- The auto-shutdown playbook set `gather_facts: false` but used `ansible_date_time.epoch` in the expiration check. `ansible_date_time` is populated by fact gathering and can also become stale in long-running playbooks. Changed the condition to use `now(utc=true)` with `to_datetime(...).total_seconds()`, matching Ansible's documented date/time guidance.
- The RBAC example used `role: approve`, which is not a valid AWX role name. Changed it to `role: approval`, matching the AWX role module's documented choices.

## Review Notes
- The snippets are illustrative and omit environment-specific inputs such as AWS region, credentials, `base_ami`, `quota_api`, `api_token`, and role implementations.
- I could not run `ansible-playbook --syntax-check` because Ansible is not installed in this workspace.
