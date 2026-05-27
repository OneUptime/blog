# Validation Summary: How to Use Ansible to Configure Blackbox Exporter

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Prometheus Blackbox Exporter
- Prometheus scrape configuration and alerting rules
- systemd service units
- YAML and Jinja2 templates

## Sources Consulted
- Prometheus Blackbox Exporter configuration reference: https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- Prometheus Blackbox Exporter README and permissions guidance: https://github.com/prometheus/blackbox_exporter
- Prometheus multi-target exporter pattern guide: https://prometheus.io/docs/guides/multi-target-exporter/
- Prometheus configuration reference for relabeling and special labels: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Ansible get_url module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible template module documentation for validate: https://docs.ansible.com/ansible/8/collections/ansible/builtin/template_module.html
- Ansible filter documentation for default(omit): https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html
- systemd.exec manual for AmbientCapabilities: https://www.freedesktop.org/software/systemd/man/256/systemd.exec.html

## Issues Found
- The `get_url` checksum expression embedded `default(omit)` inside a larger string, so the `checksum` parameter would not be omitted when `blackbox_checksum` was undefined. I changed it to omit the whole parameter unless `blackbox_checksum` is defined, while still formatting defined values as `sha256:<checksum>`.
- The Blackbox Exporter config template rendered scalar values directly. That could turn the HTTP POST body into a YAML mapping instead of the string required by Blackbox Exporter. I changed scalar, nested scalar, and list item rendering to use JSON-safe YAML-compatible output.
- The TCP Prometheus scrape job hard-coded `module: [tcp_connect]`, so the `mail.example.com:465` target with `module: tcp_tls` would still be probed as plain TCP. I changed the scrape config to set a per-target `module` label and relabel it to `__param_module`, matching the official Prometheus multi-target exporter pattern.
- The final "update targets" command used `--tags targets`, but the shown playbook tasks did not define a `targets` tag or a Prometheus reload-only flow. I changed the command to rerun the playbook after editing `group_vars/monitoring.yml`.

## Review Notes
- Blackbox Exporter `0.24.0` is valid for the shown config and supports `--config.check`, but it is no longer the latest release as of this review date. Readers should consider pinning a newer tested version and checksum.
- The ICMP guidance is valid: Linux ICMP probes need root, `CAP_NET_RAW`, or a suitable `net.ipv4.ping_group_range`; the systemd `AmbientCapabilities=CAP_NET_RAW` approach is plausible for the shown service.
