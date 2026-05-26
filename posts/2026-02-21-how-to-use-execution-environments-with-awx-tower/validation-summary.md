# Validation Summary: How to Use Execution Environments with AWX/Tower

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ansible AWX
- Red Hat Ansible Automation Platform automation controller
- Ansible execution environments
- AWX REST API
- AWX CLI / awxkit
- Podman
- Container registry credentials

## Sources Consulted
- AWX user guide: Execution Environments: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/execution_environments.html
- Red Hat Ansible Automation Platform documentation: Creating and Consuming Execution Environments, Appendix A precedence: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.2/html-single/creating_and_consuming_execution_environments/creating_and_consuming_execution_environments
- awx.awx execution_environment module documentation: https://ansible.readthedocs.io/projects/ansible/9/collections/awx/awx/execution_environment_module.html
- awx.awx workflow_job_template_node module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/workflow_job_template_node_module.html
- awx.awx job_template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/job_template_module.html
- AWX multi-credential assignment documentation: https://docs.ansible.com/projects/awx/en/24.6.1/administration/multi-creds-assignment.html
- Red Hat Ansible Automation Platform 2.1 release notes: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.1/html/red_hat_ansible_automation_platform_release_notes/anchor-aap_2.1-release
- AWX OpenAPI reference: https://docs.ansible.com/projects/awx/en/latest/open_api/explorer.html

## Issues Found
- The post described Ansible Automation Platform as "formerly Tower" and used "AWX/Tower" for current execution environment behavior. Updated the wording to AWX and Ansible Automation Platform automation controller, which is the successor/replacement for Tower.
- The virtualenv migration wording said each project could point to a different venv. Updated it to include job templates, projects, inventory sources, and organizations, matching AWX/Tower virtual environment migration behavior.
- The registry credential example hard-coded `credential_type: 17`. Replaced it with an API lookup for the Container Registry credential type because numeric credential type IDs are installation-specific.
- The job template creation example included `"credentials": [1, 2]` directly in the job template payload. Replaced it with the documented related endpoint `POST /api/v2/job_templates/N/credentials/` using `associate`.
- The execution environment precedence list omitted the project default EE and inventory organization's default EE. Expanded the list to match the documented precedence order.
- The workflow section implied that every workflow node can simply override the underlying job template EE. Clarified that node-level `execution_environment` is a launch prompt and requires the job template to prompt for execution environment on launch.
- The project update section incorrectly said `projects.default_environment` sets the EE for Git project sync operations. Corrected it to state that project default EEs affect jobs using the project, while project syncs use the control plane execution environment by default.

## Review Notes
The API examples use placeholder IDs and hostnames, so they still require substituting real resource IDs, tokens, and registry names in a live AWX or automation controller deployment. The pull-policy values, execution environment registration fields, project default field, workflow prompt field, and Podman inspection commands are consistent with the consulted documentation.
