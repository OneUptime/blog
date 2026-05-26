# Validation Summary: How to Use the to_yaml Filter in Ansible Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Jinja2 templates and filters
- YAML / PyYAML serialization
- Kubernetes manifests
- Docker Compose files
- GitLab CI configuration

## Sources Consulted
- Ansible `ansible.builtin.to_yaml` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/to_yaml_filter.html
- Ansible `ansible.builtin.to_nice_yaml` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/to_nice_yaml_filter.html
- Ansible `ansible.builtin.indent` filter documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/indent_filter.html
- Jinja `indent` filter documentation: https://jinja.palletsprojects.com/en/stable/templates/#jinja-filters.indent
- Ansible playbook filters guide: https://docs.ansible.com/projects/ansible-core/2.19/playbook_guide/playbooks_filters.html
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ee/ci/yaml/

## Issues Found
- The post claimed `to_yaml` produces block-style YAML by default. Current Ansible behavior wraps PyYAML `yaml.dump`, and simple dictionaries/lists render in flow style by default. Updated the basic dictionary and list outputs and added `default_flow_style=false` where the post needs block-style YAML.
- The Kubernetes and indentation examples showed block-style nested YAML while using plain `to_yaml`. Updated those examples to call `to_yaml(default_flow_style=false)` so the shown output and nesting guidance are accurate.
- The Docker Compose template included top-level `version: "3.8"`, which Docker now documents as obsolete and only retained for backward compatibility. Removed the `version` line from the generated template.
- The comparison table incorrectly said only `to_nice_yaml` has configurable indentation and line width. Ansible documents `indent` and `width` keyword parameters for both `to_yaml` and `to_nice_yaml`; updated the table accordingly.
- The long-string note said to use only `to_nice_yaml` for `width`. Updated it to mention that both `to_yaml` and `to_nice_yaml` support `width`.
- The boolean note referred to `true`/`false` as Python booleans. Updated it to call them YAML booleans.

## Review Notes
Ansible was not installed in the workspace, so direct `ansible-doc` checks were unavailable. I verified behavior against official Ansible documentation and installed `ansible-core` into a temporary pip target to confirm the current rendered output for the shown `to_yaml` examples.
