# Validation Summary: How to Configure MongoDB for IPv6 Only

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (mongod server configuration)
- IPv6 networking
- mongod.conf (YAML configuration)
- mongosh (MongoDB Shell)
- Node.js MongoDB driver
- PyMongo (Python MongoDB driver)
- systemd (systemctl)
- ss (socket statistics utility)
- dig (DNS lookup)

## Sources Consulted
- MongoDB documentation on net configuration options (net.ipv6, net.bindIp): https://www.mongodb.com/docs/manual/reference/configuration-options/#net-options
- MongoDB documentation on --ipv6 and --bind_ip command-line options: https://www.mongodb.com/docs/manual/reference/program/mongod/
- MongoDB documentation on connection string URI format (IPv6 bracket syntax): https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB documentation on replica set configuration (rs.initiate): https://www.mongodb.com/docs/manual/reference/method/rs.initiate/
- RFC 5952 (IPv6 address text representation, ::1 loopback)
- RFC 2732 / RFC 3986 (IPv6 literals in URIs require brackets)

## Issues Found
1. **Mixed languages in a single code block**: The "Connecting with an IPv6 Connection String" section had Node.js, Python, and mongosh examples all inside a single `javascript` code block. Python code was commented with `//` (JavaScript comment syntax) instead of `#`. Split into three separate code blocks with correct language tags (`javascript`, `python`, `bash`) and corrected the Python comment to use `#`. The mongosh comment was also changed to `#` in a bash block.

## Review Notes
- The `net.ipv6: true` setting and `--ipv6` flag are correctly documented. MongoDB does require this flag to resolve and bind IPv6 addresses.
- The claim that "without `--ipv6`, mongod ignores IPv6 addresses in `--bind_ip`" is accurate for MongoDB versions through 7.x.
- The replica set configuration correctly uses bracketed IPv6 addresses in the `host` field, which is the required format to distinguish IPv6 colons from the host:port separator.
- The `2001:db8::/32` prefix used in examples is the documentation-reserved range per RFC 3849, which is appropriate for illustrative purposes.
- The `ss -tlnp` verification approach is Linux-specific; macOS users would need `lsof -i -P` or `netstat`. This is a minor scope limitation but not an error since MongoDB servers typically run on Linux.
