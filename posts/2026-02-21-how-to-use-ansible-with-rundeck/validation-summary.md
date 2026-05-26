# Validation Summary: How to Use Ansible with Rundeck

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Rundeck
- Rundeck Ansible plugin
- Ansible
- Docker and Docker Compose
- PostgreSQL
- Rundeck job YAML definitions
- Rundeck ACL policies
- Rundeck API and rd CLI

## Sources Consulted
- Rundeck Docker installation documentation: https://docs.rundeck.com/docs/administration/install/docker.html
- Rundeck Docker configuration reference: https://docs.rundeck.com/docs/administration/configuration/docker.html
- Rundeck plugin installation documentation: https://docs.rundeck.com/docs/administration/configuration/plugins/installing.html
- Rundeck rd CLI command documentation: https://docs.rundeck.com/docs/rd-cli/commands.html
- Rundeck job YAML format reference: https://docs.rundeck.com/docs/manual/document-format-reference/job-yaml-v12.html
- Rundeck API getting started documentation: https://docs.rundeck.com/docs/api/api_basics.html
- Rundeck Ansible plugin repository and README: https://github.com/rundeck-plugins/ansible-plugin
- Rundeck Ansible plugin 5.0.1 release metadata: https://github.com/rundeck-plugins/ansible-plugin/releases/tag/5.0.1
- Rundeck Ansible plugin source constants for configuration keys: https://github.com/rundeck-plugins/ansible-plugin/blob/5.0.1/src/main/groovy/com/rundeck/plugins/ansible/ansible/AnsibleDescribable.java
- Ansible installation documentation: https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html

## Issues Found
- The post used the stale `rundeck/rundeck:5.0.0` image. Updated the examples to `rundeck/rundeck:5.20.1`, matching the current Rundeck Docker documentation reviewed on 2026-05-26.
- The Ansible plugin download URL pointed to the old Batix repository and version `3.2.4`. Updated it to the current Rundeck-maintained repository and `5.0.1` release artifact.
- The project properties snippet used invalid dotted plugin property names such as `project.ansible.executable` and `project.ansible.config-file-path`. Updated them to the plugin's supported hyphenated keys, including `project.ansible-binaries-dir-path`, `project.ansible-config-file-path`, and `project.ansible-inventory`.
- The resource model source omitted the Ansible config file key. Added `resources.source.1.config.ansible-config-file-path` so the node source uses the same Ansible configuration path.
- The job YAML used `ansible-vault-password-path`, which is not a supported plugin key. Changed it to `ansible-vault-path`, the plugin key for a vault password file path.
- The API example used `POST /api/41/job/JOB-UUID/executions`, which is not the documented endpoint for running a job. Changed it to `POST /api/41/job/JOB-UUID/run` and added an `Accept: application/json` header to align with Rundeck API examples.

## Review Notes
The guide is technically relevant and salvageable. The remaining examples are illustrative and depend on local project paths, credentials, and installed Rundeck CLI configuration. The Dockerfile still pins a specific Ansible package version for reproducibility; future maintenance could update that pin after confirming Python compatibility in the selected Rundeck base image.
