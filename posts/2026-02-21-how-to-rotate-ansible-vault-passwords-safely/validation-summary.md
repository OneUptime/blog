# Validation Summary: How to Rotate Ansible Vault Passwords Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Vault
- Ansible CLI (`ansible-vault`, `ansible-playbook`, `ansible`)
- Bash scripting
- OpenSSL password generation
- GitHub CLI secrets
- CI/CD secret rotation

## Sources Consulted
- Ansible Community Documentation: `ansible-vault` CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Ansible Community Documentation: Encrypting content with Ansible Vault: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_encrypting_content.html
- Ansible Community Documentation: Using encrypted variables and files: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_using_encrypted_content.html
- Local OpenSSL CLI help: `openssl rand -help`
- Local GitHub CLI help: `gh secret set --help`

## Issues Found
- The `rekey_by_vault_id.sh` example set `FAILED=1` inside a piped `while` loop. In Bash, that loop runs in a subshell, so the outer `FAILED` value could remain `0` and the script could report success after a failed rekey. Changed the loop to use process substitution so `FOUND` and `FAILED` are updated in the parent shell.
- The single-password rekey example used command substitution to pass file paths. That can split paths containing whitespace and can invoke `ansible-vault rekey` with no files. Changed it to use `mapfile` and an array, with an explicit no-files branch.
- The inline encrypted string helper parsed `ansible` debug output with `grep`, which could re-encrypt quoted or otherwise misparsed output instead of the exact plaintext value. Replaced it with a safer workflow: use `ansible.builtin.debug` to view the decrypted variable, then use `ansible-vault encrypt_string --stdin-name` to re-encrypt the exact value.
- The vault verification script had the same piped-loop `FAILED` persistence bug and only supported a single vault password. Changed it to use process substitution, exit on decryption failures, centralize vault options in a `VAULT_ARGS` array with a multiple-vault-ID example, and use `ansible-vault decrypt --output -` for non-interactive verification instead of the pager-oriented `view` command.

## Review Notes
- `ansible-vault` was not installed in the local workspace, so Ansible command flags and behavior were verified against current official Ansible documentation rather than local `--help` output.
- The official Ansible documentation confirms that file-level password rotation is handled with `ansible-vault rekey`, while encrypted variables created with `encrypt_string` cannot be rekeyed directly and need separate handling.
