# Validation Summary: How to Use Ansible Raw Strings to Avoid Jinja2 Templating

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Jinja2 templating
- YAML
- Prometheus alerting rules
- Grafana dashboard JSON
- Alertmanager notification templates

## Sources Consulted
- Ansible advanced playbook syntax: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_advanced_syntax.html
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible lookup plugins documentation: https://docs.ansible.com/projects/ansible/8/plugins/lookup.html
- Jinja template designer documentation: https://jinja.palletsprojects.com/en/stable/templates/#escaping
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/2.53/configuration/alerting_rules/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Grafana Prometheus query editor documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/query-editor/

## Issues Found
- The post said `{{ $value }}` and `{{ $labels.instance }}` fail as undefined Ansible variables. In Jinja2, `$value` is invalid variable syntax, so this fails as a template syntax error. Updated the explanation accordingly.
- The post described a "raw Lookup Plugin" and initially said the `file` lookup with `!unsafe` works well. Ansible lookups are Jinja expressions, and marking the whole scalar `!unsafe` prevents that expression from being templated. Updated the heading and explanation to recommend `copy` with `src` for external files that should not be templated.
- The post claimed it covered every technique. Updated that wording to "the most common techniques" to avoid overclaiming.

## Review Notes
The Ansible `!unsafe`, Jinja2 `{% raw %}` block, inline delimiter escaping with `{{ '{{' }}`, and `copy` with `src` recommendations are consistent with current official documentation. Alertmanager and Prometheus examples use valid Go-template style syntax for notification templates and alert annotations.
