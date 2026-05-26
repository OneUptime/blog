# Validation Summary: How to Use the kubernetes.core Collection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- kubernetes.core Ansible collection
- Kubernetes workloads and resources
- Kubernetes Ingress, Services, ConfigMaps, Secrets, ResourceQuotas, and Deployments
- Helm
- Ansible Vault

## Sources Consulted
- Ansible kubernetes.core collection index: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/index.html
- Ansible kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible kubernetes.core.k8s_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- Ansible kubernetes.core.k8s_cluster_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_cluster_info_module.html
- Ansible kubernetes.core.k8s_exec module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_exec_module.html
- Ansible kubernetes.core.k8s_rollback module documentation: https://docs.ansible.com/projects/ansible/devel/collections/kubernetes/core/k8s_rollback_module.html
- Ansible kubernetes.core.helm module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/helm_module.html
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Ingress API documentation: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/

## Issues Found
- The `k8s_info` Deployment query omitted `api_version`. The module defaults to `v1`, but Deployments are in `apps/v1`, so I added `api_version: apps/v1`.
- The rollback example manually scaled and patched the Deployment image instead of using the collection's documented rollback module. I replaced it with `kubernetes.core.k8s_rollback` using `api_version: apps/v1`, `kind: Deployment`, `name`, and `namespace`.

## Review Notes
- The local environment does not have `ansible-galaxy` or `ansible-doc` installed, so command/module verification was performed against official Ansible and Kubernetes documentation rather than local CLI help.
- The `src` URL example requires kubernetes.core 2.4.0 or newer; current official documentation supports this.
