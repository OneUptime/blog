# Validation Summary: How to Use Ansible to Configure Custom Metrics Collection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Prometheus
- Prometheus Node Exporter textfile collector
- Prometheus Pushgateway
- Python prometheus_client
- PostgreSQL psycopg2
- Bash
- systemd
- cron

## Sources Consulted
- Ansible cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible pip module documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html
- Prometheus Node Exporter textfile collector documentation: https://github.com/prometheus/node_exporter/blob/master/README.md
- Prometheus exposition formats documentation: https://prometheus.io/docs/instrumenting/exposition_formats/
- Prometheus Python client Gauge documentation: https://prometheus.github.io/client_python/instrumenting/gauge/
- Prometheus Python client HTTP exporter documentation: https://prometheus.github.io/client_python/exporting/http/
- Prometheus Pushgateway documentation: https://github.com/prometheus/pushgateway
- Prometheus Pushgateway best practices: https://prometheus.io/docs/practices/pushing/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The textfile collector description implied Node Exporter automatically reads the output directory. Updated it to state that Node Exporter reads from the directory configured with `--collector.textfile.directory`, matching the official Node Exporter documentation.
- The initial metric file write used `item.stdout`, which strips the script's trailing newline. Added `\n` so the generated `.prom` files satisfy the Prometheus text format requirement that the final line ends with a line feed.
- The custom exporter installed Python packages into the system Python environment. Updated the Ansible `pip` task to install into a virtual environment and updated the systemd service to run the exporter with that venv's Python, avoiding failures on modern PEP 668 externally managed Python installations.
- The Pushgateway guidance described Pushgateway broadly for batch jobs. Narrowed it to service-level batch jobs to match Prometheus Pushgateway best practices.
- The Pushgateway default version was outdated. Updated it from `1.7.0` to `1.11.2`, the latest release shown by the official Prometheus Pushgateway repository at review time.

## Review Notes
The examples are intentionally generic and assume supporting packages such as `curl`, `bc`, `openssl`, `python3-venv`, and Node Exporter are already installed and configured where needed. The Pushgateway role structure is shown, but the post does not include the role tasks that install and run the Pushgateway service.
