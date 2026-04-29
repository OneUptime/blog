# Validation Summary: How to Configure MongoDB bindIp for Specific IPv4 Addresses

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (mongod, mongosh)
- YAML configuration (mongod.conf)
- systemd unit overrides
- ufw (Uncomplicated Firewall)
- iptables
- Linux networking utilities (ss, nc)

## Sources Consulted
- MongoDB Manual — Configuration File Options (`net.bindIp`, `net.ipv6`, `security.authorization`): https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Manual — `mongod` command-line options (`--bind_ip`): https://www.mongodb.com/docs/manual/reference/program/mongod/
- MongoDB Manual — `db.createUser()` and built-in roles: https://www.mongodb.com/docs/manual/reference/method/db.createUser/ and https://www.mongodb.com/docs/manual/reference/built-in-roles/
- MongoDB Manual — Default bind to localhost since 3.6 (localhost binding compatibility): https://www.mongodb.com/docs/manual/core/security-mongodb-configuration/
- systemd.service(5) — ExecStart override semantics (empty `ExecStart=` reset)
- ufw(8) and iptables(8) man pages
- ss(8) and nc(1) man pages

## Issues Found
No technical issues found.

- `bindIp` default of `127.0.0.1` is correct for MongoDB 3.6+.
- YAML comma-separated `bindIp` list syntax is correct.
- `--bind_ip` CLI flag (with underscore) is the canonical form.
- systemd `ExecStart=` reset pattern (empty assignment followed by new value) is correct.
- `db.createUser()` syntax with mixed string/object role specifications is valid; `userAdminAnyDatabase` and `readWriteAnyDatabase` are valid built-in roles on the admin database.
- `security.authorization: enabled` is the correct YAML value.
- ufw and iptables rule ordering is correct (ACCEPT before DROP/deny).
- `ss -tlnp`, `nc -zv`, and mongosh connection URI usage are all correct.

## Review Notes
- The section heading "Using Environment Variable" is slightly misleading because the section actually explains that mongod.conf does **not** support environment variable substitution and instead recommends passing flags via CLI/systemd. The content is technically accurate; only the heading framing could be improved in a future revision.
- `net.ipv6: false` is the default in MongoDB and is somewhat redundant when `bindIp` only contains IPv4 addresses, but it is harmless and explicit.
- `sudo ufw deny 27017` denies both TCP and UDP on that port; specifying `27017/tcp` would be more precise but the current form is valid ufw syntax.
- Passwords in examples (`AdminPassword123`, `AppPassword123`) are illustrative only; readers should be reminded to use strong, unique credentials in production. This is implied but not stated.
