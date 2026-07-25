# Validation Summary: Ansible Vault or External Secret Manager? Choosing a Sustainable Secrets Pattern

## Status

validated

## Post Type

Technical decision guide with Ansible CLI, playbook, and collection configuration examples.

## Technologies Covered

- Ansible Vault and vault IDs
- `ansible-vault` and `ansible-playbook`
- Ansible variables, lookups, facts, templates, assertions, `no_log`, and diff mode
- `community.hashi_vault` 7.1.0
- HashiCorp Vault KV v2 and AppRole
- External secret managers and controller-side secret retrieval

## Sources Consulted

- [Ansible Vault guide](https://docs.ansible.com/projects/ansible/latest/vault_guide/vault.html)
- [Encrypting content with Ansible Vault](https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_encrypting_content.html)
- [Using encrypted variables and files](https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_using_encrypted_content.html)
- [`ansible-vault` CLI reference](https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html)
- [Ansible configuration settings, including `DEFAULT_VAULT_ID_MATCH`](https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html#default-vault-id-match)
- [Installing collections with version ranges and requirements files](https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html)
- [Ansible lookup plugin behavior](https://docs.ansible.com/projects/ansible/latest/plugins/lookup.html)
- [`community.hashi_vault` user guide and Python requirements](https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/docsite/user_guide.html)
- [`community.hashi_vault` lookup guide](https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/docsite/lookup_guide.html)
- [`community.hashi_vault.vault_kv2_get` lookup reference](https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/vault_kv2_get_lookup.html)
- [`ansible.builtin.template` module reference](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html)
- [`ansible.builtin.assert` module reference](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html)
- [HashiCorp Vault AppRole documentation](https://developer.hashicorp.com/vault/docs/auth/approle)
- [HashiCorp Vault AppRole API reference](https://developer.hashicorp.com/vault/api-docs/auth/approle)
- [HashiCorp Vault KV v2 documentation](https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2)

## Issues Found

- The `ansible-vault encrypt_string` example supplied `--name database_password` without a positional plaintext value. In that form, current Ansible reads plaintext from stdin but does not use `--name` for the stdin value, so the output lacks the intended variable name. Changed the example to `--prompt`, which interactively requests the variable name and reads the secret with hidden input.
- The decryption-scope statement implied that any vault password could decrypt every vaulted item in a repository. Clarified that a password decrypts content encrypted with that password; separate passwords can protect separate vault contents.
- The rotation limitation combined stored-secret rotation and vault-password rotation into one procedure. Split it into the correct operations: changing a stored secret requires updating and committing the encrypted content, while changing a file-level vault password requires `rekey` and updating the password source.
- The authentication guidance grouped AppRole with inherently short-lived mechanisms even though AppRole SecretIDs can default to unlimited uses and no expiration. Clarified that AppRole SecretIDs should be constrained.

## Review Notes

- The remaining `create`, `view`, `rekey`, `--vault-id`, and `--new-vault-id` command forms match the current official CLI reference and were cross-checked with `ansible-core` 2.21.2 help output.
- The `community.hashi_vault` 7.1.0 collection exists, the `>=7.1.0,<8.0.0` requirements-file range is valid, and the documented lookup name, `engine_mount_point`, controller-side dependency requirement, and `.secret` return member match the collection documentation and installed plugin metadata.
- The assertion expressions were executed successfully with representative data. The template task parameters and task-level `no_log` and `diff` keywords match current Ansible documentation.
- All documentation links in the post resolved to the intended official pages. A live HashiCorp Vault retrieval was not attempted because no Vault endpoint or credentials were provided.
