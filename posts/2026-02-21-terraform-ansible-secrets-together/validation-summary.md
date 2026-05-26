# Validation Summary: How to Handle Terraform and Ansible Secrets Together

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- Ansible
- HashiCorp Vault
- Ansible Vault
- Terraform external data source
- AWS RDS Terraform resource
- Ansible playbook modules and lookup plugins

## Sources Consulted
- HashiCorp Terraform Vault provider documentation for `vault_generic_secret`: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/data-sources/generic_secret
- HashiCorp Terraform Vault provider documentation for `vault_kv_secret_v2`: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/data-sources/kv_secret_v2
- HashiCorp Terraform CLI environment variable documentation: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- HashiCorp Terraform external provider documentation: https://registry.terraform.io/providers/hashicorp/external/latest/docs/data-sources/external.html
- Terraform AWS provider documentation for `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Ansible documentation for `community.hashi_vault.hashi_vault` lookup: https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/hashi_vault_lookup.html
- Ansible documentation for `ansible.builtin.env` lookup: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/env_lookup.html
- Ansible Vault CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Ansible documentation for `community.general.timezone`: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible documentation for `community.general.ufw`: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible documentation for `ansible.builtin.uri`: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible documentation for `ansible.builtin.service`: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html

## Issues Found
- The Ansible Vault example labeled the plaintext YAML as `shared_secrets.yml (encrypted)`. Changed it to `shared_secrets.yml (before encryption)` because encrypted Ansible Vault files are stored in Vault ciphertext format, not readable plaintext YAML.
- The Terraform external data source example implied that Terraform could call `ansible-vault view` directly. Changed it to reference an external script that prints JSON, because Terraform's external data source requires the program to emit a JSON object on stdout.
- The best practices omitted the Terraform state and plan-file exposure caveat. Added guidance to protect Terraform state and plan files because Vault data source values can be stored there.
- The Ansible system timezone task used `ansible.builtin.timezone`, but current documentation lists the module as `community.general.timezone`. Updated the FQCN.
- The "Common Use Cases" text and comments referred to "this module", but the post is not about a specific Ansible module. Updated those references to "these patterns".

## Review Notes
The examples are illustrative and omit surrounding setup such as provider configuration, Vault authentication, inventory, and template files. The local environment did not include Terraform or Ansible CLIs, so syntax checks were performed against official documentation rather than by running `terraform validate` or `ansible-playbook --syntax-check`.
