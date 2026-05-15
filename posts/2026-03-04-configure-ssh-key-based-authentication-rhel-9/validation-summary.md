# Validation Summary: How to Configure SSH Key-Based Authentication on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSSH client and server
- SSH key-based authentication
- ssh-keygen, ssh-copy-id, scp, ssh-agent, ssh-add
- sshd_config
- SELinux file contexts

## Sources Consulted
- Red Hat Enterprise Linux 9 Securing networks documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/securing_networks/index
- OpenSSH manual page index: https://www.openssh.org/manual.html
- Local `ssh-keygen(1)` man page
- Local `ssh-copy-id(1)` help output
- Local `ssh-add(1)` help output
- Local `sshd_config(5)` man page

## Issues Found
- The introduction said SSH keys eliminate password brute-force risk entirely. This is only true once password authentication is disabled, so the sentence was qualified accordingly.
- The Ed25519 example was labeled as recommended for RHEL without noting RHEL FIPS mode. Red Hat documents that Ed25519 is not FIPS-140-compliant and does not work in FIPS mode, so a FIPS caveat was added.
- The SCP deployment method appended to `~/.ssh/authorized_keys` without first ensuring `~/.ssh` existed. Added `mkdir -p ~/.ssh` and `chmod 700 ~/.ssh` before appending the key.
- The ownership repair command assumed the user's group name matched the username. Changed it to use `id -un` and `id -gn`, which works for accounts whose primary group has a different name.
- The SELinux context guidance presented a full context as universally expected. The important part for `authorized_keys` is the `ssh_home_t` type; the SELinux user and range can vary by policy, so the text now states the expected type and keeps the full context only as an example.

## Review Notes
- The OpenSSH commands and configuration directives reviewed are current and valid.
- `PubkeyAuthentication yes` is the OpenSSH default, and `AuthorizedKeysFile .ssh/authorized_keys` is valid. Some OpenSSH defaults also include the legacy `.ssh/authorized_keys2` path.
- Before disabling password-based login in production, keep an existing tested administrative session open and reload `sshd` only after confirming key login works.
