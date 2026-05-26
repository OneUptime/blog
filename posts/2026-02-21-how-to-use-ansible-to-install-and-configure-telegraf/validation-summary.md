# Validation Summary: How to Use Ansible to Install and Configure Telegraf

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Telegraf
- InfluxDB
- Prometheus
- Debian/Ubuntu APT repositories
- TOML configuration

## Sources Consulted
- Telegraf installation documentation: https://docs.influxdata.com/telegraf/v1/install/
- Telegraf commands and flags documentation: https://docs.influxdata.com/telegraf/v1/commands/
- Telegraf configuration documentation: https://docs.influxdata.com/telegraf/v1/configuration/
- Telegraf plugin directory: https://docs.influxdata.com/telegraf/v1/plugins/
- Telegraf InfluxDB v2 output plugin documentation: https://docs.influxdata.com/telegraf/v1/output-plugins/influxdb_v2/
- Telegraf Prometheus client output plugin documentation: https://docs.influxdata.com/telegraf/v1/output-plugins/prometheus_client/
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible apt_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible apt_repository module documentation: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/apt_repository_module.html
- Ansible deb822_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/deb822_repository_module.html

## Issues Found
- The installation snippet used `ansible.builtin.apt_key` and an older `deb https://repos.influxdata.com/ubuntu {{ ansible_distribution_release }} stable` repository line. Current InfluxData documentation uses the signed keyring pattern with `https://repos.influxdata.com/debian stable main`, and Ansible documents `apt_key`/`apt-key` as deprecated for modern systems. Updated the role to use `ansible.builtin.deb822_repository` with InfluxData's current repository URL, suite, component, and signing key URL.
- The prerequisite package list included tools needed by the old `apt_key` flow. Replaced them with `ca-certificates` and `python3-debian`, which are relevant to HTTPS APT access and Ansible's `deb822_repository` module requirements.
- The introduction claimed Telegraf supports "over 300 input plugins." Official Telegraf documentation describes a plugin-driven agent with input, output, aggregator, and processor categories. Adjusted the wording to "hundreds of plugins, including input plugins" to avoid overstating that the count applies only to input plugins.
- The summary said the example role supports "any input or output plugin," but the template only implements generic input sections plus the InfluxDB v2 and Prometheus output branches shown in the post. Updated the sentence to describe that narrower support accurately.

## Review Notes
- The Telegraf `--config`, `--test`, `--input-filter`, `outputs.influxdb_v2`, and `outputs.prometheus_client` options used in the post match current official documentation.
- The updated repository task uses `ansible.builtin.deb822_repository`, which is available in ansible-core 2.15 and newer.
