# Validation Summary: How to Fix Kerberos 'Clock Skew Too Great' Error on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- Kerberos
- Active Directory Domain Services
- chrony / chronyd / chronyc
- NTP
- systemd timedatectl
- firewalld
- Samba net command

## Sources Consulted
- MIT Kerberos krb5.conf documentation: https://web.mit.edu/kerberos/krb5-latest/doc/admin/conf_files/krb5_conf.html
- Red Hat Enterprise Linux 9 documentation, configuring basic system settings and chrony: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/index
- chrony chronyc manual: https://chrony-project.org/doc/4.2/chronyc.html
- chrony chrony.conf manual: https://chrony-project.org/doc/4.2/chrony.conf.html
- Samba net manual: https://www.samba.org/samba/docs/current/man-html/net.8.html
- Microsoft Windows Time Service documentation: https://learn.microsoft.com/en-us/windows-server/networking/windows-time-service/how-the-windows-time-service-works
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld service options documentation: https://firewalld.org/documentation/service/options.html
- Local command help for timedatectl/systemctl where available.

## Issues Found
- The firewall section implied that adding the `ntp` service with `firewall-cmd --add-service=ntp` is the normal fix when NTP is blocked. That opens inbound NTP service access on the RHEL host, which is only appropriate when the host is serving NTP to other systems. For a Kerberos client syncing from domain controllers, the important requirement is outbound UDP 123 to the time source. Updated the comments to distinguish client outbound access from inbound NTP service exposure and replaced the `grep` check with `firewall-cmd --query-service=ntp`.

## Review Notes
The Kerberos default clock skew tolerance of 300 seconds, chrony usage on RHEL 8/9, `server`/`pool` chrony configuration syntax, `chronyc tracking`, `chronyc sources -v`, `chronyc makestep`, `timedatectl set-time`, `timedatectl set-timezone`, and Samba `net time -S` usage are technically valid. The `net` command requires Samba client tooling to be installed, which is a useful future caveat but not an error in the post.
