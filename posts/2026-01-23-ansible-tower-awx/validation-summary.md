# Validation Summary: How to Implement Ansible Tower/AWX

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWX
- Red Hat Ansible Automation Platform automation controller
- AWX Operator
- Kubernetes and Kustomize
- AWX CLI / awxkit
- AWX REST API
- Prometheus ServiceMonitor
- GitHub Actions
- Python requests

## Sources Consulted
- AWX Operator basic installation documentation: https://docs.ansible.com/projects/awx-operator/en/latest/installation/basic-install.html
- AWX Operator database configuration documentation: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/database-configuration.html
- AWX Operator network and TLS configuration documentation: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/network-and-tls-configuration.html
- AWX Operator container resource requirements documentation: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/advanced-configuration/containers-resource-requirements.html
- AWX Operator 2.19.1 GitHub release and CRD/templates: https://github.com/ansible/awx-operator/releases/tag/2.19.1
- AWX OpenAPI schema documentation: https://docs.ansible.com/projects/awx/en/latest/open_api/
- AWX API schema JSON: https://s3.amazonaws.com/awx-public-ci-files/devel/schema.json
- AWX CLI awxkit package and documentation: https://pypi.org/project/awxkit/ and https://github.com/ansible/awx/tree/devel/awxkit
- AWX scheduling documentation: https://github.com/ansible/awx/blob/devel/docs/schedules.md
- AWX metrics documentation: https://docs.ansible.com/projects/awx/en/24.6.1/administration/metrics.html
- Red Hat AWX FAQ: https://www.redhat.com/en/ansible-collaborative/faq
- Red Hat automation controller overview: https://www.redhat.com/en/technologies/management/ansible/automation-controller

## Issues Found
- The post described AWX as the open-source Ansible Tower and compared it directly to Ansible Tower. Updated the wording to automation controller, formerly Ansible Tower, and clarified that automation controller is derived from selected, hardened AWX releases.
- The AWX Operator kustomize example referenced a non-existent `deploy/awx-operator.yaml` raw URL. Replaced it with the official `github.com/ansible/awx-operator/config/default?ref=2.19.1` kustomize target, image tag override, and namespace.
- The operator log command omitted the `awx-manager` container. Added `-c awx-manager`.
- The AWX CLI authentication environment variables used old `TOWER_*` names. Updated them to `CONTROLLER_HOST`, `CONTROLLER_USERNAME`, and `CONTROLLER_PASSWORD`.
- The job template example passed a vault credential name to `--vault_credential`, but awxkit expects a numeric credential ID. Changed the example to use an ID and added a note.
- The job template creation command included an `--organization` flag, but job templates do not have a direct organization field. Removed the flag.
- The RBAC API example incorrectly suggested posting custom role objects to `/api/v2/roles/`, which is not a create endpoint. Replaced it with role association through `/api/v2/teams/<team_id>/roles/`.
- The RBAC CLI example used a non-existent `awx roles grant` command. Updated it to `awx teams grant`.
- Schedule examples used names for `unified_job_template`, while the AWX API schema requires an integer ID. Updated examples and added a note.
- The Python API example used `time.sleep()` without importing `time`. Added the import.
- The GitHub Actions polling example queried the latest job after launch, which can race with other jobs. Updated it to capture the launched job ID from the POST response.
- The backup example used direct PostgreSQL dump/restore commands against an incorrect Kubernetes deployment name and did not preserve all operator-managed secrets/configuration. Replaced it with AWXBackup and AWXRestore custom resources and kept `awx export` for configuration-as-code export.
- The ServiceMonitor example did not include required AWX metrics authentication and used an incomplete selector. Added an AWX `service_labels` value, updated the ServiceMonitor to select it in the `awx` namespace, and added bearer token authentication.

## Review Notes
The guide remains version-sensitive because it pins AWX Operator 2.19.1, which is the latest GitHub release as of this review and bundles AWX 24.6.1. Future AWX Operator releases may change CRD fields, labels, or CLI behavior, so the release tag should be revisited before publication.
