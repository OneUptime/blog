# Validation Summary: How to Configure Ansible Environment Variables

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible configuration
- Ansible environment variables
- Ansible Vault
- Ansible playbook `environment` keyword
- GitHub Actions
- Jenkins Pipeline
- direnv

## Sources Consulted
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible precedence rules: https://docs.ansible.com/projects/ansible/latest/reference_appendices/general_precedence.html
- Ansible remote environment keyword: https://docs.ansible.com/projects/ansible-core/2.18/playbook_guide/playbooks_environment.html
- ansible-config CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-config.html
- Ansible Vault encrypted content guide: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_using_encrypted_content.html
- Ansible built-in default callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- Ansible stdout callback index: https://docs.ansible.com/projects/ansible/latest/collections/callback_index_stdout.html
- ansible.posix.json callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/json_callback.html
- community.general.yaml callback removal note: https://docs.ansible.com/projects/ansible/13/collections/community/general/yaml_callback.html
- direnv stdlib documentation: https://direnv.net/man/direnv-stdlib.1.html

## Issues Found
- The post said every `ansible.cfg` setting has a corresponding environment variable. Ansible documents that many environment variables are available for most options, not every setting. Changed the wording to "Many settings".
- The post described environment variables as the highest-priority Ansible source. That is only true within configuration settings; command-line options, playbook keywords, and variables can override configuration settings. Updated the precedence section to make that scope explicit.
- The `ANSIBLE_VAULT_PASSWORD_FILE` example combined the environment variable with `--ask-vault-pass` and said it would not prompt. Ansible documents `--ask-vault-pass` as the prompt option and `ANSIBLE_VAULT_PASSWORD_FILE` as a default file source. Removed the prompt flag from the example.
- The `ANSIBLE_STDOUT_CALLBACK=yaml` examples used a legacy callback pattern. The community.general YAML callback has been removed and superseded by `ANSIBLE_CALLBACK_RESULT_FORMAT=yaml` with the built-in default callback. Updated the YAML examples.
- The `ANSIBLE_STDOUT_CALLBACK=json` example did not mention that the current JSON stdout callback is `ansible.posix.json` and requires the `ansible.posix` collection. Updated the callback value and added that caveat.

## Review Notes
The remaining examples are broadly correct for current Ansible documentation. Ansible was not installed in the local workspace, so CLI behavior was checked against official Ansible command documentation rather than local `--help` output.
