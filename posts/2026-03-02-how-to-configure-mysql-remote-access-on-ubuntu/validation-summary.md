# Validation Summary: How to Configure MySQL Remote Access on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- MySQL Server
- MySQL client
- UFW
- OpenSSH SSH tunneling
- autossh
- TLS/SSL for MySQL connections

## Sources Consulted
- Ubuntu Server documentation: Install and configure a MySQL server - https://ubuntu.com/server/docs/how-to/databases/install-mysql/
- Ubuntu Server documentation: Firewall - https://ubuntu.com/server/docs/how-to/security/firewalls/
- Ubuntu ufw(8) man page - https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- MySQL 8.0 Reference Manual: Server System Variables, `bind_address` - https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL Reference Manual: CREATE USER Statement - https://dev.mysql.com/doc/mysql/en/create-user.html
- MySQL Reference Manual: Specifying Account Names - https://dev.mysql.com/doc/refman/9.4/en/account-names.html
- MySQL 8.0 Reference Manual: Configuring MySQL to Use Encrypted Connections - https://dev.mysql.com/doc/refman/8.0/en/using-encrypted-connections.html
- Ubuntu/OpenSSH ssh(1) man page - https://manpages.ubuntu.com/manpages/focal/man1/ssh.1.html

## Issues Found
- The MySQL login command used `sudo mysql -u root -p`, which assumes a MySQL root password. Ubuntu's default package setup uses socket authentication for `root` and documents `sudo mysql -u root` without a password. Changed the command to `sudo mysql`.
- The subnet user example used the host wildcard `192.168.1.%`. MySQL still supports `%` and `_` host wildcards, but they are deprecated in MySQL 8.0.35 and later. Changed the example to IPv4 netmask notation: `192.168.1.0/255.255.255.0`.
- The SSH tunnel example reused the same username without noting that MySQL sees tunneled connections as local. Added a note that SSH tunnel users should be created or granted as `myapp_user`@`localhost`.
- The warning around `sudo ufw allow 3306` implied that relying exclusively on MySQL access controls could be acceptable. Tightened the wording to avoid recommending an internet-wide MySQL firewall rule.

## Review Notes
The remaining commands and configuration examples match the consulted documentation. The TLS section is technically correct, but future revisions could recommend `--ssl-mode=VERIFY_CA` or `VERIFY_IDENTITY` when clients can trust a CA certificate, because `REQUIRED` encrypts the connection without verifying server identity.
