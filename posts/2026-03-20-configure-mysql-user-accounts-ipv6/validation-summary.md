# Validation Summary: How to Configure MySQL User Accounts for IPv6 Addresses

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- MySQL (account management: CREATE USER, GRANT, ALTER USER, RENAME USER, DROP USER, SET PASSWORD)
- IPv6 addressing (literal addresses, loopback `::1`, prefix notation, wildcards)
- MySQL `mysql.user` and `information_schema.processlist` system tables
- MySQL command-line client (`mysql -h ...`)

## Sources Consulted
- MySQL 8.0 Reference Manual, "Specifying Account Names" — https://dev.mysql.com/doc/refman/8.0/en/account-names.html
- MySQL 8.0 Reference Manual, "CREATE USER Statement" — https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL 8.0 Reference Manual, "ALTER USER Statement" — https://dev.mysql.com/doc/refman/8.0/en/alter-user.html
- MySQL 8.0 Reference Manual, "SET PASSWORD Statement" — https://dev.mysql.com/doc/refman/8.0/en/set-password.html
- MySQL 8.0 Reference Manual, "RENAME USER Statement" — https://dev.mysql.com/doc/refman/8.0/en/rename-user.html
- MySQL 8.0 Reference Manual, "GRANT Statement" — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual, "FLUSH Statement" (notes that grant-table changes via account-management statements take effect without FLUSH PRIVILEGES) — https://dev.mysql.com/doc/refman/8.0/en/flush.html
- MySQL 8.0 Reference Manual, "Connection Compression" / mysql client options — https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html
- RFC 4291 (IPv6 Addressing Architecture) and RFC 5952 (recommendations for canonical IPv6 text representation)

## Issues Found
- **Misleading claim that `'webapp'@'2001:db8::%'` covers a `/48` subnet.** MySQL host patterns are evaluated as string comparisons against the canonical IPv6 representation; `2001:db8::%` only matches addresses whose canonical form begins with the literal `2001:db8::` (e.g. `2001:db8::1`, `2001:db8::a:b`), and does **not** match every address in the `2001:db8::/48` prefix (for example, `2001:db8:0:1::1` would not match). I rewrote the inline comments in the "Creating Users for IPv6 Access" section to clarify this is a literal string match against the canonical form rather than a true `/48` CIDR match. The example SQL itself is correct and was left unchanged.

## Review Notes
- `FLUSH PRIVILEGES` is shown after `CREATE USER`, `GRANT`, and `ALTER USER` statements. This is unnecessary because account-management statements update the in-memory grant tables immediately (per MySQL documentation, `FLUSH PRIVILEGES` is only required when the grant tables are modified directly via `INSERT`/`UPDATE`/`DELETE`). It is not technically incorrect, just superfluous, so it was left in place.
- IPv6 wildcard host matching has additional caveats beyond what's described: MySQL canonicalizes IPv6 addresses before comparison, so wildcard patterns can produce surprising results (e.g. `_` and `%` are SQL-pattern characters interacting with `:` separators). The post's later note recommending firewall rules for true network-level access control is good practical advice and partially mitigates this.
- The `mysql -h 2001:db8::10` invocation is correct; the MySQL command-line client accepts IPv6 literals without brackets on the `-h` flag (brackets are typically only required in URI-style connection strings).
- The `SELECT user, host FROM information_schema.processlist;` query works because MySQL is case-insensitive for column names by default; in stricter contexts the canonical column names are uppercase (`USER`, `HOST`).
- IPv4 with netmask notation (e.g. `'192.168.1.0/255.255.255.0'`) is supported by MySQL but no equivalent exists for IPv6. The post's broader claim that "MySQL doesn't support CIDR notation for user hosts" is true for IPv6 and effectively true overall (MySQL uses netmask form, not CIDR slash-notation).
