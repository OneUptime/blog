# Validation Summary: How to Manage /etc/hosts and Hostname Resolution on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- `/etc/hosts`
- GNU C Library Name Service Switch (`/etc/nsswitch.conf`)
- systemd `nss-myhostname`
- DNS lookup tools (`dig`, `host`, `getent`)
- NetworkManager CLI (`nmcli`)
- GNU `sed`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring authentication and authorization in RHEL": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_authentication_and_authorization_in_rhel/configuring-user-authentication-using-authselect_configuring-authentication-and-authorization-in-rhel
- Linux man-pages `hosts(5)`: https://man7.org/linux/man-pages/man5/hosts.5.html
- Linux man-pages `nsswitch.conf(5)`: https://man7.org/linux/man-pages/man5/nsswitch.conf.5.html
- Linux man-pages `getent(1)`: https://man7.org/linux/man-pages/man1/getent.1.html
- systemd `nss-myhostname(8)`: https://www.freedesktop.org/software/systemd/man/nss-myhostname.html
- BIND 9 manual pages for `dig` and `host`: https://bind9.readthedocs.io/en/latest/manpages.html
- Local command help output for `hostnamectl`, `getent`, `sed`, and `nmcli`

## Issues Found
- The post described `myhostname` as a generic fallback to "systemd's local hostname resolution" and the diagram said it returns `localhost`. `nss-myhostname` specifically resolves the locally configured system hostname to locally configured IP addresses, or fallback loopback addresses if no local addresses are configured. Updated the explanation and diagram to say it resolves the local system hostname and returns local system IPs.

## Review Notes
- The RHEL 9 `authselect select sssd` documentation confirms the `hosts: files dns myhostname` example used in the post.
- The `/etc/hosts` syntax, comments, IPv4/IPv6 examples, `getent hosts`, `dig`, `host`, `ping -c`, `sed -i`, and `nmcli -t -f IP4.ADDRESS device show` commands are technically valid.
- The statement that `nsswitch.conf` changes take effect immediately for new lookups is appropriate for RHEL 9's glibc generation, though long-running applications can still have their own resolver or DNS caches.
