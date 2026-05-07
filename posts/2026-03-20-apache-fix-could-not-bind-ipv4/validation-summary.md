# Validation Summary: How to Fix Apache 'Could Not Bind to Address' Errors on IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server
- systemd
- Linux networking tools (`ss`, `ip`)
- SELinux
- Linux capabilities

## Sources Consulted
- Apache HTTP Server: Binding to Addresses and Ports: https://httpd.apache.org/docs/current/bind.html
- Apache HTTP Server: Starting Apache: https://httpd.apache.org/docs/2.4/invoking.html
- Apache HTTP Server: `apachectl` control interface: https://httpd.apache.org/docs/current/en/programs/apachectl.html
- systemd `journalctl` manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd `systemd.exec` manual: https://www.freedesktop.org/software/systemd/man/256/systemd.exec.html
- Red Hat Enterprise Linux 8, Using SELinux: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/8/pdf/using_selinux/Red_Hat_Enterprise_Linux-8-Using_SELinux-en-US.pdf
- Red Hat SELinux troubleshooting (`ausearch` usage): https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-security-enhanced_linux-troubleshooting-fixing_problems
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux capabilities manual page: https://man7.org/linux/man-pages/man7/capabilities.7.html
- Debian `apache2ctl` manual page: https://manpages.debian.org/testing/apache2/apache2ctl.8.en.html

## Issues Found
- The SELinux section incorrectly suggested `semanage port -a` for port `80` and for `8080`. On stock RHEL/CentOS policies, `80` is already included in `http_port_t`, and re-adding an existing port can fail. I changed this section to inspect existing allowed ports first and to use a truly non-standard example port (`3131`) when showing how to add a port.
- The low-port permissions section stated the rule too absolutely and included an incomplete `authbind` workaround. On Linux, privileged ports are a default policy and can also be handled with `CAP_NET_BIND_SERVICE` or by changing the privileged-port threshold. I corrected the wording, removed the incomplete `authbind` steps, and kept technically valid alternatives.
- The section heading said `SELinux or AppArmor` but only documented SELinux commands. I renamed the heading to match the actual content.
- The verification example used `grep apache2` but showed an expected `ss` output line without process details and with a fixed backlog value that is not reliable across systems. I replaced it with an IPv4-specific listener check and a generic expected result.
- A few commands were too generic for an IPv4-specific article. I updated the `ss` and `ip` examples to use their IPv4-specific forms.

## Review Notes
- The post remains primarily Debian/Ubuntu-oriented in its Apache service names and paths (`apache2`, `apache2ctl`, `/usr/sbin/apache2`), while the SELinux section is explicitly RHEL/CentOS-specific. That split is technically valid, but it is worth keeping in mind for future cross-distro edits.
- I also cross-checked command flags against current local `--help` output for `journalctl`, `ss`, `ip`, and `systemctl`.
