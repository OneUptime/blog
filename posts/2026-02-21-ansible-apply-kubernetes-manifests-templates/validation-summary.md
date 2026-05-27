# Validation Summary: How to Use Ansible to Apply Kubernetes Manifests from Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- ansible-core
- kubernetes.core collection
- Kubernetes manifests
- Jinja2 templates
- YAML

## Sources Consulted
- Ansible `kubernetes.core.k8s` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible `kubernetes.core` collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/
- Ansible `ansible.builtin.template` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_lookup.html
- Ansible `from_yaml_all` filter documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The prerequisites stated "Ansible 2.12+ with `kubernetes.core` collection", but the current `kubernetes.core` collection documentation lists support for ansible-core 2.16.0 or newer. Updated the prerequisite to ansible-core 2.16+ for the current collection.
- The installation command only installed the Kubernetes Python client. The current `kubernetes.core.k8s` module requirements also list PyYAML and jsonpatch, so the `pip install` command now includes `kubernetes PyYAML jsonpatch`.
- The post described `from_yaml_all` as returning a list. Ansible documents this filter as returning a generator of parsed YAML documents, so the text now describes parsed objects rather than a list.
- The full-stack loop iterated directly over `from_yaml_all`. Ansible's filter examples convert this generator with `| list` for loop usage, so the loop expression now uses `| from_yaml_all | list`.

## Review Notes
The Kubernetes Deployment, Service, ConfigMap, and autoscaling/v2 HPA manifest fields used in the examples are consistent with current Kubernetes documentation. The `kubernetes.core.k8s` examples are also consistent with the module documentation for using `definition` with `lookup('template', ...) | from_yaml` and multi-document YAML with `from_yaml_all`.
