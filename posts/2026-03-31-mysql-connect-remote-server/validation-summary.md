# Validation Summary: How to Connect to a Remote MySQL Server

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- Linux system administration (Ubuntu/Debian, RHEL/CentOS)
- UFW and firewalld firewalls
- AWS Security Groups (CLI)
- SSL/TLS for MySQL connections
- SSH tunneling
- MySQL client CLI

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables (bind_address) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: Managing MySQL Server with systemd — https://dev.mysql.com/doc/refman/8.0/en/using-systemd.html
- MySQL 8.0 Reference Manual: mysql Client Options — https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html
- MySQL 8.0 Reference Manual: CREATE USER Statement — https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0.23 Release Notes — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-23.html
- AWS CLI ec2 authorize-security-group-ingress documentation — https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html

## Issues Found
1. **bind-address default value was inaccurate**: The post stated "By default, MySQL listens only on `127.0.0.1`". MySQL 8.0 itself defaults to `*` (all interfaces); it is the Linux distribution packages (Ubuntu/Debian in particular) that override this to `127.0.0.1`. Updated wording to clarify this is a distribution-level default, not a MySQL-level default.

2. **MySQL service name missing for RHEL**: The `systemctl restart` command only showed `mysql`, which is the Ubuntu/Debian service name. On RHEL-based systems, the service name is `mysqld`. Added a comment-separated block showing both variants, matching the style used for config file paths earlier in the post.

3. **FLUSH HOSTS is deprecated**: The troubleshooting table recommended `FLUSH HOSTS` to resolve blocked hosts. This statement was deprecated in MySQL 8.0.23 and removed in MySQL 8.4. Replaced with `TRUNCATE TABLE performance_schema.host_cache`, which is the current recommended approach.

## Review Notes
- The `FLUSH PRIVILEGES` calls after `CREATE USER` and `GRANT` are technically unnecessary (these statements automatically update the in-memory grant tables), but they are not harmful and are a common convention. Left as-is since they do not cause errors.
- The SSH tunnel section correctly notes that the MySQL user must be defined for `localhost` when connecting through a tunnel.
- Storing plaintext passwords in `~/.my.cnf` is a valid approach with `chmod 600`, though `mysql_config_editor` is a more secure alternative for credential storage. This is a potential improvement but not an error.
- The `caching_sha2_password` plugin shown in the example output is correct for MySQL 8.0+ (it replaced `mysql_native_password` as the default).
