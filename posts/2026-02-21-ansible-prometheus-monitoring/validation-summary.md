# Validation Summary: How to Use Ansible with Prometheus for Monitoring Setup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Prometheus server configuration
- Prometheus Node Exporter
- Prometheus alerting rules and PromQL
- Alertmanager integration
- systemd services
- UFW firewall management
- Cron scheduling

## Sources Consulted
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/template_module.html
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.unarchive` module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/unarchive_module.html
- Ansible `ansible.builtin.user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible `ansible.builtin.service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible facts and magic variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus promtool documentation: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus PromQL querying documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus Alertmanager documentation: https://prometheus.io/docs/alerting/latest/alertmanager/

## Issues Found
- The Node Exporter systemd unit ran as `User=prometheus`, but the Node Exporter role did not ensure that the `prometheus` user existed on monitored hosts. Added a `Create prometheus user` task to the Node Exporter role snippet so the service account exists before systemd starts the exporter.
- The Prometheus scrape target template used `hostvars[host].ansible_host` directly. Inventory entries do not always define `ansible_host`, so rendering could fail for valid inventories. Updated the node and app scrape targets to use `hostvars[host].ansible_host | default(host)`.

## Review Notes
The examples are technically valid as role/playbook snippets, but a complete implementation still needs matching handlers for the notified `daemon reload`, `restart prometheus`, `reload prometheus`, and `restart node_exporter` operations, plus a concrete `prometheus.service.j2` template. The Prometheus, alert rule, promtool, Ansible module, UFW, URI, and cron syntax shown in the post is consistent with current official documentation.
