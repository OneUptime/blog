# Validation Summary: How to Use the from_yaml Filter in Ansible Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Jinja2 templates and filters
- YAML and JSON parsing
- Kubernetes kubectl YAML output
- Helm values files
- GitHub Actions workflow YAML

## Sources Consulted
- Ansible `ansible.builtin.from_yaml` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/from_yaml_filter.html
- Ansible `ansible.builtin.from_yaml_all` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/from_yaml_all_filter.html
- Ansible `ansible.builtin.slurp` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/slurp_module.html
- Ansible `ansible.builtin.b64decode` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/b64decode_filter.html
- Ansible `ansible.builtin.combine` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/combine_filter.html
- Ansible `ansible.builtin.assert` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible filter plugin usage documentation: https://docs.ansible.com/projects/ansible/latest/plugins/filter.html
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The multi-document YAML section said `from_yaml` parses only the first document. Ansible documents `from_yaml` as a wrapper around PyYAML `yaml.safe_load`, which expects one document; multi-document input should use `from_yaml_all`. I updated the prose and code comment to say `from_yaml` expects a single YAML document.
- The GitHub Actions example used `workflow.on`. With PyYAML-style loading, an unquoted `on:` key can be parsed as boolean `true`, so that expression can miss the workflow triggers. I changed it to `workflow.get('on', workflow.get(true, {}))` so it works with either a string `on` key or a boolean `true` key.

## Review Notes
- Ansible was not installed in the local environment, so I could not run `ansible-doc` or execute the playbook snippets directly. I cross-checked the examples against current official Ansible and Kubernetes documentation and used local PyYAML behavior to confirm the multi-document and `on:` parsing edge cases.
