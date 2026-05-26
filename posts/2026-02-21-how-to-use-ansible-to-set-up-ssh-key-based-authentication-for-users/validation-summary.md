# Validation Summary: How to Use Ansible to Set Up SSH Key-Based Authentication for Users

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.posix authorized_key module
- ansible.builtin user, lineinfile, command, and systemd modules
- OpenSSH public-key authentication
- OpenSSH sshd_config
- GitHub public SSH key URLs

## Sources Consulted
- Ansible `ansible.posix.authorized_key` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/authorized_key_module.html
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Local OpenSSH `sshd_config(5)` manual page
- Local OpenSSH `sshd(8)` manual page
- RFC 4252, The Secure Shell (SSH) Authentication Protocol: https://www.rfc-editor.org/rfc/rfc4252
- GitHub public SSH keys URL format as referenced by Ansible documentation: https://github.com/username.keys

## Issues Found
- The SSH authentication flow showed the server sending an encrypted challenge and the client decrypting it with the private key. RFC 4252 specifies public-key authentication as a private-key signature that the server verifies with the public key. Updated the diagram to describe signing and signature verification.
- The sshd hardening example used `ChallengeResponseAuthentication`, which the OpenSSH manual documents as a deprecated alias for `KbdInteractiveAuthentication`. Updated the example to use `KbdInteractiveAuthentication no`.
- Several SSH public keys in examples used placeholder key blobs that were not syntactically valid Ed25519 public keys. Replaced them with valid Ed25519 public-key examples while preserving the surrounding playbook structure.

## Review Notes
- `ansible.posix.authorized_key` is part of the `ansible.posix` collection, not `ansible-core`; users may need to install the collection in minimal Ansible environments.
- The `sshd` systemd unit name is common on Red Hat-family systems, while Debian-family systems often use `ssh`; readers may need to adjust the handler for their distribution.
