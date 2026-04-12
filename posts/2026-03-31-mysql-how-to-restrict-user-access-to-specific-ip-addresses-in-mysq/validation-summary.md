# Validation Summary: How to Restrict User Access to Specific IP Addresses in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7+ / 8.0+)
- MySQL user account management (CREATE USER, GRANT, ALTER USER, RENAME USER, DROP USER)
- MySQL host-based access control
- SSL/TLS certificate requirements (REQUIRE SSL, REQUIRE SUBJECT)

## Sources Consulted
- MySQL 8.0 Reference Manual: Account Names and Passwords — https://dev.mysql.com/doc/refman/8.0/en/account-names.html
- MySQL 8.0 Reference Manual: CREATE USER Statement — https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual: ALTER USER Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-user.html
- MySQL 8.0 Reference Manual: RENAME USER Statement — https://dev.mysql.com/doc/refman/8.0/en/rename-user.html
- MySQL 8.0 Reference Manual: DROP USER Statement — https://dev.mysql.com/doc/refman/8.0/en/drop-user.html
- MySQL 8.0 Reference Manual: Access Control and Account Management — https://dev.mysql.com/doc/refman/8.0/en/access-control.html
- MySQL 8.0 Reference Manual: Using Encrypted Connections — https://dev.mysql.com/doc/refman/8.0/en/using-encrypted-connections.html

## Issues Found
No technical issues found.

## Review Notes
- MySQL also supports netmask notation (e.g., `'198.51.100.0/255.255.255.0'`) for subnet-based host restrictions, which is not mentioned in the post. This is not an error, as the `%` wildcard approach shown is the most commonly used method.
- If the MySQL server is started with `skip-name-resolve`, hostname-based restrictions (like `'app_user'@'app-server.internal'`) will not work — only IP addresses and `localhost` will be resolved. The post mentions that hostname resolution "can be slower" but does not mention this server option. This could be a useful addition in a future update.
- The `$A$005$...` hash prefix in the sample output is consistent with the `caching_sha2_password` plugin, which is the default authentication plugin in MySQL 8.0+. This implicitly targets MySQL 8.0+, which is appropriate as it is the current GA release.
