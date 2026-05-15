# Validation Summary: How to Set Up HAProxy for TCP and HTTP Load Balancing on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- HAProxy
- TCP load balancing
- HTTP load balancing
- TLS passthrough and TLS termination
- SELinux
- firewalld
- MySQL, PostgreSQL, Redis, and SMTP health checks

## Sources Consulted
- HAProxy 2.8 Configuration Manual: https://docs.haproxy.org/2.8/configuration.html
- HAProxy 2.4 Configuration Manual: https://docs.haproxy.org/2.4/configuration.html
- HAProxy health checks documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/
- Red Hat documentation for HAProxy load balancer setup on RHEL 9: https://docs.redhat.com/en/documentation/red_hat_satellite/6.19/html/configuring_capsules_with_a_load_balancer/installing-and-configuring-the-load-balancer
- Red Hat Enterprise Linux 9 firewalld documentation: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/configuring_firewalls_and_packet_filters/red_hat_enterprise_linux-9-configuring_firewalls_and_packet_filters-en-us.pdf
- Red Hat Enterprise Linux 9 SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- MySQL 8.4 CREATE USER documentation: https://dev.mysql.com/doc/refman/8.4/en/create-user.html

## Issues Found
- The mixed-mode HAProxy example defined named `defaults` sections but did not explicitly attach the frontends and backends to them. In HAProxy, later proxy sections inherit from the active defaults section unless a named defaults section is selected with `from`. I updated the mixed-mode example to use `from http_defaults` for the HTTP frontend/backend and `from tcp_defaults` for the TCP frontend/backends.
- The Redis backend in the mixed-mode example enabled `option tcp-check` without a Redis request/response check. A bare TCP check only verifies that a TCP connection can be opened. I added the documented Redis `PING` / `+PONG` check so the example performs the protocol-aware check implied by the section.

## Review Notes
- The local environment did not have the `haproxy` binary installed, so I could not run `haproxy -c` locally. Syntax and behavior were checked against the official HAProxy configuration manuals instead.
- The firewalld and SELinux commands are valid for RHEL-style systems, but production deployments should still open only the specific listener ports needed for the chosen HAProxy configuration.
