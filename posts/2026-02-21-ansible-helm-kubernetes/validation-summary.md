# Validation Summary: How to Use Ansible with Helm for Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- kubernetes.core Ansible collection
- Helm
- Kubernetes
- Helm charts and chart repositories
- Jinja2-templated YAML values

## Sources Consulted
- Ansible kubernetes.core.helm module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/helm_module.html
- Ansible kubernetes.core.helm_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/helm_repository_module.html
- Ansible kubernetes.core.helm_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/helm_info_module.html
- Ansible kubernetes.core.k8s_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Helm installation documentation: https://v3.helm.sh/docs/intro/install/
- Helm rollback command documentation: https://helm.sh/docs/v3/helm/helm_rollback/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- cert-manager Helm installation documentation: https://cert-manager.io/v1.14-docs/installation/helm/

## Issues Found
- The Helm deployment example used `wait_timeout: "5m0s"` with `kubernetes.core.helm`. The module documentation marks `wait_timeout` as deprecated for Helm command waits and recommends `timeout`, so the example now uses `timeout: "5m0s"`.
- The Helm release information task was labeled "List all Helm releases" but `kubernetes.core.helm_info` requires a release name and returns information for that release. The task name was changed to "Get Helm release information."
- The rollback example used `kubernetes.core.helm` with `state: present` and no `chart_ref`, which does not perform a Helm rollback. It now uses `ansible.builtin.command` with `helm rollback`, `--namespace`, and `--wait`, matching the Helm rollback CLI.
- The deployment verification task manually indexed `deploy_status.resources[0]` in an `until` condition, which can fail before the object exists or before status fields are populated. It now uses `kubernetes.core.k8s_info` with `wait: true`, `wait_timeout`, and a Deployment `Available` condition.
- The infrastructure provisioning example used `ansible.builtin.timezone`, but the current module is documented as `community.general.timezone`. The example now uses the correct fully qualified collection name.

## Review Notes
- The Helm install script shown installs Helm 3, which remains aligned with the kubernetes.core collection requirement of Helm 3 or newer. Helm 4 documentation is now current, so future updates may want to mention Helm 4 compatibility once the surrounding Kubernetes and Ansible tooling guidance is settled.
- The final "Common Use Cases" examples are valid Ansible patterns but are only loosely related to Helm-based Kubernetes deployments.
