# Validation Summary: How to Set Up SSH Local Port Forwarding Over IPv4 (-L)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSH client
- OpenSSH server configuration
- SSH local port forwarding
- IPv4 networking
- autossh
- PostgreSQL psql client
- MySQL client

## Sources Consulted
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/ssh_config
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config
- autossh README: https://www.harding.motd.ca/autossh/README.txt
- PostgreSQL 18 `psql` documentation: https://www.postgresql.org/docs/18/app-psql.html
- MySQL 8.4 `mysql` client options: https://dev.mysql.com/doc/refman/8.4/en/mysql-command-options.html
- Author GitHub profile URL: https://github.com/nawazdhandala

## Issues Found
- The post stated that `GatewayPorts` must be enabled on the SSH server to bind a local `-L` forward to all local interfaces. Server-side `GatewayPorts` controls remote port forwards (`-R`), not local forwards. Updated the example to use `ssh -g -L 0.0.0.0:...` and note client-side `GatewayPorts`.
- The post described the default local bind address as exactly `127.0.0.1`. OpenSSH documents this as loopback binding by default, subject to the client `GatewayPorts` setting. Updated the wording to "local loopback."
- The post said other machines on `10.0.0.0/8` can use `10.0.0.1:8080`. Reachability depends on routing and firewall policy, not simply being in that CIDR range. Updated the wording to "machines that can reach 10.0.0.1."

## Review Notes
The remaining SSH commands, flags, and `~/.ssh/config` directives are consistent with the OpenSSH documentation. The article correctly scopes `-4` as forcing IPv4 for the SSH connection itself; if strict IPv4 selection is required for the forwarded destination, use an IPv4 literal or a remote-side hostname that resolves as intended.
