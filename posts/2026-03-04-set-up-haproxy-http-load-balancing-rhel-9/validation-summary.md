# Validation Summary: How to Set Up HAProxy for HTTP Load Balancing on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- HAProxy
- firewalld
- SELinux
- systemd
- HTTP load balancing

## Sources Consulted
- HAProxy Configuration Manual: https://docs.haproxy.org/3.3/configuration.html
- Red Hat Satellite documentation, "Installing and configuring the load balancer": https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/configuring_capsules_with_a_load_balancer/installing-and-configuring-the-load-balancer
- Red Hat Enterprise Linux 9 documentation, "Using and configuring firewalld": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- haproxy_selinux(8) SELinux policy manual page: https://manpages.opensuse.org/Leap-16.0/selinux-policy-doc/haproxy_selinux.8.en.html

## Issues Found
- The HAProxy configuration comment said the TLS cipher directives used "system SSL settings." The snippet hard-codes HAProxy TLS defaults for future HTTPS listeners, so the comment was changed to describe that accurately.
- The SELinux comment said `haproxy_connect_any` allows HAProxy to bind to ports. The boolean allows HAProxy to connect to backend TCP ports, so the comment was corrected.
- The log-checking command only showed `journalctl -u haproxy`, which is useful for service logs but may not show request logs sent through `log /dev/log`. Added a `journalctl -t haproxy` command for syslog-tagged HAProxy request logs.

## Review Notes
The HAProxy configuration syntax for `balance`, `option httpchk`, `cookie ... insert indirect nocache`, ACL path matching, server weights, health checks, and the runtime stats socket is valid in current HAProxy documentation. The `option httpchk GET /health` example uses the default HTTP/1.0 health-check request; sites that require HTTP/1.1 host-based routing may need to add an HTTP version and Host header.
