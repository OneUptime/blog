# Validation Summary: How to Use Ansible to Set Up Infrastructure Dashboards

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Grafana
- Grafana provisioning
- Grafana Dashboard HTTP API
- Prometheus
- Loki
- Debian/Ubuntu APT repositories
- Jinja2 templates
- YAML and JSON configuration

## Sources Consulted
- Grafana Debian/Ubuntu installation documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/debian/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Dashboard HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- Grafana configuration documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Ansible apt_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible tags documentation: https://ansible.readthedocs.io/projects/ansible/9/playbook_guide/playbooks_tags.html

## Issues Found
- The Grafana APT repository setup used `ansible.builtin.apt_key` and an unsigned repository stanza. Ansible documents that the underlying `apt-key` utility is deprecated and removed in modern Debian versions, and Grafana's current Debian/Ubuntu install docs use a keyring file with `signed-by`. Updated the role example to create `/etc/apt/keyrings`, download Grafana's full signing key to `/etc/apt/keyrings/grafana.asc`, and reference it in the APT repository line.
- The deployment section claimed dashboards could be updated with `--tags dashboards`, but the dashboard copy task had no `dashboards` tag. Added `tags: dashboards` to the dashboard copy task so the command selects the intended task.
- The same dashboard copy task notified `Restart Grafana`, contradicting the "without restarting Grafana" command and Grafana's dashboard provider polling behavior. Removed the restart notification from dashboard JSON copies so updates can be picked up by the provider scan interval.
- The Grafana API example wrapped the whole JSON file under `dashboard`, but the post's dashboard JSON uses Grafana's dashboard provisioning wrapper with a top-level `dashboard` key. Updated the API body to submit the nested dashboard model via `(lookup('file', item) | from_json).dashboard`, matching the Dashboard HTTP API body schema.

## Review Notes
- Grafana `admin_password` in `grafana.ini` is only applied on first run for the default admin user; later password rotation should use Grafana's user management/API workflows.
- Ansible was not installed in the local environment, so CLI syntax was reviewed against official documentation rather than local `ansible-playbook --help` output.
