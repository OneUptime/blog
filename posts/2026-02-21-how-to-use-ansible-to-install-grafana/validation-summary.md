# Validation Summary: How to Use Ansible to Install Grafana

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Grafana
- Debian/Ubuntu APT repositories
- systemd
- Grafana datasource provisioning
- Grafana plugin management

## Sources Consulted
- Grafana Debian/Ubuntu installation documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/debian/
- Grafana server CLI documentation: https://grafana.com/docs/grafana/latest/administration/cli/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana configuration documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana start/restart documentation: https://grafana.com/docs/grafana/latest/setup-grafana/start-restart-grafana/
- Ansible apt_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible deb822_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- Grafana Clock plugin catalog page: https://grafana.com/grafana/plugins/grafana-clock-panel/
- Grafana Polystat plugin catalog page: https://grafana.com/grafana/plugins/grafana-polystat-panel/
- Grafana Pie Chart plugin catalog page: https://grafana.com/grafana/plugins/grafana-piechart-panel/
- Grafana Worldmap plugin catalog page: https://grafana.com/grafana/plugins/grafana-worldmap-panel/

## Issues Found
- The installation task used `ansible.builtin.apt_key` and an unsigned `apt_repository` entry. Ansible documents `apt-key` as deprecated and removed in modern Debian versions, and Grafana's current APT instructions use a signed repository key. I replaced those tasks with `ansible.builtin.deb822_repository` using Grafana's current `gpg-full.key` URL and added `python3-debian` for the module requirement.
- The prerequisite package list included `software-properties-common`, which is not needed for the revised repository task, and omitted `gnupg`, which Grafana lists in its current Debian/Ubuntu prerequisites. I updated the package list accordingly.
- The plugin tasks used the legacy `grafana-cli` command form. Grafana's current CLI documentation uses `grafana cli`. I updated both plugin list and install commands.
- The examples included `grafana-piechart-panel` and `grafana-worldmap-panel`. The Pie Chart plugin is deprecated because Pie Chart is built into Grafana, and Worldmap is an older plugin with a Geomap migration warning. I replaced them with `grafana-polystat-panel`, a maintained Grafana panel plugin, while keeping the existing Clock plugin.

## Review Notes
The remaining Ansible snippets and Grafana provisioning examples match the documented module names, service name, configuration file location, and datasource provisioning fields. For production use, the example admin password and secret values should be stored in Ansible Vault or another secret manager, as the playbook section demonstrates for the admin password.
