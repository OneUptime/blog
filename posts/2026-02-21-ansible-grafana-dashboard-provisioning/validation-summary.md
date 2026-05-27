# Validation Summary: How to Use Ansible with Grafana for Dashboard Provisioning

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Grafana
- Grafana dashboard provisioning
- Grafana HTTP API
- Prometheus data source configuration
- Loki data source configuration
- UFW
- Cron

## Sources Consulted
- Grafana documentation: Install Grafana on Debian or Ubuntu, https://grafana.com/docs/grafana/latest/installation/debian/
- Grafana documentation: Provision Grafana, https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana documentation: HTTP API reference, https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/
- Grafana documentation: Dashboard HTTP API, https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- Grafana documentation: Data source HTTP API, https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/data_source/
- Grafana documentation: Service accounts, https://grafana.com/docs/grafana/latest/administration/service-accounts/
- Ansible documentation: ansible.builtin.apt_key module, https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible documentation: ansible.builtin.deb822_repository module, https://docs.ansible.com/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- Ansible documentation: ansible.builtin.uri module, https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible documentation: community.general.ufw module, https://docs.ansible.com/ansible/latest/collections/community/general/ufw_module.html

## Issues Found
- The installation example used `ansible.builtin.apt_key`, which relies on the deprecated and removed `apt-key` utility on modern Debian systems. Replaced the separate key and repository tasks with `ansible.builtin.deb822_repository` using Grafana's signing key URL, matching current Ansible and Grafana repository guidance.
- The Grafana API examples used a `grafana_api_key` variable name. Grafana documentation now treats service account tokens as the primary authentication method for API automation, so the examples now use `grafana_service_account_token`.
- The dashboard provisioning tasks wrote templates into `/var/lib/grafana/dashboards` without ensuring the directory exists. Added an Ansible `file` task to create the directory with Grafana-readable ownership and permissions before deploying dashboard JSON.

## Review Notes
- The Grafana `/api` HTTP endpoints shown in the post are legacy endpoints and Grafana documents the `/apis` API family for newer dashboard APIs. The legacy endpoints are still documented as accessible, but they will no longer receive new updates, so a future refresh could migrate API-based dashboard examples to the new dashboard API format.
- The generic "Common Use Cases" examples are valid Ansible patterns, but they are broader infrastructure examples rather than Grafana-specific dashboard provisioning.
