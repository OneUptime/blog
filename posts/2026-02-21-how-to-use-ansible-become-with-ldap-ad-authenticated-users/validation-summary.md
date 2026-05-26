# Validation Summary: How to Use Ansible become with LDAP/AD Authenticated Users

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible privilege escalation (`become`)
- Ansible inventory variables and Vault-backed secrets
- sudo and sudoers configuration
- LDAP and Active Directory authentication
- SSSD identity, credential, and sudo rule caching
- Kerberos/GSSAPI SSH authentication
- OpenSSH client options

## Sources Consulted
- Ansible privilege escalation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible `setup` module documentation: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/setup_module.html
- Ansible SSH connection plugin variable documentation: https://docs.ansible.com/projects/ansible/3/collections/ansible/builtin/ssh_connection.html
- SSSD sudo troubleshooting documentation: https://sssd.io/troubleshooting/sudo.html
- SSSD `sssd.conf(5)` manual: https://www.mankier.com/5/sssd.conf
- Red Hat SSSD sudo configuration guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system-level_authentication_guide/configuring_services
- sudoers manual: https://www.sudo.ws/docs/man/1.9.14/sudoers.man.pdf
- OpenSSH client configuration manual: https://man.openbsd.org/ssh_config
- MIT Kerberos `kinit` documentation: https://web.mit.edu/kerberos/krb5-latest/doc/user/user_commands/kinit.html

## Issues Found
- The sudoers example included a limited command allowlist in a post about Ansible `become`. Ansible documentation states privilege escalation must be general because modules run from generated temporary paths. I clarified that the limited DevOps rule is for non-Ansible interactive sudo use and added a note that the Ansible become account needs general sudo access.
- The SSSD caching section implied that credential caching alone makes all sudo operations work offline. I clarified that SSSD caches credentials and identity data, and that sudo rule caching applies when sudo rules are stored in LDAP/AD through SSSD.
- The SSSD sudo configuration omitted the requirement that sudo must consult SSSD through `/etc/nsswitch.conf` for directory-backed sudo rules. I added a note to include `sudoers: files sss` and to extend the AD schema when AD stores sudo rule attributes.
- The Vault example used older SSH password variable names and described storing an SSH key even though the example stored passwords. I updated the wording and switched the example to current `ansible_password` and `ansible_become_password` variables.

## Review Notes
The examples are intentionally generic and assume a Linux distribution with sudo, SSSD, PAM, systemd, and OpenSSH support for GSSAPI. The SSSD AD sudo rule example also assumes the environment has the required sudo schema and directory layout for centralized sudo rules.
