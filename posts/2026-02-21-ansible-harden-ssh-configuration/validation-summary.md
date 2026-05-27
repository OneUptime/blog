# Validation Summary: How to Use Ansible to Harden SSH Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- OpenSSH server configuration
- SSH hardening
- Fail2Ban
- PAM Google Authenticator TOTP
- Linux service and file permissions

## Sources Consulted
- OpenSSH sshd_config manual: https://man.openbsd.org/sshd_config
- OpenSSH specifications and supported algorithm notes: https://www.openssh.org/specs.html
- OpenSSH post-quantum cryptography guidance: https://www.openssh.org/pq.html
- Ansible ansible.builtin.template module documentation: https://docs.ansible.com/projects/ansible/8/collections/ansible/builtin/template_module.html
- Ansible 2.9 filters documentation: https://docs.ansible.com/projects/ansible/2.9/user_guide/playbooks_filters.html
- Ansible ansible.builtin.split filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/split_filter.html
- Fail2Ban default jail configuration: https://github.com/fail2ban/fail2ban/blob/master/config/jail.conf
- Local OpenSSH command checks using sshd_config(5), sshd -t, and ssh -Q for algorithm availability.

## Issues Found
- The prerequisite listed Ansible 2.9+, but the audit playbook uses the split filter, which is documented as new in ansible-core 2.11. Changed the prerequisite to ansible-core 2.11+.
- The base sshd_config template used ChallengeResponseAuthentication, which current OpenSSH documents as a deprecated alias for KbdInteractiveAuthentication. Replaced it with KbdInteractiveAuthentication.
- The 2FA playbook enabled ChallengeResponseAuthentication while the hardened base template disabled keyboard-interactive authentication. This could make AuthenticationMethods publickey,keyboard-interactive fail validation or not work as intended. Updated the 2FA playbook to enable KbdInteractiveAuthentication instead.
- The 2FA playbook configured a PAM module but did not explicitly enable UsePAM in sshd_config. Added a UsePAM yes task so PAM-based TOTP can be used by sshd.
- The hardening diagram described Fail2Ban as detecting a port scan. Fail2Ban's SSH jail responds to repeated authentication failures, not generic port scans. Updated the diagram and summary wording to refer to repeated failed SSH login attempts.

## Review Notes
- The SSH algorithm names in the KexAlgorithms, Ciphers, and MACs examples were checked against OpenSSH-supported algorithm lists and local ssh -Q output.
- The sshd_config template syntax was checked with sshd -t using a temporary host key.
- The Google Authenticator PAM example is distribution-sensitive; package names and PAM include files can differ outside Debian/Ubuntu-style systems.
