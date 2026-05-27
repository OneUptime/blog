# Validation Summary: How to Use Ansible to Configure SSH Key-Only Authentication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks, roles, handlers, and built-in modules
- OpenSSH server configuration
- SSH public key authentication
- Linux service management
- YAML and Jinja2 templates

## Sources Consulted
- Ansible `ansible.builtin.user` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `ansible.builtin.wait_for` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/wait_for_module.html
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config.5
- OpenSSH `sftp-server(8)` manual: https://man.openbsd.org/sftp-server
- OpenSSH release notes for SSH protocol 1 removal in OpenSSH 7.6: https://www.openssh.org/releasenotes.html

## Issues Found
- The key authentication safety test connected from each managed host to `localhost`, which did not verify that the Ansible controller could reconnect to the target host. I changed the test to delegate to `localhost` and connect to `ansible_host | default(inventory_hostname)`.
- The safety test would fail at the command task before reaching the custom assertion message. I added `failed_when: false` so the assertion handles failure cleanly while still preventing the hardened config from being deployed.
- The hardening role referenced `/etc/ssh/banner` but did not include the banner task before deploying `sshd_config`. I added an `import_tasks: banner.yml` task before the template deployment.
- `ChallengeResponseAuthentication` is a deprecated OpenSSH alias for keyboard-interactive authentication. I changed the variable and template directive to `KbdInteractiveAuthentication`.
- `Protocol 2` is obsolete on modern OpenSSH because SSH protocol 1 support was removed. I removed the directive from the template.
- The SFTP subsystem path `/usr/lib/openssh/sftp-server` is distribution-specific. I changed it to `internal-sftp`, which avoids a hard-coded distro path.
- The handler and emergency playbook used service name `sshd`, which is not portable to Debian-family systems where the service is commonly `ssh`. I added `ssh_service_name` with a Debian-family conditional and used it in service tasks.
- The post implied key-only authentication eliminates all brute-force attacks. I narrowed the claim to password brute-force login risk.
- The `AllowGroups sshusers` setting can lock out the Ansible connection account if that account is not in the group. I added a note that `ansible_user` must be included in `ssh_users` and `sshusers`.

## Review Notes
The examples are now technically valid for a general Linux/OpenSSH tutorial, but production environments should still test distribution-specific paths, crypto policy restrictions, and service names in staging before broad rollout.
