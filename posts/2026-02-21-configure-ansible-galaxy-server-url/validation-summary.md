# Validation Summary: How to Configure Ansible Galaxy Server URL

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ansible
- ansible-galaxy CLI
- Ansible Galaxy collections and roles
- Red Hat Automation Hub
- Galaxy NG / Pulp
- JFrog Artifactory
- GitHub Actions cache

## Sources Consulted
- Ansible collection installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible collection download/offline installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_downloading.html
- Ansible configuration settings reference: https://docs.ansible.com/projects/ansible-core/2.18/reference_appendices/config.html
- ansible-galaxy CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Red Hat Automation Hub getting started guide: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.4/html-single/getting_started_with_automation_hub/getting_started_with_automation_hub
- Galaxy NG installation documentation: https://docs.ansible.com/projects/galaxy-ng/en/latest/usage_guide/installation.html
- JFrog Artifactory Ansible repositories documentation: https://docs.jfrog.com/artifactory/docs/ansible-repositories
- Sonatype Nexus Repository supported formats documentation: https://help.sonatype.com/en/formats.html

## Issues Found
- The default Galaxy server was shown as `https://galaxy.ansible.com/api/`. Updated it to `https://galaxy.ansible.com`, which is the documented default `GALAXY_SERVER` value.
- The environment variable example used `ANSIBLE_GALAXY_SERVER_URL`, which is not the documented global setting. Changed it to `ANSIBLE_GALAXY_SERVER`.
- Red Hat Automation Hub examples used the older/too-general `https://console.redhat.com/api/automation-hub/` endpoint. Updated examples to `https://console.redhat.com/api/automation-hub/content/published/`, matching current Red Hat documentation for certified content.
- The Galaxy NG Docker Compose command omitted the compose file required by the current Galaxy NG installation documentation. Updated it to `docker compose -f dev/compose/standalone.yaml up -d`.
- The post claimed Sonatype Nexus supports hosting Ansible collections as a Galaxy server. Current Sonatype supported-format documentation does not list Ansible as a Nexus Repository format, so the Nexus example was removed.
- The Artifactory URL did not match JFrog's documented Ansible repository URL pattern. Updated it to include `/artifactory/api/ansible/<REPOSITORY_NAME>`.
- The air-gapped local HTTP server example configured a static web server as a Galaxy server, which would not provide the Galaxy API. Replaced it with a requirements file that installs tarballs by URL using `type: url`.
- The troubleshooting section said to always add `/api/` to the URL. Updated it to advise using the API base URL expected by the target server, with public Galaxy and private Automation Hub examples.

## Review Notes
Local `ansible-galaxy` and `ansible-config` binaries were not installed in the workspace, so CLI and configuration checks were validated against the official Ansible, Red Hat, Galaxy NG, JFrog, and Sonatype documentation.
