# Validation Summary: How to Use Ansible to Configure Grafana Dashboards

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Grafana dashboard provisioning
- Grafana HTTP API
- Grafana dashboard JSON
- Prometheus dashboard queries
- Shell and curl commands

## Sources Consulted
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana legacy Dashboard HTTP API documentation: https://grafana.com/docs/grafana/latest/http_api/dashboard/
- Grafana legacy Folder HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/folder/
- Grafana Folder/Dashboard Search HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/folder_dashboard_search/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/reference/dashboard/
- Grafana Stat visualization documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/stat/
- Ansible uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible regex_replace filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/regex_replace_filter.html
- Grafana.com dashboard download API responses for dashboard IDs 1860, 3662, 11074, and 22403.

## Issues Found
- The Mermaid diagram said file-based dashboard JSON files should be copied to `/etc/grafana/provisioning/dashboards/`. Grafana uses that directory for provisioning provider YAML files; dashboard JSON files should be placed in the provider's configured dashboard path, such as `/var/lib/grafana/dashboards`. Updated the diagram text to avoid the incorrect path.
- The community dashboard examples included outdated dashboard IDs that use removed or legacy panels, including Singlestat. Replaced them with current dashboard examples that are more suitable for modern Grafana.
- Downloaded Grafana.com dashboard JSON can contain `${DS_*}` datasource placeholders that Grafana's import UI normally maps interactively. File provisioning does not perform that interactive mapping, so the Ansible copy task now replaces those placeholders with the configured datasource UID.
- The verification `curl` command used an unquoted URL containing `&`, which would cause the shell to background part of the command. Quoted the URL.
- The example `curl` commands used `admin:password` while the post's default Grafana admin password was `changeme`. Updated the commands for consistency.

## Review Notes
The post uses Grafana's legacy `/api` endpoints for folders, dashboards, and search. These endpoints remain usable, but Grafana documentation notes that newer `/apis` routes are the forward-looking API surface. A future update could show the newer API structure for Grafana 12 and later.
