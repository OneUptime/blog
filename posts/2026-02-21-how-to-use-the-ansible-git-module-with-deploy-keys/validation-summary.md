# Validation Summary: How to Use the Ansible git Module with Deploy Keys

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible `ansible.builtin.git` module
- Ansible `community.crypto.openssh_keypair` module
- Ansible Vault
- SSH deploy keys and SSH config
- GitHub deploy keys
- GitLab deploy keys
- Bitbucket Cloud access keys

## Sources Consulted
- Ansible `ansible.builtin.git` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible `community.crypto.openssh_keypair` module documentation: https://docs.ansible.com/ansible/latest/collections/community/crypto/openssh_keypair_module.html
- Ansible Vault documentation: https://docs.ansible.com/ansible/latest/vault_guide/vault.html
- Ansible playbook keywords documentation: https://docs.ansible.com/ansible/latest/reference_appendices/playbooks_keywords.html
- GitHub deploy keys documentation: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys
- GitLab deploy keys documentation: https://docs.gitlab.com/user/project/deploy_keys/
- Bitbucket Cloud repository access keys documentation: https://support.atlassian.com/bitbucket-cloud/docs/set-up-repository-access-keys-on-linux/
- Bitbucket Cloud access key scope documentation: https://support.atlassian.com/bitbucket-cloud/kb/difference-between-repository-project-and-workspace-access-keys/

## Issues Found
- The post implied the Ansible controller makes the deploy-key SSH connection to the Git server. Updated the explanation and diagram to say the host running the Ansible `git` task makes that connection, which matches how the module executes on target hosts by default.
- The examples used `accept_hostkey: true`, which is valid but maps to `StrictHostKeyChecking=no` and disables a host-key MITM protection. Updated the examples to `accept_newhostkey: true`, the safer current Ansible option for OpenSSH 7.5+.
- The Vault cleanup example used the obsolete `always_run: true` task keyword. Removed it because it is not a current playbook keyword.
- The post described deploy-key scoping too broadly for all providers. Clarified repository-scoped deploy keys, GitLab's deploy-key model, and Bitbucket Cloud's repository/workspace access key behavior.

## Review Notes
The examples assume ansible-core 2.12 or newer for `accept_newhostkey`. For older Ansible or OpenSSH versions, users would need pre-populated `known_hosts` entries or a different host-key handling approach.
