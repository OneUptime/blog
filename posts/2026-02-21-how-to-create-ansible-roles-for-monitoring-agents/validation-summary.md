# Validation Summary: How to Create Ansible Roles for Monitoring Agents

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible roles and built-in modules
- Prometheus Node Exporter
- systemd services
- exporter-toolkit web configuration
- UFW and firewalld firewall management
- Node Exporter textfile collector

## Sources Consulted
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/
- Prometheus Node Exporter README and collector documentation: https://github.com/prometheus/node_exporter
- Prometheus Node Exporter releases: https://github.com/prometheus/node_exporter/releases
- Prometheus exporter-toolkit web configuration documentation: https://github.com/prometheus/exporter-toolkit/blob/master/docs/web-configuration.md
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible unarchive module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/unarchive_module.html
- Ansible UFW module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible firewalld module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/firewalld_module.html
- systemd service command-line substitution documentation: https://www.freedesktop.org/software/systemd/man/systemd.service.html

## Issues Found
- The role exposed TLS and basic-auth variables but did not create the exporter-toolkit `web-config.yml` required by `--web.config.file`. Added `web-config.yml.j2` to the role structure, added tasks to create `/etc/node_exporter` and deploy the config, and updated the environment template to pass `--web.config.file` when either TLS or basic auth is enabled.
- The Red Hat/firewalld task ignored `node_exporter_firewall_source` and opened the port without a source restriction. Split the firewalld example into an unrestricted port rule for `0.0.0.0/0` and a source-limited rich rule for specific CIDRs.
- The examples used Node Exporter `1.7.0`, which is no longer current. Updated the default and usage examples to `1.11.1`, matching the current Prometheus Node Exporter release checked during review.

## Review Notes
- The Ansible module usage is otherwise consistent with current module documentation. `ansible.builtin.systemd` remains a backward-compatible alias for `ansible.builtin.systemd_service`.
- Node Exporter supports collectors with `--collector.<name>` and disables default collectors with `--no-collector.<name>` as shown. The `systemd` and `processes` collectors are disabled by default and valid to enable explicitly.
- Basic-auth password values in `node_exporter_basic_auth_users` must be bcrypt hashes, as required by exporter-toolkit.
