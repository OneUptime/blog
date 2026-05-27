# Validation Summary: How to Use Ansible to Implement Least Privilege Access

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Ansible playbooks and built-in modules
- Linux user and group management
- sudoers configuration
- OpenSSH server configuration
- Linux file permissions and audit commands
- Mermaid diagrams

## Sources Consulted
- Ansible `ansible.builtin.user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- OpenBSD/OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config
- OpenSSH release notes for removal of SSH protocol 1 support and related configuration options: https://www.openssh.org/releasenotes.html
- sudoers manual: https://www.sudo.ws/docs/man/sudoers.man/
- GNU Findutils manual: https://www.gnu.org/software/findutils/manual/html_mono/find.html

## Issues Found
- Removed `Defaults:{{ item.name }} !root_sudo` and changed the accompanying comment. The `root_sudo` sudoers default controls whether root may run sudo; it does not prevent the named non-root user from running commands outside the allowlist. The allowlist itself, plus removal of broad sudo grants, is what constrains the user.
- Removed the unused SSH access-control file task. The playbook created `/etc/ssh/allowed_users`, but the shown `sshd_config` did not include or reference that file, so it had no effect.
- Removed `Protocol 2` from the OpenSSH server configuration snippet. Modern OpenSSH removed SSH protocol 1 support and associated configuration options, so this directive is obsolete and can cause validation failures on current systems.

## Review Notes
- The Ansible module parameters shown for `user`, `template`, `file`, `command`, `shell`, `debug`, `fail`, and `lineinfile` are valid in current Ansible documentation.
- The sudoers template validates after the correction and uses supported `log_output` and `logfile` defaults.
- The SSH algorithm names, `AllowUsers`, `DenyUsers`, forwarding controls, keepalive settings, and authentication directives are valid OpenSSH configuration keywords. Algorithm allowlists may need environment-specific testing before production rollout because restrictive lists can break older SSH clients.
- The file permission examples are syntactically valid, but production baselines should be checked against the target Linux distribution because default ownership and mode expectations can vary.
