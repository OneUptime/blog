# Validation Summary: How to Use Ansible to Patch Linux Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible built-in modules: dnf, apt, command, shell, stat, reboot, uri, wait_for, lineinfile, copy, debug, set_fact
- Linux package management with DNF, APT, RPM, and unattended-upgrades
- Linux reboot detection with needs-restarting and /run/reboot-required
- Rolling patch deployments and compliance reporting

## Sources Consulted
- Ansible dnf module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible playbook error handling and max_fail_percentage documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_error_handling.html
- Debian unattended-upgrade man page: https://manpages.debian.org/bookworm/unattended-upgrades/unattended-upgrades.8.en.html
- Debian Policy Manual, reboot-required mechanism: https://www.debian.org/doc/debian-policy/ch-opersys.html#signaling-that-a-reboot-is-required
- needs-restarting man page: https://man7.org/linux/man-pages/man1/needs-restarting.1.html
- Red Hat DNF history documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Debian apt-mark man page: https://manpages.debian.org/testing/apt/apt-mark.8.en.html

## Issues Found
- The post used `ansible.builtin.yum` throughout the Red Hat examples. Current Ansible documentation points users to `ansible.builtin.dnf`, with `yum` retained only for syntax compatibility and the old YUM backend removed in ansible-core 2.17. Updated Red Hat package-management tasks to use `ansible.builtin.dnf`.
- The basic playbook referenced `yum_result.changes.updated`, which is not a documented return value for the package modules. Replaced the package count with a generic changed-host message.
- The Red Hat security-patching example installed `yum-plugin-security` for older RHEL/CentOS systems. Updated it to use `dnf-plugins-core` and `dnf updateinfo list --security --available`, matching current DNF-based systems.
- The Debian security-patching shell pipeline parsed simulated `apt-get dist-upgrade` output and piped package names through `xargs apt-get install -y`. That approach is fragile and can install the wrong package set. Replaced it with `unattended-upgrade -d` and added installation of the `unattended-upgrades` package.
- The reboot checks used `needs-restarting -r` but did not ensure the DNF plugin package was present. Added `dnf-plugins-core` installation before those checks in Red Hat playbooks.
- The local compliance report copy task inherited `become: true` while delegated to localhost. Added `become: false` so report generation does not unnecessarily require privilege escalation on the control node.
- The Debian exclusions example attempted to hold wildcard package names with `apt-mark hold`. `apt-mark` operates on package names, so the example now uses an explicit `debian_hold_packages` list.
- The rollback tip referenced `yum history undo`. Updated it to `dnf history undo` for current RHEL-family systems.

## Review Notes
The examples are now syntactically valid YAML and align with current Ansible/DNF/APT documentation. The playbooks are still illustrative and assume operational prerequisites such as a valid `production` inventory group, a reachable load-balancer API, an application health endpoint on port 8080, configured APT unattended-upgrade origins for Debian security updates, and RPM-based Red Hat hosts for the report commands.
