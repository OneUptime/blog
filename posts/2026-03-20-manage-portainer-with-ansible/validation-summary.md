# Validation Summary: How to Manage Portainer with Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Portainer REST API
- Ansible
- YAML
- Infrastructure as Code

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Accessing the Portainer API: https://docs.portainer.io/api/access
- Add an environment via the Portainer API: https://docs.portainer.io/admin/environments/add/api
- Portainer CE OpenAPI specification 2.39.1: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin` collection documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/index.html

## Issues Found
- The setup section instructed readers to install `ansible.builtin` with `ansible-galaxy` and install Python `requests`, but the post only uses built-in `ansible-core` modules and does not require `requests`. I replaced this with an Ansible installation verification step.
- The prerequisites said Python with `requests` was needed on the control machine. The documented playbooks run Ansible modules on the managed hosts, so I corrected this to Python 3.8+ on the managed hosts.
- The environment creation example sent JSON to `POST /api/endpoints`, but the current Portainer API defines this endpoint as `multipart/form-data`. I changed the playbook to use `body_format: form-multipart`.
- The environment example included a TLS-enabled remote Docker endpoint without the certificate files required by Portainer's documented API flow. I removed the incomplete TLS example and kept the example aligned with Portainer's documented remote TCP environment creation flow.
- The stack deployment example used `slurp`, which reads files from the managed host, even though the compose files are shown as local project files. I changed this to `lookup('file', ...)` so the compose files are read from the control machine.
- The stack deployment example built the `Env` payload incorrectly. I changed it to use `dict2items(key_name='name', value_name='value')`, which matches Portainer's `portainer.Pair` schema for stack environment variables.
- The stack deployment example selected the first Portainer environment arbitrarily. I added `target_environment_name` and changed the playbook to resolve the environment ID by name.
- The stack existence check queried all stacks without filtering by environment and did not account for Portainer's `204 No Content` response when no stacks exist. I updated the example to filter by `EndpointID` and accept `200` or `204`.
- The vault variables example was incomplete because later sections referenced `vault_grafana_password`, `vault_db_password`, `vault_app_secret`, and `vault_user_passwords`. I added those placeholders to keep the post internally consistent.
- The user and team creation examples accepted undocumented `201` responses and sent the user role through a quoted template. I changed the examples to use the documented `200` success response, build JSON bodies with `to_json`, and create users and teams only when missing.
- The final command referenced `site.yml`, but the post never defined that file. I removed the command.

## Review Notes
- The post still authenticates with a JWT from `/api/auth`, which is supported by Portainer's API examples and OpenAPI spec. Portainer also documents API access tokens via `X-API-Key`, but the JWT-based approach used here is still valid.
- The examples keep `validate_certs: false` for simplicity. This works for self-signed or lab deployments, but production usage should validate TLS certificates whenever possible.
