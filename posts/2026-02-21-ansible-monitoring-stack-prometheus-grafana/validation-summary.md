# Validation Summary: How to Use Ansible to Set Up a Monitoring Stack (Prometheus + Grafana)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Prometheus
- Prometheus Node Exporter
- PromQL alerting rules
- Grafana
- Debian/Ubuntu APT repositories
- systemd

## Sources Consulted
- Ansible `apt_key` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible `apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Grafana Debian/Ubuntu installation documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/debian/
- Grafana data source HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/data_source/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/

## Issues Found
- The introduction said the playbook configured dashboards, but the code only configures a Prometheus data source in Grafana. Updated the text to match the implemented Grafana API task.
- The architecture diagram and Prometheus config included Alertmanager and Slack/email routing, but the post did not install or configure Alertmanager. Removed that wiring and the unused Alertmanager defaults so the displayed stack matches the provided Ansible implementation.
- The Prometheus target template assumed every inventory host had `ansible_host` defined. Updated it to fall back to the inventory hostname with `hostvars[host].ansible_host | default(host)`.
- The Grafana installation used the deprecated `apt_key` module. Replaced it with the current Grafana keyring plus `signed-by` APT repository pattern.
- The post defined `grafana_version` but installed the unpinned `grafana` package. Updated the `apt` task to install `grafana={{ grafana_version }}`.

## Review Notes
The snippets are written for Linux AMD64 hosts using Debian/Ubuntu package management for Grafana. The role still references templates such as `prometheus.service.j2` and `grafana.ini.j2` without showing their contents, so readers will need to provide those files in a real role.
