# Validation Summary: How to Use the to_nice_yaml Filter in Ansible Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Jinja2 templates and filters
- PyYAML/YAML serialization
- Kubernetes ConfigMap manifests
- Ansible YAML inventory
- Prometheus configuration
- Helm values files

## Sources Consulted
- Ansible `ansible.builtin.to_nice_yaml` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/to_nice_yaml_filter.html
- Ansible `ansible.builtin.to_yaml` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/to_yaml_filter.html
- Ansible `ansible.builtin.indent` / Jinja indent filter documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/indent_filter.html
- Ansible YAML inventory plugin documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/yaml_inventory.html
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/

## Issues Found
- Corrected the opening description to avoid implying that only `to_nice_yaml` supports indentation and width controls. Current Ansible documentation shows both `to_yaml` and `to_nice_yaml` accept `indent` and `width`; the practical distinction is that `to_nice_yaml` produces expanded, readable block-style YAML by default.
- Corrected the list indentation examples. Actual `to_nice_yaml(indent=2)` and `to_nice_yaml(indent=4)` output from Ansible/PyYAML uses indentationless sequence style for block sequences, and dictionary keys are sorted by default.
- Corrected the `to_nice_yaml` versus `to_yaml` comparison table so it reflects current filter parameters and output-style differences.
- Corrected the section about strings that look like other types. `to_nice_yaml` serializes already-typed strings such as `"on"` as quoted strings; the real risk is unquoted YAML values being parsed as booleans, nulls, or numbers before the filter receives them.

## Review Notes
Verified the filter behavior locally with `ansible-core 2.19.10` installed into `/tmp/ansible-core-verify` because Ansible was not installed globally in the environment. The examples use the short filter names (`to_nice_yaml`, `to_yaml`, and `indent`), which are still supported; Ansible documentation recommends FQCNs mainly for linkability and avoiding name conflicts.
