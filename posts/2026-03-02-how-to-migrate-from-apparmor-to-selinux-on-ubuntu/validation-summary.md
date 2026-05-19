# Validation Summary: How to Migrate from AppArmor to SELinux on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step migration guide

## Technologies Covered
- AppArmor (apparmor, aa-status, aa-teardown, apparmor_status)
- SELinux (selinux-basics, selinux-policy-default, selinux-utils, policycoreutils)
- Linux audit framework (auditd, ausearch, audit2allow, audit2why)
- SELinux management tools (semanage, semodule, restorecon, setsebool, getsebool)
- Ubuntu / Debian package management (apt)
- GRUB bootloader configuration (/etc/default/grub, update-grub)
- systemd service management (systemctl)

## Sources Consulted
- AppArmor aa-status(8) man page (Ubuntu)
- Debian selinux-basics package docs (selinux-activate script behavior)
- Ubuntu package archive for selinux-basics, selinux-policy-default, policycoreutils-python-utils, setools (https://packages.ubuntu.com/)
- audit-userspace ausearch(8) documentation for valid -ts time keywords (now, recent, this-hour, today, yesterday, this-week, week-ago, this-month, this-year, boot, checkpoint)
- SELinux Project documentation on booleans (httpd_can_network_connect, httpd_can_network_connect_db, httpd_read_user_content), file context types (httpd_sys_content_t), and port types (http_port_t)
- Debian/Ubuntu apparmor package docs for aa-teardown
- GRUB documentation for kernel command line parameters (apparmor=0, security=selinux, selinux=1)

## Issues Found

1. **`aa-status --profiled | sort` does not list services** — The comment said "List which services have active profiles", but according to aa-status(8), the `--profiled` flag only displays the count of loaded profiles (a single number), not their names. Sorting a single integer is meaningless. Changed to plain `sudo aa-status` (which outputs the full report including profile names and their enforcement modes).

2. **`echo "apparmor=0" | sudo tee -a /etc/default/grub` does not disable AppArmor** — Appending a bare `apparmor=0` line to `/etc/default/grub` has no effect on the kernel command line. Kernel parameters must be added inside the `GRUB_CMDLINE_LINUX_DEFAULT` (or `GRUB_CMDLINE_LINUX`) variable. The post even acknowledged this in a follow-up comment but kept the broken echo command. Replaced with an instruction to edit `/etc/default/grub` and append `apparmor=0` to the existing `GRUB_CMDLINE_LINUX_DEFAULT` value, followed by `update-grub`.

3. **`ausearch -m avc -ts "1 hour ago"` is not a valid time format** — ausearch's `-ts` flag accepts only specific keywords (now, recent, this-hour, today, yesterday, this-week, week-ago, this-month, this-year, boot, checkpoint) or an explicit date/time. The string `"1 hour ago"` is not parsed and the command would fail. Changed to `-ts recent` (which means the last 10 minutes) and adjusted the comment accordingly.

## Review Notes
- Ubuntu's official MAC is AppArmor; SELinux support on Ubuntu is community-maintained via the `selinux-basics` and `selinux-policy-default` packages. The post correctly frames the migration as non-trivial and recommends a long permissive period, which is accurate guidance. Readers should be aware that the policy quality on Ubuntu is generally less mature than on RHEL/Fedora derivatives.
- The example `semanage port -a -t http_port_t -p tcp 8080` can fail on systems where 8080 is already mapped (commonly to `http_cache_port_t`); in that case `-m` (modify) must be used instead of `-a`. The post presents this as an illustrative example, so it was left as-is, but readers may need to adapt.
- The `selinux-activate` script's behavior described in the post (adds `security=selinux selinux=1` to the kernel command line, creates `/.autorelabel`, starts in permissive) is accurate for the Debian/Ubuntu `selinux-basics` package.
- The choice of `setenforce 1` first (runtime) before editing `/etc/selinux/config` is the correct safe ordering — it allows immediate rollback with `setenforce 0` without a reboot.
