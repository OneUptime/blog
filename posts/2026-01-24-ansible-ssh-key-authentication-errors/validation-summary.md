# Validation Summary: How to Fix 'SSH Key' Authentication Errors in Ansible

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Ansible
- OpenSSH client
- SSH public key authentication
- SSH agent
- Ansible inventory and ansible.cfg configuration
- ansible.posix.authorized_key module

## Sources Consulted
- Ansible SSH connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible connection methods and SSH key setup documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/connection_details.html
- ansible.posix.authorized_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/authorized_key_module.html
- OpenSSH release notes for OpenSSH 8.8 ssh-rsa changes: https://www.openssh.com/releasenotes.html
- OpenBSD ssh_config(5) manual: https://man.openbsd.org/ssh_config
- OpenBSD ssh-keygen(1) manual: https://man.openbsd.org/ssh-keygen
- Local OpenSSH client help/output from OpenSSH_9.6p1: `ssh -G`, `ssh-keygen` usage, and `ssh-keyscan` usage

## Issues Found
- The first Ansible configuration example used a `yaml` code fence for a mixed `ansible.cfg` INI snippet and YAML inventory example. Changed the code fence to `ini` so the `ansible.cfg` portion is not misidentified as YAML.
- The "Could Not Load Host Key" heading did not match the shown SSH negotiation error. Changed it to "No Matching Host Key Type Found."
- The legacy RSA examples used `PubkeyAcceptedKeyTypes`, the older OpenSSH option name. Updated examples to `PubkeyAcceptedAlgorithms`, which is the current documented option.
- The key-format conversion command used `ssh-keygen -m pem`, which writes the legacy PEM private key format rather than the default OpenSSH private key format. Replaced it with `ssh-keygen -p -f ~/.ssh/id_rsa` to rewrite the key using OpenSSH's default private key format.
- The passphrase section suggested `ansible_ssh_private_key_passphrase` with `private_key_file`. Current Ansible documentation states that the private key passphrase variable does not affect `private_key_file`; the SSH connection plugin recommends `ssh-agent` for encrypted key files. Replaced that section with ssh-agent usage.
- The playbook used the short `authorized_key` module name. Updated it to `ansible.posix.authorized_key` to match the current collection documentation and avoid ambiguity with ansible-core-only installations.

## Review Notes
- The remaining examples are technically plausible, but several are intentionally broad troubleshooting patterns. In production, disabling host key checking or adding `ssh-rsa` should be limited to controlled legacy scenarios.
