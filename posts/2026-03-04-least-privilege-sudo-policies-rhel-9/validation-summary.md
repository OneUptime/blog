# Validation Summary: How to Implement Least-Privilege Sudo Policies on RHEL

## Status
validated

## Post Type
Tutorial / security configuration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- sudo and sudoers
- visudo
- sudoedit
- Linux users and groups
- systemd service management
- firewalld
- auditd tools

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing sudo access": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-sudo-access_configuring-basic-system-settings
- sudoers manual, sudo project documentation: https://www.sudo.ws/docs/man/sudoers.man/
- firewalld firewall-cmd documentation: https://firewalld.org/documentation/man-pages/firewall-cmd
- Local sudo, sudoers, visudo, groupadd, usermod, and sudoedit man pages
- CentOS Stream 9 / RHEL-derived iproute package listings for the `ss` binary path: https://www.rpmfind.net/linux/rpm2html/search.php?query=%2Fusr%2Fsbin%2Fss

## Issues Found
- The monitoring command alias used `/usr/bin/ss`, but RHEL-derived 9 iproute packages provide `ss` under `/usr/sbin/ss`. Updated the sudoers example to use `/usr/sbin/ss`.
- The web admin role granted `/usr/bin/vi` for root-owned configuration files even though the article correctly warns later that editors such as `vi` can provide shell escapes. Replaced those editor grants with `sudoedit` entries.
- The post attempted to block dangerous commands with separate negated sudoers rules such as `%webadmins ALL=(root) !DANGEROUS`. Official sudoers guidance warns that negated command rules are not a reliable way to make broad grants safe, and the separate rules were redundant with the role allowlists. Replaced that example with guidance to keep role policies as explicit allowlists and remove broad grants.
- The wrapper script example set permissions but did not explicitly set root ownership. Added `sudo chown root:root /usr/local/sbin/restart-webapp.sh` before `chmod 750`.

## Review Notes
Validated the corrected sudoers snippets with `visudo -c` using an aggregate temporary sudoers file. The remaining examples are intentionally illustrative and should still be adapted to exact local package paths, service names, and organization-specific roles before production use.
