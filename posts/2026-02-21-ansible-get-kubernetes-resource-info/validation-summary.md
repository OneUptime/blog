# Validation Summary: How to Use Ansible to Get Kubernetes Resource Information

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- `kubernetes.core` Ansible collection
- `kubernetes.core.k8s_info` module
- `kubernetes.core.k8s` module
- Kubernetes API resources, labels, and field selectors
- YAML playbooks

## Sources Consulted
- Ansible Community Documentation: `kubernetes.core.k8s_info` module - https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- Ansible Community Documentation: `kubernetes.core.k8s` module - https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible Community Documentation: Kubernetes.Core collection - https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/
- Ansible Community Documentation: Introduction to Ansible for Kubernetes - https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/docsite/kubernetes_scenarios/k8s_intro.html
- Kubernetes Documentation: Labels and Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Documentation: Field Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The prerequisites listed Ansible 2.12+ and an unversioned Python `kubernetes` library. Current official `kubernetes.core` documentation lists support for ansible-core 2.16.0 or newer and the `k8s_info` module requires Python `kubernetes` 24.2.0 or newer, so the prerequisite lines were updated.

## Review Notes
The `k8s_info` examples use current module parameters such as `kind`, `name`, `namespace`, `api_version`, `label_selectors`, and `field_selectors`. Kubernetes label selector AND behavior and pod `status.phase` field selector usage match the official Kubernetes documentation.
