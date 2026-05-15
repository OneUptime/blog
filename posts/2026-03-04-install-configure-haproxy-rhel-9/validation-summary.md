# Validation Summary: How to Install and Configure HAProxy on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- HAProxy
- firewalld
- SELinux
- rsyslog
- systemd

## Sources Consulted
- Red Hat Satellite 6.19 documentation, "Installing and configuring the load balancer" for RHEL 9 HAProxy installation, SELinux boolean, and systemctl commands: https://docs.redhat.com/en/documentation/red_hat_satellite/6.19/html/configuring_capsules_with_a_load_balancer/installing-and-configuring-the-load-balancer
- Red Hat Enterprise Linux 9 package manifest, AppStream repository information: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/package_manifest/repositories
- Red Hat Enterprise Linux 9 SELinux documentation for booleans, `setsebool -P`, and non-standard port policy behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- HAProxy Configuration Manual for `global`, `defaults`, `frontend`, `backend`, `listen`, `bind`, `server`, `option httpchk`, `stats socket`, and stats page directives: https://docs.haproxy.org/2.1/configuration.html
- firewalld documentation for `firewall-cmd --permanent --add-service`, `--add-port`, and `--reload`: https://firewalld.org/documentation/howto/open-a-port-or-service.html
- firewalld `firewall-cmd` manual for permanent port/service options: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat HAProxy logging documentation for chrooted HAProxy and rsyslog `/dev/log` socket handling: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/load_balancer_administration/s1-haproxy-logging
- rsyslog `imuxsock` documentation for additional Unix sockets and `CreatePath`: https://docs.rsyslog.com/doc/configuration/modules/imuxsock.html

## Issues Found
- The post said `haproxy.cfg` has four main sections, but the article later uses a `listen` section for stats. HAProxy supports `listen` sections, so I changed the wording to "commonly uses these sections" and added `listen` to the table.
- The HAProxy sample uses `chroot /var/lib/haproxy` while logging to `/dev/log`. Red Hat documents that chrooted HAProxy needs a syslog socket inside the chroot, so I added an rsyslog `imuxsock` input for `/var/lib/haproxy/dev/log`.
- The logging section implied `journalctl -u haproxy` was the primary place for HAProxy syslog traffic. I narrowed that wording to service startup logs and left the dedicated rsyslog file configuration for detailed HAProxy logs.

## Review Notes
- The main HAProxy configuration snippet was validated with `haproxy -c` using the official `haproxy:2.4` container image and reported `Configuration file is valid`.
- The SELinux command is broad: `haproxy_connect_any` allows HAProxy to connect to arbitrary backend ports. For stricter production setups, mapping only the required ports with SELinux port policy can be preferable.
