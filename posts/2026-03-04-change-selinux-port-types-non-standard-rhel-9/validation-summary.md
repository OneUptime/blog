# Validation Summary: How to Change SELinux Port Types for Non-Standard Service Ports on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- SELinux
- `semanage port`
- firewalld / `firewall-cmd`
- OpenSSH `sshd`
- Apache HTTP Server
- Linux audit logs / `ausearch`

## Sources Consulted
- Red Hat Enterprise Linux 9, Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat Enterprise Linux 9, Configuring firewalls and packet filters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_firewalls_and_packet_filters/index
- `semanage-port(8)` manual page mirror from Linux man-pages: https://man7.org/linux/man-pages/man8/semanage-port.8.html
- firewalld `firewall-cmd(1)` manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat Enterprise Linux 8 securing networks documentation for non-default OpenSSH ports and `policycoreutils-python-utils`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/securing_networks/using-and-configuring-firewalld_securing-networks

## Issues Found
- The introduction said Apache on port `8443` would be blocked because that port is not labeled for HTTP use. RHEL 9 documentation lists `8443` under `http_port_t`, so this was incorrect. Changed the example port to `9090`, which matches the later Apache example and is not in the documented default `http_port_t` list.
- The delete example used `sudo semanage port -d -t http_port_t -p tcp 8888`. Current `semanage-port(8)` syntax deletes a local port rule by protocol and port, so the example was changed to `sudo semanage port -d -p tcp 8888`.
- The `http_port_t` row in the common port types table omitted default RHEL 9 HTTP port labels that were shown elsewhere in the post. Updated it to `80, 81, 443, 488, 8008, 8009, 8443, 9000`.

## Review Notes
The main SELinux workflow is correct for RHEL 9: inspect labels with `semanage port -l`, add a custom label with `semanage port -a -t <type> -p <protocol> <port>`, modify an existing mapping with `-m`, list local changes with `-l -C`, and keep firewalld in sync for network access. On minimal systems, `semanage` may require the `policycoreutils-python-utils` package.
