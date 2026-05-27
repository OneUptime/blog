# Validation Summary: How to Use Ansible to Manage Kubernetes RBAC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Kubernetes
- Kubernetes RBAC
- Kubernetes ServiceAccounts
- Ansible `kubernetes.core.k8s` module
- Ansible `kubernetes.core.k8s_info` module
- Ansible `subelements` filter

## Sources Consulted
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes RBAC API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/
- Ansible `kubernetes.core.k8s` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible `kubernetes.core.k8s_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- Ansible `ansible.builtin.subelements` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/subelements_filter.html

## Issues Found
- The read-only ClusterRole example used `resources: ["*"]` for the core API group and then attempted to exclude Secrets with a second rule using `verbs: []`. Kubernetes RBAC permissions are additive and do not support deny rules, so the wildcard rule would grant read access to Secrets. I changed the example to enumerate common non-secret resources and removed the ineffective deny-style rule.

## Review Notes
- The examples assume the `kubernetes.core` Ansible collection is installed and the Ansible controller has Kubernetes API credentials available through the usual kubeconfig or module authentication settings.
- The RBAC examples are intentionally illustrative. Production policies should be tailored to the exact resources each team or automation system needs.
