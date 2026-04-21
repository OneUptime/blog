# Validation Summary: How to Set Up an SSH Tunnel for IPv4 Database Access (MySQL/PostgreSQL)

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenSSH local port forwarding
- SSH client configuration
- autossh
- systemd service units
- MySQL client and MySQL Workbench
- PostgreSQL psql, pg_isready, and pgAdmin
- Redis CLI
- Rails database.yml
- SQLAlchemy
- Linux ss

## Sources Consulted
- OpenSSH ssh(1) manual: https://man.openbsd.org/ssh.1
- OpenSSH ssh_config(5) manual: https://man.openbsd.org/ssh_config.5
- systemd network-online guidance: https://systemd.io/NETWORK_ONLINE/
- systemd.unit manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- autossh man page: https://manpages.debian.org/testing/autossh/autossh.1.en.html
- MySQL 8.4 mysql client options: https://dev.mysql.com/doc/refman/8.4/en/mysql-command-options.html
- MySQL 8.4 mysqladmin documentation: https://dev.mysql.com/doc/refman/8.4/en/mysqladmin.html
- MySQL Workbench Standard TCP/IP over SSH connection method: https://dev.mysql.com/doc/workbench/en/wb-mysql-connections-methods-ssh.html
- PostgreSQL 18 psql reference: https://www.postgresql.org/docs/current/app-psql.html
- PostgreSQL 18 pg_isready reference: https://www.postgresql.org/docs/current/app-pg-isready.html
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Rails configuration guide for database.yml: https://guides.rubyonrails.org/configuring.html
- SQLAlchemy 2.0 engine configuration: https://docs.sqlalchemy.org/en/20/core/engines.html
- Local OpenSSH 9.6p1 man pages and `ss --help` output

## Issues Found
- The post implied that all database traffic is encrypted within the SSH session. OpenSSH local forwarding encrypts the client-to-SSH-server leg and then the SSH server connects to the forwarded destination from the remote side. I updated the introduction and conclusion to clarify that database-native TLS is needed when the bastion-to-database hop also needs encryption.
- The systemd service used `After=network-online.target` without `Wants=network-online.target`. systemd documents that services which need to start after the network is online should include both. I added `Wants=network-online.target`.
- The MySQL Workbench note blurred the built-in SSH connection method with using the already-running manual tunnel. I clarified that Workbench can either use "Standard TCP/IP over SSH" with the bastion or "Standard TCP/IP" to `127.0.0.1:3307` when the manual tunnel is running.

## Review Notes
- The SSH, SSH config, MySQL, PostgreSQL, Redis, Rails, SQLAlchemy, and `ss` examples use valid current option names and syntaxes based on the consulted references.
- `ExitOnForwardFailure=yes` confirms that requested forwarding listeners are established, but it does not prove the ultimate database destination is reachable. The post's separate connectivity checks cover that.
- `-4` and `AddressFamily inet` force IPv4 for the SSH client connection. For named database targets behind the bastion, DNS and routing on the bastion still determine how the forwarded destination is reached.
