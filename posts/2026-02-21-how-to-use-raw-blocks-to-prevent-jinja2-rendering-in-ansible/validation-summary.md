# Validation Summary: How to Use raw Blocks to Prevent Jinja2 Rendering in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Jinja2
- Prometheus alerting rule templates
- Consul Template
- Terraform HCL
- Envoy access log formatting
- YAML

## Sources Consulted
- Jinja Template Designer Documentation: https://jinja.palletsprojects.com/en/stable/templates/#escaping
- Ansible templating documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_templating.html
- Ansible template module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible copy module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible error handling documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Consul Template documentation: https://developer.hashicorp.com/consul/docs/automate/consul-template
- Consul Template Go language reference: https://developer.hashicorp.com/consul/docs/reference/consul-template/go
- Terraform language documentation: https://developer.hashicorp.com/terraform/language
- Terraform strings and templates documentation: https://developer.hashicorp.com/terraform/language/expressions/strings
- Envoy access log documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html

## Issues Found
- The Terraform section implied Terraform HCL variables require raw blocks. Terraform uses `${...}` interpolation and `var.name` references, not Jinja-style `{{...}}` delimiters, so the raw block markers were removed and the surrounding text was corrected.
- The Envoy section claimed Envoy uses Go template syntax for the shown access log format and used `{{.upstream_host}}`. Envoy access logs use `%...%` command operators, so the example was corrected to `%UPSTREAM_HOST%` and the explanatory text was updated.
- The testing playbook used `grep -c '{{ .labels'`, which did not match the Prometheus `$labels` syntax shown earlier and would be unsafe as a literal Jinja-looking string in an Ansible task argument. It now uses `ansible.builtin.command` with `argv`, a regex that avoids literal `{{` templating syntax, and `failed_when: false` so the later assertion reports the validation failure.
- The performance note overclaimed that raw blocks have "essentially zero" overhead and that Jinja simply skips parsing the section. The wording was softened to say the overhead is negligible in typical templates and that expressions inside the raw section are not evaluated.

## Review Notes
The core explanation of Jinja raw blocks, the no-nesting behavior, using `copy` for fully static files, and the Prometheus and Consul Template examples are technically sound. YAML snippets were parsed locally, and Jinja raw/nested behavior was checked locally with Jinja2.
