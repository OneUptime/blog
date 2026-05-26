# Validation Summary: How to Troubleshoot AWX Job Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- AWX
- Ansible
- Ansible execution environments
- Ansible Builder
- AWX REST API
- Kubernetes kubectl
- Amazon AWS Ansible collection

## Sources Consulted
- AWX REST API conventions: https://docs.ansible.com/projects/awx/en/latest/rest_api/conventions.html
- AWX REST API filtering: https://docs.ansible.com/projects/awx/en/latest/rest_api/filtering.html
- AWX OpenAPI schema: https://docs.ansible.com/projects/awx/en/latest/open_api/index.html
- AWX Jobs user guide: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/jobs.html
- AWX Job Templates user guide: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/job_templates.html
- AWX troubleshooting guide: https://docs.ansible.com/projects/awx/en/24.6.1/administration/troubleshooting.html
- Ansible Builder execution environment definition: https://docs.ansible.com/projects/builder/en/stable/definition/
- Ansible Builder CLI usage: https://docs.ansible.com/projects/builder/en/stable/usage/
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible playbook keywords: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- amazon.aws.ec2_instance module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The credential inspection example looked for a top-level `credential_type_summary` field. Current AWX API responses expose related credential type metadata under `summary_fields.credential_type`, so the Python snippet was updated to read that structure.
- The timeout section implied that the AWX job template `timeout` setting is the same as Ansible connection timeout. The text now distinguishes Ansible connection timeout from AWX's whole-job timeout.
- The timeout playbook snippet used `ansible_command_timeout`, which is not the general SSH connection timeout for normal Linux hosts. The snippet now uses `ansible_timeout` for connection timeout and the documented play-level `timeout` keyword for task action timeout.

## Review Notes
The AWX relaunch example using `{"hosts": "failed"}` was verified against the current AWX OpenAPI schema. The post intentionally uses placeholder hostnames, job IDs, deployment names, and namespace values; these remain appropriate for a troubleshooting guide.
