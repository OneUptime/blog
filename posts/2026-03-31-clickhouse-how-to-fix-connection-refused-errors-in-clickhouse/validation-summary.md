# Validation Summary: How to Fix 'Connection refused' Errors in ClickHouse

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- ClickHouse (server configuration, ports, listen_host, users.xml)
- systemd (systemctl, journalctl)
- Linux networking tools (ss, netstat, nc, curl)
- Firewalls (UFW, firewalld, iptables)
- Docker (container networking, port publishing)
- Kubernetes (Service resources)
- XML configuration files

## Sources Consulted
- ClickHouse official documentation on server settings: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse network ports reference: https://clickhouse.com/docs/guides/sre/network-ports
- ClickHouse users.xml / access control: https://clickhouse.com/docs/operations/settings/settings-users
- ClickHouse Docker image documentation: https://hub.docker.com/r/clickhouse/clickhouse-server
- UFW, firewalld, and iptables man pages
- `nc(1)` (netcat-openbsd) and `ss(8)` man pages

## Issues Found
No technical issues found. All port numbers (9000 native, 8123 HTTP, 9440 native TLS, 9009 interserver HTTP) are correct defaults. The XML structure with `<clickhouse>` root element, `<tcp_port>`, `<http_port>`, `<listen_host>`, and the `users.xml` `<networks>` configuration are all accurate. Firewall commands (ufw, firewall-cmd, iptables), connectivity testing commands (`curl`, `nc -zv`), and the Docker `-p` port publishing example all work as described.

## Review Notes
- The claim "ClickHouse 20.6+ listens only on localhost" is broadly correct — the default-bind-to-localhost behavior has actually been the default for a long time, not specific to 20.6+. The version qualifier is not misleading to readers, just slightly imprecise.
- Note: the "Connection refused" error specifically refers to TCP-level refusal (nothing listening). User network restrictions in `users.xml` typically produce a different error (connection accepted then closed with an authorization/access error), not strictly "Connection refused". However, the section is still useful troubleshooting context and not technically wrong in a harmful way.
- Modern ClickHouse also accepts `<yandex>` as the root tag for backwards compatibility; `<clickhouse>` (used in the post) is the current recommended form.
