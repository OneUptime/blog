# Validation Summary: How to Set Up HAProxy for PostgreSQL Connection Routing on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- HAProxy
- PostgreSQL
- firewalld
- SELinux
- Linux systemd and socket tooling

## Sources Consulted
- HAProxy Configuration Manual: `option pgsql-check`, `backup`, stats, timeouts, and TCP/listen syntax: https://docs.haproxy.org/3.3/configuration.html
- HAProxy Runtime API documentation for UNIX socket commands including `show servers state` and `show stat`: https://www.haproxy.com/documentation/haproxy-runtime-api/
- HAProxy health check documentation for PostgreSQL checks: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/
- PostgreSQL documentation for `pg_hba.conf`: https://www.postgresql.org/docs/18/auth-pg-hba-conf.html
- PostgreSQL documentation for `trust` authentication: https://www.postgresql.org/docs/18/auth-trust.html
- PostgreSQL documentation for hot standby read-only behavior and failover/promotion: https://www.postgresql.org/docs/17/hot-standby.html and https://www.postgresql.org/docs/current/warm-standby.html
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat documentation showing the `haproxy_connect_any` SELinux boolean pattern: https://docs.redhat.com/en/documentation/red_hat_quay/3.9/html/deploy_red_hat_quay_-_high_availability/preparing_for_red_hat_quay_high_availability

## Issues Found
- The description claimed "connection pooling", but the HAProxy configuration shown is TCP connection routing and load balancing, not PostgreSQL connection pooling. Changed the description to "failover support."
- The introductory read/write splitting language could be read as SQL-aware automatic splitting. Clarified that applications must send writes and reads to different HAProxy ports.
- The `pg_hba.conf` example allowed `trust` authentication from an entire `/24` network. Narrowed the example to a single HAProxy host IP because PostgreSQL documentation warns that `trust` is only suitable when every allowed client host is trusted.
- The write listener included a backup standby as "automatic failover." A PostgreSQL standby remains read-only until promoted, and HAProxy does not promote PostgreSQL replicas. Commented out the standby server line and changed the note to say it should be added after external failover tooling promotes it.
- The timeout section repeated full `listen` blocks, which could be incorrectly appended to the previous configuration and cause duplicate listener definitions. Changed it to show only the timeout lines to add inside the existing listeners.
- The summary overstated health check and load balancing behavior. Updated it to say the built-in check verifies PostgreSQL protocol availability and that HAProxy distributes database sessions, not individual queries.

## Review Notes
The commands and HAProxy directives reviewed are syntactically consistent with current HAProxy, PostgreSQL, firewalld, and SELinux documentation. The remaining `trust` example is technically valid for HAProxy's basic PostgreSQL health check, but production deployments should restrict it tightly or use a health-check approach aligned with the site's authentication policy.
