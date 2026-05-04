# Validation Summary: How to Configure MongoDB to Listen on IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (mongod) configuration
- mongosh (MongoDB Shell)
- IPv6 networking
- TLS/SSL configuration for MongoDB
- MongoDB authentication and user management
- ip6tables / ufw firewall rules
- ss network utility
- systemd / systemctl

## Sources Consulted
- MongoDB Manual — Configuration File Options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Manual — net.ipv6 setting: https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-net.ipv6
- MongoDB Manual — net.bindIp / net.bindIpAll: https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-net.bindIp
- MongoDB Manual — Connection String URI Format: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB Manual — TLS/SSL Configuration: https://www.mongodb.com/docs/manual/tutorial/configure-ssl/
- mongosh CLI reference: https://www.mongodb.com/docs/mongodb-shell/reference/options/
- MongoDB db.createUser() reference: https://www.mongodb.com/docs/manual/reference/method/db.createUser/

## Issues Found

1. **Missing `net.ipv6: true` setting (critical)**: The original post did not include the `net.ipv6` configuration option. MongoDB disables IPv6 support by default (`net.ipv6: false`); without setting `net.ipv6: true` (or passing `--ipv6` on the command line), `mongod` will not accept IPv6 connections even if `bindIp` includes IPv6 addresses. Added `ipv6: true` to both YAML configuration examples and updated the Summary section to reference this requirement.

2. **Unquoted YAML value containing colons**: The first example used `bindIp: 0.0.0.0,::` without quotes. While most YAML parsers tolerate this, the trailing `::` adjacent to a comma is fragile and inconsistent with the other examples in the same block which use quoted strings. Wrapped this in double quotes (`"0.0.0.0,::"`) and `"127.0.0.1,::1,2001:db8::10"` for consistency and safety.

## Review Notes
- `net.bindIpAll: true` and `net.bindIp` should not be set simultaneously — the post correctly presents `bindIpAll` as an alternative.
- The `bindIp: 0.0.0.0,::` form is technically redundant when `net.ipv6: true` is on, since `0.0.0.0` already accepts IPv4-mapped IPv6 connections on dual-stack systems, but it remains a valid and explicit dual-stack configuration.
- The `ip6tables` rules shown are correct as standalone commands but will not survive reboot without `ip6tables-persistent` (or equivalent) — out of scope to mention in this post.
- `mongosh` (MongoDB Shell) is the current shell; the legacy `mongo` shell was deprecated in 5.0 and removed in 6.0, so the post's use of `mongosh` is current.
- The connection string bracket requirement for IPv6 (`[2001:db8::10]`) is per RFC 3986 and MongoDB's URI spec — correctly stated.
- TLS field names (`tls.mode`, `tls.certificateKeyFile`, `tls.CAFile`) and `--tls`/`--tlsCAFile` mongosh options are current and correct.
