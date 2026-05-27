# Validation Summary: How to Use Ansible to Create Kubernetes Secrets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Vault
- `kubernetes.core` Ansible collection
- Kubernetes Secrets
- Kubernetes TLS Secrets
- Kubernetes Docker registry pull Secrets
- YAML

## Sources Consulted
- Ansible `kubernetes.core` collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/index.html
- Ansible `kubernetes.core.k8s` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible `kubernetes.core.k8s_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- Ansible Vault documentation: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault.html
- Ansible `ansible-vault` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Kubernetes Secrets concept documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes managing Secrets using configuration files documentation: https://kubernetes.io/docs/tasks/configmap-secret/managing-secret-using-config-file/

## Issues Found
- The prerequisites listed Ansible 2.12+ and only the Python `kubernetes` library. Current `kubernetes.core` documentation lists supported ansible-core versions as 2.16.0 or newer, and the `k8s` module requires Python 3.9+, `kubernetes >= 24.2.0`, `PyYAML`, and `jsonpatch`. Updated the prerequisites and install command accordingly.
- The cleanup section claimed the task finds and removes secrets not referenced by any pod, but the code only lists managed secrets for manual review. Updated the section text and code comment to match the actual task behavior.
- The summary said Vault and `no_log` ensure sensitive values never leak into logs or console output. Ansible Vault only protects data at rest, and `no_log` reduces task-output exposure but is not a universal guarantee. Changed the wording to "help keep sensitive values out of logs and console output."

## Review Notes
The Kubernetes Secret examples use the correct `stringData` and `data` behavior, built-in Secret types, TLS keys, and Docker config JSON key. The rotation example intentionally uses `force: true`, which replaces an existing object according to the Ansible module documentation; readers should be careful to include all Secret keys they want to retain when using that pattern.
