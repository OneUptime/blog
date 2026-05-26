# Validation Summary: How to Rekey Ansible Vault Files with a New Password

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Vault
- ansible-vault CLI
- Vault IDs
- Shell scripting
- YAML vault files

## Sources Consulted
- Ansible Community Documentation: ansible-vault CLI, including `rekey`, `--vault-id`, `--new-vault-id`, and `--new-vault-password-file`: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Ansible Community Documentation: Encrypting content with Ansible Vault, including file-level encryption, rekeying files, and the limitation that encrypted variables cannot be rekeyed: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_encrypting_content.html
- Ansible Community Documentation: Ansible Vault overview and data-at-rest warning: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault.html
- Ansible upstream source: `VaultEditor.rekey_file`, `VaultLib.decrypt_and_get_vault_id`, and vault ID handling behavior: https://github.com/ansible/ansible/blob/devel/lib/ansible/parsing/vault/__init__.py

## Issues Found
- The initial `ansible-vault create secrets.yml` command block was marked as `yaml`, but it contains shell commands. Changed the fence language to `bash`.
- The post stated that rekeying is broadly "safe from a security standpoint" because the operation happens in memory. Ansible documentation warns that Vault protects data at rest and decrypted data still needs careful handling. Reworded this section to avoid overclaiming.
- The vault ID example said the `prod` ID "must match" what was used during encryption. Vault IDs select password sources and label encrypted content, but Ansible can try other supplied secrets unless strict vault ID matching is configured. Reworded the comment to describe the password source and resulting label.
- The vault ID section said vault IDs need to be specified during rekey operations. Updated this to "can specify" because vault IDs are not always mandatory, depending on the supplied password sources and configuration.
- The bulk rekey section described finding "all vault-encrypted files" while it only searches `*.yml` and `*.yaml`. Updated the heading and wording to say it finds YAML vault files.
- The troubleshooting loop searched only `*.yml` even though the earlier bulk script included both `*.yml` and `*.yaml`. Updated the loop to include both extensions.
- The post said files with different vault IDs need to be rekeyed separately. Different passwords require separate password sources, but different labels alone do not necessarily require separate rekey operations. Reworded that sentence to focus on different passwords.

## Review Notes
The commands and options used by the post are current in the official Ansible CLI documentation. The inline vault string limitation is also correct: Ansible documentation states that encrypted variables cannot be rekeyed with the file-level `rekey` command.
