# Validation Summary: How to Set Up Fail2Ban to Protect SSH on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- EPEL
- Fail2Ban
- OpenSSH server logging
- firewalld
- systemd
- Fail2Ban jail configuration

## Sources Consulted
- Fedora EPEL Getting Started documentation: https://docs.fedoraproject.org/en-US/epel/getting-started/
- Red Hat blog, "How to install EPEL on RHEL and CentOS Stream": https://www.redhat.com/en/blog/install-epel-linux
- Fail2Ban upstream `jail.conf`: https://github.com/fail2ban/fail2ban/blob/master/config/jail.conf
- Fail2Ban upstream `firewallcmd-rich-rules.conf`: https://github.com/fail2ban/fail2ban/blob/master/config/action.d/firewallcmd-rich-rules.conf
- Fail2Ban client manual page: https://manpages.debian.org/testing/fail2ban/fail2ban-client.1.en.html
- firewalld `firewall-cmd` manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The EPEL install command used `sudo dnf install epel-release -y`, which is not sufficient on a stock RHEL 9 system because the EPEL release package is not normally available until EPEL is enabled. Updated it to enable CodeReady Builder and install the official EPEL 9 release RPM URL.
- The configuration set `banaction_allports = firewallcmd-rich-rules`. The upstream `firewallcmd-rich-rules` action is port-based and iterates over `<port>`, so using it as the all-ports action can break all-port jails such as `recidive`. Removed that override while keeping the SSH jail's `banaction = firewallcmd-rich-rules`.
- The file-based whitelist example used `ignorecommand = /etc/fail2ban/filter.d/ignorecommands/apache-hierarchical-ip`, which is not a general file whitelist command and did not pass `<ip>`. Replaced it with a simple exact-match whitelist file checked by `grep -Fxq <ip> /etc/fail2ban/ignore-ips.conf`.
- The troubleshooting advice for legitimate users said to lower `maxretry` or increase `findtime`. Lowering `maxretry` and increasing `findtime` make bans more likely. Changed it to increase `maxretry` or shorten `findtime`.

## Review Notes
The post assumes RHEL's traditional `/var/log/secure` SSH authentication log path. That is appropriate for the stated RHEL target, but systems configured to use only the systemd journal would need the Fail2Ban systemd backend and journal matching instead of a file `logpath`.
