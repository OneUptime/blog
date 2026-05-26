# Validation Summary: How to Store API Keys in Ansible Vault

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible Vault
- Ansible playbooks and built-in modules
- Jinja2 templates and Ansible filters
- systemd service environment files
- Docker Compose
- Kubernetes Secrets

## Sources Consulted
- Ansible Vault guide: https://docs.ansible.com/ansible/latest/vault_guide/vault.html
- Ansible Vault encryption guide: https://docs.ansible.com/ansible/latest/vault_guide/vault_encrypting_content.html
- ansible-vault CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- ansible.builtin.template module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- ansible.builtin.uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible filters documentation: https://docs.ansible.com/projects/ansible-core/2.19/playbook_guide/playbooks_filters.html
- Ansible logging and no_log documentation: https://docs.ansible.com/ansible/8/reference_appendices/logging.html
- systemd.exec EnvironmentFile documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Kubernetes Secret API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/secret-v1/
- kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html

## Issues Found
- The structured YAML configuration template rendered secrets as unquoted plain scalars. This can produce invalid YAML or wrong scalar interpretation when API keys contain YAML-significant characters. Updated those values to use Ansible's `to_json` filter, which emits a valid quoted scalar for YAML-compatible output.
- The inline `ansible-vault encrypt_string` examples put secret values directly into shell commands via `echo -n`, which official Ansible documentation warns against outside testing because it can leave secrets in shell history. Changed the examples to prompt for the secret value with `ansible-vault encrypt_string --stdin-name`.
- The Docker Compose example used the top-level `version: '3.8'` field. Current Docker Compose documentation marks the top-level `version` property as obsolete and only informative. Removed it from the Compose template.

## Review Notes
The remaining examples are technically valid as general patterns. Kubernetes Secret `data` values are correctly base64-encoded, `no_log: true` is used on tasks that handle secrets, and systemd `EnvironmentFile` usage is consistent with systemd's environment file behavior. The examples intentionally use placeholder credentials and example URLs.
