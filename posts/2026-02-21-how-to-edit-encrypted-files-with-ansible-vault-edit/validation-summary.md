# Validation Summary: How to Edit Encrypted Files with ansible-vault edit

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible Vault
- ansible-vault CLI
- ansible.cfg
- Vault IDs
- YAML
- Bash
- Python
- GitHub Actions
- yq

## Sources Consulted
- Ansible Community Documentation: ansible-vault CLI, https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Ansible Community Documentation: Encrypting content with Ansible Vault, https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_encrypting_content.html
- Ansible Community Documentation: Using encrypted variables and files, https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_using_encrypted_content.html
- Ansible Community Documentation: Configuration settings, https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html

## Issues Found
- The description and introduction claimed `ansible-vault edit` avoids ever leaving plaintext secrets on disk and performs a single atomic operation. Updated this to say it avoids leaving the original file decrypted on disk and handles the decrypt-edit-encrypt cycle, because the official docs say `edit` decrypts to a temporary file and editor swap/backup/autosave files can still disclose plaintext.
- The editor section only mentioned `$EDITOR`. Updated it to include Ansible's `editor` configuration and `$ANSIBLE_EDITOR`, while keeping `$EDITOR` and the `vi` fallback aligned with the documented configuration settings.
- The vault ID section did not mention `--encrypt-vault-id` when multiple vault IDs are passed. Added a note because the `ansible-vault edit` CLI documentation says this is required if more than one vault ID is provided.
- The editor crash section claimed Ansible always cleans up and no secrets are exposed. Updated it to distinguish normal editor exit from abrupt editor or terminal crashes and to warn about recovery, swap, and backup files.
- The diff explanation attributed changed ciphertext specifically to random initialization vectors. Updated it to reference Ansible Vault's random salt, which is documented in the vault payload format and configuration settings.
- The diff command used `git stash` in a way that would capture the edited vault file as the old version. Replaced it with a `git show HEAD:path` workflow that compares the decrypted committed version with the decrypted working-tree version.

## Review Notes
The Python example uses Ansible's Python vault classes directly. This is technically plausible, but Ansible documents the `ansible-vault` CLI rather than presenting `ansible.parsing.vault` as a stable public automation API, so future maintenance may be easier with CLI-based automation or a small tested internal helper.
