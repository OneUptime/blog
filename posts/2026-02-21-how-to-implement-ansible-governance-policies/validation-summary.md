# Validation Summary: How to Implement Ansible Governance Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible
- ansible-lint
- AWX / Automation Controller RBAC and workflow approvals
- Ansible callback plugins
- Ansible playbook guardrails
- amazon.aws collection
- AWX REST API

## Sources Consulted
- Ansible Lint configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- Ansible Lint profiles documentation: https://docs.ansible.com/projects/lint/profiles/
- Ansible Lint custom rules documentation: https://docs.ansible.com/projects/lint/custom-rules/
- Ansible Lint no-changed-when rule documentation: https://docs.ansible.com/projects/lint/rules/no-changed-when/
- AWX workflow job template approval node documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/workflow_templates.html
- AWX role-based access control documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/rbac.html
- awx.awx workflow job template module documentation: https://docs.ansible.com/projects/ansible/9/collections/awx/awx/workflow_job_template_module.html
- Automation Controller job template variables documentation: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.6/develop-ref_controller_job_template_variables
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- ansible.builtin.assert module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- amazon.aws.ec2_instance_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_info_module.html
- ansible.builtin.uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- ansible.builtin.template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html

## Issues Found
- The production execution guardrail checked `lookup('env', 'AWX_JOB_ID')`, but AWX / Automation Controller documents the job ID as the injected Ansible variable `awx_job_id`. Changed the assertion to `awx_job_id is defined` so it checks the documented job context variable.

## Review Notes
- The AWX organization, team, permission, and workflow YAML examples are best read as illustrative policy documents rather than direct importable AWX resource definitions. AWX resources can be automated through the AWX/Controller API or the `awx.awx` collection, but those module schemas differ from the simplified examples shown in the post.
- The `ansible_date_time` guardrail depends on gathered facts. For playbooks with `gather_facts: false`, the policy include would need an explicit fact-gathering or controller-side time check.
