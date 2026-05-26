# Validation Summary: How to Use Ansible to Manage Network Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible modules: package, apt, systemd, template, command, shell, iptables, wait_for
- community.general.nmcli
- ansible.posix.firewalld
- NetworkManager
- systemd-networkd
- firewalld
- iptables
- chrony and chronyd
- systemd-timesyncd and timedatectl
- OpenSSH server configuration

## Sources Consulted
- Ansible ansible.builtin.package module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible ansible.builtin.apt module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible ansible.builtin.systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.shell module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible ansible.builtin.iptables module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/iptables_module.html
- Ansible community.general.nmcli module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/nmcli_module.html
- Ansible ansible.posix.firewalld module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/firewalld_module.html
- NetworkManager.conf reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.conf.html
- systemd.network manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- timedatectl manual: https://www.freedesktop.org/software/systemd/man/latest/timedatectl.html
- chrony.conf documentation: https://chrony-project.org/doc/4.6/chrony.conf.html
- OpenSSH sshd_config manual: https://man.openbsd.org/sshd_config

## Issues Found
- The NetworkManager installation example used `ansible.builtin.apt` with Ubuntu-specific package names while the surrounding text discussed RHEL/CentOS/Fedora. Changed it to `ansible.builtin.package` with the RHEL/Fedora `NetworkManager` package name to match the stated platform.
- The NetworkManager template checked `nm_dns_plugin` directly in a Jinja conditional even though the variable is otherwise optional. Added the same `default('default')` handling in the conditional so the template does not fail when `nm_dns_plugin` is unset.
- The iptables persistence task used `ansible.builtin.command` with shell redirection. The Ansible command module does not process shell metacharacters such as `>`, so changed the task to `ansible.builtin.shell`.
- The chronyd section was labeled for RHEL/CentOS but used the Debian/Ubuntu `apt` module and `/etc/chrony/chrony.conf` path. Changed the package install to `ansible.builtin.package` and updated the configuration path to `/etc/chrony.conf`, which matches RHEL-family chrony defaults.
- The complete playbook used the same Debian/Ubuntu chrony configuration path. Updated it to `/etc/chrony.conf` for consistency with the RHEL/CentOS chronyd example.

## Review Notes
- The post still uses `ansible.builtin.systemd`, which is a documented backward-compatible alias for `ansible.builtin.systemd_service`. Future updates could switch to the newer FQCN, but the current examples remain valid.
- The firewalld default-zone task is functional but not fully idempotent because it always reports changed. A future improvement could query the current default zone before setting it.
