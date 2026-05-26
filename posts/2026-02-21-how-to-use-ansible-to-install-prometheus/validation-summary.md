# Validation Summary: How to Use Ansible to Install Prometheus

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Prometheus
- Prometheus configuration and promtool
- systemd service units
- YAML and Jinja2 templates

## Sources Consulted
- Prometheus installation documentation: https://prometheus.io/docs/prometheus/latest/installation/
- Prometheus download page: https://prometheus.io/download/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus command-line flag reference: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus management API documentation: https://prometheus.io/docs/prometheus/latest/management_api/
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- systemd resource-control documentation: https://www.freedesktop.org/software/systemd/man/249/systemd.resource-control.html

## Issues Found
- The default Prometheus version was outdated. Changed `prometheus_version` from `2.48.1` to the current stable Prometheus release, `3.11.3`, as listed on the official Prometheus download page.
- The systemd service used Prometheus retention CLI flags. In current Prometheus documentation, `--storage.tsdb.retention.time` and `--storage.tsdb.retention.size` are deprecated in favor of configuration-file retention settings. Moved retention configuration into the `storage.tsdb.retention` section of `prometheus.yml.j2` and removed the deprecated service flags.
- The systemd service used deprecated `MemoryLimit=`. Replaced it with `MemoryMax=`, which systemd documents as the replacement for `MemoryLimit=`.
- The Ansible `copy` tasks combined `remote_src: true` with explicit numeric modes. Current Ansible documentation states that `remote_src` works with `mode=preserve`, so the binary and console copy tasks now use `mode: preserve`.

## Review Notes
The health check endpoint, configuration reload behavior through `SIGHUP`, `promtool check config` validation pattern, Prometheus scrape configuration fields, Alertmanager configuration shape, and systemd reload handler behavior were checked against official documentation and are technically correct.
