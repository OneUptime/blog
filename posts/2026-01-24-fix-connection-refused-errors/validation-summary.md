# Validation Summary: How to Fix 'Connection Refused' Network Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Linux networking and TCP/IP
- systemd and journalctl
- ss, netstat, nc, curl, telnet, nmap, traceroute, tcptraceroute, mtr
- Nginx, MySQL/MariaDB, PostgreSQL, Redis
- iptables, nftables, firewalld, UFW
- SELinux and AppArmor
- TCP wrappers
- Docker port publishing
- Bash scripting

## Sources Consulted
- RFC 9293: Transmission Control Protocol (TCP): https://datatracker.ietf.org/doc/html/rfc9293
- PostgreSQL current documentation, `listen_addresses`: https://www.postgresql.org/docs/current/runtime-config-connection.html
- PostgreSQL current documentation, `pg_hba.conf` authentication methods: https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- MySQL Reference Manual, `bind_address` server system variable: https://dev.mysql.com/doc/refman/9.6/en/server-system-variables.html
- Redis security documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- NGINX `listen` directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- NGINX Admin Guide, web server configuration: https://docs.nginx.com/nginx/admin-guide/web-server/web-server/
- firewalld documentation, opening a port or service: https://firewalld.org/documentation/howto/open-a-port-or-service.html
- firewalld documentation, reload behavior: https://firewalld.org/documentation/howto/reload-firewalld.html
- Ubuntu `ufw` man page: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- `semanage-port(8)` manual: https://man7.org/linux/man-pages/man8/semanage-port.8.html
- Local Linux man pages / help output for `ss`, `iptables`, `nft`, `systemctl`, `journalctl`, `nc`, `fuser`, and `lsof`

## Issues Found
- PostgreSQL remote access example used `md5` authentication in `pg_hba.conf`. Current PostgreSQL documentation marks MD5-encrypted passwords as deprecated and recommends SCRAM-SHA-256 for password authentication. Changed the example method to `scram-sha-256`.
- The nftables command implied `sudo nft add rule inet filter input tcp dport 80 accept` works on a fresh system. The command is valid only when the referenced table and chain already exist. Added a note clarifying that assumption.
- The firewall scenario described every remote firewall failure as "Connection refused". Packet drops normally cause timeouts, while reject/RST behavior can produce a refusal. Updated the scenario wording to distinguish reject rules from drop rules.
- The quick reference said "Connection refused on all ports" maps to a stopped service. That is too broad because it can also indicate firewall rejection or simply no listeners on those ports. Narrowed the row to a service port and noted "not running or not listening".
- The conclusion said connection refused errors "always" indicate active rejection and that the network path is working. RFC 9293 notes TCP connection attempts can also fail by ICMP Port Unreachable, and middleboxes may be involved. Changed the statement to "usually" and clarified that at least part of the path is working.

## Review Notes
- The commands and configuration snippets are generally valid, but many are distribution- or version-specific. Paths such as `/etc/postgresql/14/main/postgresql.conf` and `/etc/mysql/mysql.conf.d/mysqld.cnf` are common on Debian/Ubuntu-style systems but differ on RHEL-derived distributions and custom installs.
- Opening database services on `0.0.0.0` is technically valid but should be paired with strict firewall rules and authentication. The post already includes security cautions for Redis and firewall checks, but future revisions could make this warning more explicit for MySQL and PostgreSQL.
