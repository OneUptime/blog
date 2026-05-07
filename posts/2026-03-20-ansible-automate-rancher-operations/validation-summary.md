# Validation Summary: How to Use Ansible to Automate Rancher Operations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Ansible
- Kubernetes
- `kubernetes.core` Ansible collection
- Kubeconfig-based API authentication

## Sources Consulted
- Rancher RK-API Quick Start Guide: https://ranchermanager.docs.rancher.com/api/quickstart
- Rancher API Keys: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher Previous v3 Rancher API Guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher How Resource Quotas Work in Rancher Projects: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Ansible Introduction to Ansible for Kubernetes: https://docs.ansible.com/ansible/latest/collections/kubernetes/core/docsite/kubernetes_scenarios/k8s_intro.html
- Ansible `kubernetes.core.k8s` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible `kubernetes.core.k8s_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html

## Issues Found
- The namespace provisioning example used a hand-constructed Rancher v3 REST path and auth pattern that do not match Rancher's current guidance. I replaced it with a supported `kubernetes.core.k8s` namespace creation example that assigns the namespace to a Rancher project via the documented `field.cattle.io/projectId` annotation.
- The post implied `Ansible 2.12+` was sufficient, but current Ansible Kubernetes collection guidance documents `Ansible 2.16.0 or latest` and a Kubernetes Python client on the execution host. I updated the prerequisites and dependency installation step accordingly.
- The deployment example passed a rendered Jinja template string to `definition`. I changed it to the documented `template:` parameter for `kubernetes.core.k8s`.
- The deployment readiness check omitted `api_version: apps/v1` for a `Deployment`. I added it so the object lookup is explicit and correct.
- The pod label selector example was normalized to the documented selector format, and the run commands were updated to pass `kubeconfig_path`, which the playbooks depend on.

## Review Notes
- Rancher documents that legacy v3 API tokens are being phased out starting in Rancher v2.14, so kubeconfig-based automation against Rancher and Kubernetes APIs is the safer current pattern.
- The post is technically valid after the fixes, but its description still mentions user provisioning while the body focuses on namespace provisioning and application deployment.
