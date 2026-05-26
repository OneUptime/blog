# Validation Summary: How to Use Ansible to Deploy to Kubernetes via Helm

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- kubernetes.core Ansible collection
- community.general Ansible collection
- Kubernetes
- Helm
- YAML

## Sources Consulted
- Ansible kubernetes.core.helm module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/helm_module.html
- Ansible kubernetes.core.helm_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/helm_repository_module.html
- Ansible kubernetes.core.helm_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/helm_info_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible ansible.builtin.cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/
- Helm upgrade command documentation: https://helm.sh/docs/helm/helm_upgrade/
- Helm rollback command documentation: https://helm.sh/docs/helm/helm_rollback/

## Issues Found
- The prerequisite commands installed only `kubernetes.core`, but later examples use modules from `community.general`. Added `ansible-galaxy collection install community.general`.
- The basic Helm deployment used `wait_timeout`, which current `kubernetes.core.helm` documentation marks deprecated for waiting on Kubernetes commands. Replaced it with the supported `timeout` parameter.
- The Helm release assertion compared `item.status.status` only to lowercase `deployed`, while the collection documentation describes status values such as `DEPLOYED`. Changed the assertion to compare `item.status.status | lower` with `deployed`.
- The infrastructure example used `ansible.builtin.timezone`, but the current timezone module is documented as `community.general.timezone`. Updated the FQCN.
- The conclusion stated that `atomic` always rolls failed deployments back. Helm install with `--atomic` deletes the failed install, while Helm upgrade with `--atomic` rolls back changes. Reworded the sentence to distinguish failed upgrades from failed installs.

## Review Notes
The Helm chart versions shown are pinned examples and may be old, but the repository URLs and chart reference patterns are valid. The generic "Common Use Cases" examples are not specific to Helm deployment and could be tightened in a future editorial pass, but they are syntactically plausible after the module FQCN correction.
