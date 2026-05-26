# Validation Summary: How to Use Ansible to Rotate SSH Host Keys

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- OpenSSH server host keys
- ssh-keygen
- ssh-keyscan
- sshd_config
- SSH known_hosts management

## Sources Consulted
- Ansible `ansible.builtin.known_hosts` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/known_hosts_module.html
- OpenBSD/OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config
- OpenBSD/OpenSSH `ssh-keygen(1)` manual: https://man.openbsd.org/ssh-keygen
- OpenBSD/OpenSSH `ssh-keyscan(1)` manual: https://man.openbsd.org/ssh-keyscan
- Local OpenSSH manual pages for `ssh-keygen`, `ssh-keyscan`, and `sshd_config`

## Issues Found
- The RSA audit warning could fire when the RSA public key was missing because the shell command used `failed_when: false` and then converted an empty stdout value to `0`. I added an `rsa_key_size.rc == 0` condition so the weak-key warning only runs when the key size command succeeded.
- The text before the rotation playbook said it generated Ed25519 and RSA keys, but the playbook also generated ECDSA keys. I updated the sentence to include ECDSA.
- The `known_hosts` update playbook used `ssh-keyscan -H` and then passed a multi-line, hashed result to `ansible.builtin.known_hosts` with `name: "{{ item.item.name }}"`. Ansible requires the host prefix in the key line to match the `name` parameter, and each key line should be added in known_hosts format. I changed the example to scan explicit key types without pre-hashing, build a list from `stdout_lines`, and add each line using the line's host field as `name`.

## Review Notes
- The examples use `sshd` as the service name, which is correct on many distributions such as RHEL-family systems. Debian and Ubuntu commonly use `ssh`; production roles should make the service name configurable.
- The `ssh-keyscan` workflow is mechanically correct after the fix, but host keys collected with `ssh-keyscan` should still be verified through a trusted channel before distribution.
