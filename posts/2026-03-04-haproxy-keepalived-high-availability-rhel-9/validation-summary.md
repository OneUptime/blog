# Validation Summary: How to Set Up HAProxy with Keepalived for High Availability on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- HAProxy
- Keepalived
- VRRP
- firewalld
- SELinux
- systemd

## Sources Consulted
- Red Hat Customer Portal: RHEL 8 and 9 HAProxy and Keepalived documentation references, including RHEL 9 HAProxy 2.4 mapping: https://access.redhat.com/solutions/6996272
- Red Hat Enterprise Linux 7 Load Balancer Administration, HAProxy and Keepalived behavior and nonlocal binding: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/epub/load_balancer_administration/s1-haproxy-setup-frontend
- HAProxy 2.4 Configuration Manual: https://docs.haproxy.org/2.4/configuration.html
- Keepalived official man page: https://www.keepalived.org/manpage.html
- firewalld rich language manual: https://firewalld.org/documentation/man-pages/firewalld.richlanguage
- RFC 5798, Virtual Router Redundancy Protocol Version 3 for IPv4 and IPv6: https://www.rfc-editor.org/rfc/rfc5798
- Red Hat Satellite load balancer documentation for the `haproxy_connect_any` SELinux boolean: https://docs.redhat.com/en/documentation/red_hat_satellite/6.5/html/load_balancing_guide/installing-the-load-balancer

## Issues Found
- The HAProxy configuration used `bind *:80`, while the surrounding explanation says HAProxy binds to the VIP and needs `net.ipv4.ip_nonlocal_bind` so the standby node can start before owning that VIP. Changed the frontend bind to `192.168.1.100:80` so the configuration matches the nonlocal binding requirement described in the post.
- The SELinux section said Keepalived needed `haproxy_connect_any` to manage virtual IPs. That boolean applies to HAProxy connectivity, not Keepalived VIP management. Updated the wording to explain that it is useful when SELinux blocks HAProxy from connecting to backend ports such as 8080.

## Review Notes
- The Keepalived `vrrp_script`, `track_script`, priority, weight, `fall`, and `rise` configuration is syntactically consistent with the official Keepalived man page.
- VRRP is correctly identified as IP protocol 112.
- The firewalld rich rule syntax for accepting a protocol by name is valid.
- The HAProxy stats listener is unauthenticated in the sample. That is acceptable for a lab tutorial but should be restricted or protected before production use.
