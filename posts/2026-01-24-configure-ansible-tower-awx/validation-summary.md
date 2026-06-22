# Validation Summary: How to Configure Ansible Tower/AWX

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ansible AWX
- Ansible Tower / Ansible Automation Platform
- AWX Operator
- Kubernetes
- Helm
- AWX REST API
- PostgreSQL
- LDAP / Active Directory
- Slack and email notifications

## Sources Consulted
- AWX Operator Basic Install: https://docs.ansible.com/projects/awx-operator/en/latest/installation/basic-install.html
- AWX Operator Database Configuration: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/database-configuration.html
- AWX Operator Admin User Account Configuration: https://github.com/ansible/awx-operator/blob/devel/docs/user-guide/admin-user-account-configuration.md
- AWX Operator Persisting Projects Directory: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/advanced-configuration/persisting-projects-directory.html
- AWX OpenAPI Schema: https://docs.ansible.com/projects/awx/en/latest/open_api/index.html and https://s3.amazonaws.com/awx-public-ci-files/awx/devel/schema.json
- AWX Notifications documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/notifications.html
- AWX schedules documentation: https://github.com/ansible/awx/blob/devel/docs/schedules.md

## Issues Found
- The direct `kubectl apply -f https://raw.githubusercontent.com/ansible/awx-operator/main/deploy/awx-operator.yaml` install URL returned 404 and is not the current documented operator install path. Replaced it with the official Kustomize-based install pattern using a released operator tag.
- The Helm repository URL was incorrect. Changed it to the documented community AWX Operator Helm chart repository.
- The AWX custom resource used `service_type: ClusterIP`; current AWX Operator examples use lowercase values such as `clusterip`. Updated the example.
- The PostgreSQL secret mixed external database fields with `type: managed`. Changed it to an external PostgreSQL configuration with `type: unmanaged` and `target_session_attrs`.
- The job template create payload used a `credential` field that is not present in the current AWX job template create schema. Removed it from the create request and added the current credentials relationship endpoint.
- The survey example patched `survey_spec` directly onto the job template. Updated it to use the `/api/v2/job_templates/{id}/survey_spec/` endpoint, then enable `survey_enabled`.
- The multiple-choice survey `choices` value was shown as a JSON array. Updated it to the newline-delimited string format used by AWX survey specs.
- The schedule example posted directly to `/api/v2/schedules/` while also passing `unified_job_template`. Updated it to the documented resource-specific schedule endpoint `/api/v2/job_templates/{id}/schedules/`.
- The backup example targeted `deployment/awx-task`, but AWX Operator deployments are named after the AWX resource and contain the `awx-task` container. Updated the command to `deployment/awx -c awx-task`.
- The monitoring snippet was labeled as YAML even though it contained shell commands. Changed the code fence language to `bash`.

## Review Notes
The API examples still use placeholder numeric IDs such as organization `1`, inventory `1`, and credential `1`; these are acceptable as illustrative examples but should be replaced with real IDs discovered from the target AWX instance in production. The post also uses AWX Operator 2.19.1 in the install example because that is the latest release shown in the consulted operator release documentation at review time.
