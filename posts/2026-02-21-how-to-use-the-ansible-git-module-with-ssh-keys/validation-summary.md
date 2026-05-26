# Validation Summary: How to Use the Ansible git Module with SSH Keys

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.git
- ansible.builtin.copy
- ansible.builtin.file
- ansible.builtin.known_hosts
- ansible.builtin.unvault lookup
- community.crypto.openssh_keypair
- Ansible Vault
- Git over SSH
- SSH deploy keys
- SSH agent forwarding
- SSH known_hosts management

## Sources Consulted
- Ansible `ansible.builtin.git` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible `ansible.builtin.known_hosts` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/known_hosts_module.html
- Ansible Vault documentation: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_encrypting_content.html
- Ansible `ansible.builtin.unvault` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unvault_lookup.html
- Ansible `ansible.builtin.file` lookup documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/file_lookup.html
- Ansible `community.crypto.openssh_keypair` module documentation: https://docs.ansible.com/projects/ansible/12/collections/community/crypto/openssh_keypair_module.html
- GitHub deploy keys documentation: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys
- GitHub SSH key fingerprints documentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
- GitLab deploy keys documentation: https://docs.gitlab.com/user/project/deploy_keys/
- GitLab.com SSH host keys documentation: https://docs.gitlab.com/user/gitlab_com/#ssh-host-keys-fingerprints

## Issues Found
- The deploy-key setup example cloned into `/opt/app` as `deploy`, but did not ensure that `deploy` could write to that destination. Added a task to create `/opt/app` owned by `deploy` before running the git checkout.
- The Vault example used the generic `file` lookup for a vault-encrypted private key. Replaced it with the documented `ansible.builtin.unvault` lookup so the example explicitly reads vaulted file content.
- The SSH agent forwarding example disabled privilege escalation only on the git task while still cloning into `/opt/app`, which is typically not writable by the SSH login user. Removed play-level `become: true` and changed the checkout destination to the remote user's home directory.
- The `community.crypto.openssh_keypair` example assumed the `deploy` user and `/home/deploy/.ssh` directory already existed. Added tasks to create the user and SSH directory before generating the key pair.

## Review Notes
- `accept_hostkey: true` is valid, but the post correctly warns that explicit known_hosts management is safer for production. Ansible also supports `accept_newhostkey` on OpenSSH 7.5+ for a narrower first-use trust behavior.
- The GitHub and GitLab Ed25519 known_hosts entries in the post match the current official documentation checked on 2026-05-26.
- Temporary private-key files are removed in the examples, but a failed git task could still leave the key in place. A future hardening pass could use Ansible `block`/`always` cleanup without changing the core tutorial flow.
