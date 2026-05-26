# Validation Summary: How to Escape Double Curly Braces in Ansible Templates

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Ansible
- Jinja2 templates
- Prometheus alert rule templating
- Consul Template
- Grafana dashboard templating
- Terraform HCL interpolation

## Sources Consulted
- Jinja Template Designer Documentation, escaping and raw blocks: https://jinja.palletsprojects.com/en/stable/templates/#escaping
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/copy_module.html
- Prometheus template reference for alert labels and values: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- HashiCorp Consul Template CLI reference: https://developer.hashicorp.com/consul/docs/reference/consul-template/cli

## Issues Found
- The "Using Variables for Braces" example originally defined `left_brace: "{{"` and `right_brace: "}}"`. A plain `{{` value is parsed by Jinja as the start of an unfinished expression when Ansible templates the variable value. I changed the example to define those variables with Jinja literal-delimiter expressions: `left_brace: "{{ '{{' }}"` and `right_brace: "{{ '}}' }}"`.

## Review Notes
- The documented `{% raw %}` and `{{ '{{' }}` approaches match Jinja's official escaping guidance.
- The recommendation to use `ansible.builtin.copy` for files that do not need variable interpolation is consistent with Ansible's module guidance.
- Ansible also supports changing `variable_start_string` and `variable_end_string` through the template module or a `#jinja2:` header, which can be useful for larger templates, but the post's listed techniques are technically valid after the fix above.
