# Validation Summary: How to Set Up a Private Galaxy Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-galaxy CLI
- Ansible Galaxy / Galaxy NG
- Pulp
- pulp_ansible
- Pulp installer
- Docker Compose
- Nginx

## Sources Consulted
- Galaxy NG Docker Compose environment: https://docs.ansible.com/projects/galaxy-ng/en/latest/dev/docker_environment.html
- Galaxy NG collections guide: https://docs.ansible.com/projects/galaxy-ng/en/latest/usage_guide/collections.html
- Galaxy NG administration guide: https://docs.ansible.com/projects/galaxy-ng/en/latest/community/administration.html
- Galaxy Operator container reference: https://docs.ansible.com/projects/galaxy-operator/en/latest/container/
- Ansible Galaxy user guide / client configuration: https://docs.ansible.com/projects/ansible/7/galaxy/user_guide.html
- ansible-galaxy CLI reference: https://docs.ansible.com/ansible/latest/cli/ansible-galaxy.html
- Pulp installer quickstart: https://docs.pulpproject.org/pulp_installer/quickstart/
- Pulp installer pulp_common role reference: https://docs.pulpproject.org/pulp_installer/roles/pulp_common/
- Pulp installer pulp_database_config role reference: https://docs.pulpproject.org/pulp_installer/roles/pulp_database_config/
- Pulp Ansible collection workflows: https://pulpproject.org/pulp_ansible/docs/user/guides/collections/

## Issues Found
- The Galaxy NG Docker Compose example used an unsupported hand-written compose file with service commands such as `run api`, `run worker`, and `run content-app`. Replaced it with the documented Galaxy NG compose workflow from the source repository using `dev/compose/community.yaml`.
- The Galaxy NG local ports were incorrect for the documented compose stack. Updated the API URL to `http://localhost:5001/api/galaxy/v3/swagger-ui/` and noted that the standalone community UI runs separately on `http://localhost:8002`.
- The Pulp installer playbook used fully-qualified role syntax without declaring the installer collection and specified unsupported `source` keys for plugin installation. Updated the playbook to match the Pulp installer quickstart pattern with `collections: pulp.pulp_installer`, `roles: pulp_all_services`, plugin keys, and `DJANGO_SETTINGS_MODULE`.
- The Pulp installer command sequence omitted the required `geerlingguy.postgresql` role dependency. Added the documented `ansible-galaxy install geerlingguy.postgresql` command.
- The client configuration used `/api/galaxy/content/published/` as the private server URL. Galaxy NG documentation states uploads should use `/api/galaxy/` or an inbound namespace repository, while `/api/galaxy/content/published/` is not valid for uploads. Updated the URL and explanatory text.
- The public Galaxy sync example used undocumented `/api/galaxy/content/v3/sync/` endpoints. Replaced it with the documented Galaxy NG workflow: upload a `requirements.yaml` file to the `community` remote in Repository Management and start the sync from the UI.
- The namespace creation example used an incorrect `/api/galaxy/v3/namespaces/` endpoint and an unsupported permissions payload. Updated it to the documented `/api/_ui/v1/namespaces/` endpoint with a minimal namespace creation payload.
- The Nginx reverse proxy example pointed to ports `8080` and `24816`, which do not match the documented Galaxy NG compose stack. Updated the proxy targets to the documented local API and standalone UI ports.
- The description of Galaxy NG role support was too broad. Clarified that collections are the main Galaxy-compatible API surface and legacy roles are handled through the v1 API.

## Review Notes
The Docker Compose workflow documented by Galaxy NG is primarily a development/local evaluation stack. A production deployment should use the deployment method supported for the target environment and pin image/source versions rather than relying on a moving branch.
