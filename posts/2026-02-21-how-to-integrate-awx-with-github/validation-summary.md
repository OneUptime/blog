# Validation Summary: How to Integrate AWX with GitHub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWX
- Ansible
- GitHub webhooks
- GitHub commit statuses
- GitHub Actions
- REST API with curl
- YAML
- Bash

## Sources Consulted
- AWX Working with Webhooks documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/webhooks.html
- AWX Job Templates documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/job_templates.html
- AWX Credentials documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/credentials.html
- awx.awx project module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/project_module.html
- awx.awx credential module documentation: https://docs.ansible.com/ansible/latest/collections/awx/awx/credential_module.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/reference/workflow-syntax-for-github-actions
- Ansible git module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible meta module documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/meta_module.html
- AWX source code for webhook credential/status behavior: https://github.com/ansible/awx

## Issues Found
- Hard-coded AWX credential type IDs were used for Source Control and GitHub Personal Access Token credentials. Replaced them with API lookups by credential type namespace because numeric IDs are instance data and should not be assumed.
- The project auto-sync section described configuring a GitHub webhook against a project update endpoint. AWX's documented webhook integration is for job templates and workflow job templates, so the section now uses the authenticated project update endpoint from CI and recommends `scm_update_on_launch` for simpler setups.
- The commit status section implied status updates work for any webhook-triggered job. AWX documents GitHub status post-back for pull request events, so the wording now scopes status updates to pull request webhooks.
- The GitHub Actions launch example passed `extra_vars` without noting AWX launch requirements. Added a short caveat that the job template must prompt for variables or use a survey that accepts them.
- The webhook key retrieval comment said it fetched the webhook URL, but the command printed only the key. Updated the comment to match the command.

## Review Notes
The remaining examples are version-agnostic for current AWX API v2 behavior. The placeholder AWX host, organization IDs, project IDs, job template IDs, and credential IDs still need to be replaced with values from the reader's AWX installation.
