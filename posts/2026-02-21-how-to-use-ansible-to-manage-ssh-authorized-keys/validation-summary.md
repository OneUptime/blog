# Validation Summary: How to Use Ansible to Manage SSH authorized_keys

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.posix.authorized_key
- ansible.builtin.user
- SSH authorized_keys
- OpenSSH key options
- GitHub public SSH keys
- YAML

## Sources Consulted
- Ansible Community Documentation: ansible.posix.authorized_key module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/authorized_key_module.html
- Ansible Community Documentation: ansible.builtin.user module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- OpenSSH authorized_keys(5) manual page - https://manpages.debian.org/unstable/openssh-server/authorized_keys.5.en.html
- GitHub Docs: REST API endpoints for Git SSH keys - https://docs.github.com/en/rest/users/keys

## Issues Found
- The security best practices section said to use `no_log: true` when dynamically generating keys. Since `authorized_key` manages public keys and public keys are not normally secret, this was too broad. Changed it to recommend `no_log: true` only when generating private keys or other sensitive key material.
- The validation example comment said it enforced Ed25519 keys only, but the assertion also allowed ECDSA keys. Updated the comment to say it enforces Ed25519 or ECDSA keys.

## Review Notes
- The `ansible.posix.authorized_key` examples match current module parameters for `user`, `key`, `state`, `exclusive`, `key_options`, `path`, and `manage_dir`.
- The post correctly avoids using `exclusive` inside a per-key loop and instead shows newline-separated key batches for exclusive mode.
- The `ansible.posix` collection is included with the full `ansible` package but not with `ansible-core`; future revisions could mention installing the collection when using minimal Ansible installations.
