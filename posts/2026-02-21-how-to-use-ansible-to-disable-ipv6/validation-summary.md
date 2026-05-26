# Validation Summary: How to Use Ansible to Disable IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Linux IPv6 kernel and sysctl settings
- GRUB kernel command-line parameters
- RHEL grubby
- modprobe configuration
- OpenSSH, Postfix, NTP, and systemd-resolved configuration
- Linux networking commands: ip, ss, lsmod

## Sources Consulted
- Ansible `ansible.posix.sysctl` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `ansible.builtin.service_facts` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Linux kernel IPv6 module parameter documentation: https://www.kernel.org/doc/html/latest/networking/ipv6.html
- Red Hat Enterprise Linux kernel command-line parameter documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/configuring-kernel-command-line-parameters_managing-monitoring-and-updating-the-kernel
- OpenSSH `sshd_config` manual: https://man.openbsd.org/sshd_config
- Postfix `postconf(5)` documentation: https://www.postfix.org/postconf.5.html
- systemd `resolved.conf` documentation: https://www.freedesktop.org/software/systemd/man/latest/resolved.conf.html
- NTP access control options documentation: https://www.ntp.org/documentation/4.2.8-series/accopt/
- Local `ss --help` output for `-H` / `--no-header`

## Issues Found
- The GRUB section said `ipv6.disable=1` prevents the IPv6 kernel module from loading. Linux documents this as disabling IPv6 functionality, not necessarily preventing the module from loading, so the wording was corrected.
- The Debian/Ubuntu GRUB `lineinfile` task replaced existing kernel arguments with `quiet splash ipv6.disable=1`. It now preserves existing arguments and avoids duplicating `ipv6.disable=1`.
- The RHEL GRUB example edited `/etc/default/grub` and regenerated `/boot/grub2/grub.cfg`, which is not the preferred current RHEL approach for updating all kernel entries. It now uses `grubby --update-kernel=ALL --args="ipv6.disable=1"` after checking existing kernel arguments.
- The Postfix service check referenced `ansible_facts.services` without first populating service facts. The playbook now runs `ansible.builtin.service_facts` before checking for Postfix.
- The Postfix service condition checked only `postfix`, but systemd service facts commonly use `postfix.service`. The condition now accepts either key.
- The SSH restart handler used `sshd` for all Linux families. Debian-based systems commonly use `ssh`, so the handler now selects `ssh` on Debian and `sshd` elsewhere.
- The combined role's GRUB insertion was not idempotent and could duplicate `ipv6.disable=1`. It now uses the same guarded replacement pattern as the standalone Debian/Ubuntu example and uses `grubby` for Red Hat systems.
- The combined role snippet referenced handlers that were not included in the post. The snippet now performs the GRUB update and SSH restart with explicit tasks so it remains self-contained.
- The verification playbook counted the `ss` header line as an IPv6 listening socket. It now uses `ss -H` to suppress the header.
- The verification playbook used `grep -c ipv6` on `lsmod`, which could count non-module text matches. It now matches the module name column exactly.
- The IPv6 address verification command used a shell pipeline only to count output. It now collects `ip -6 addr show` output and counts `inet6` lines in Ansible.

## Review Notes
The sysctl method is technically valid for runtime and persistent configuration through `ansible.posix.sysctl`, but environments should still test carefully because disabling IPv6 can affect host, container, and cloud networking behavior.
