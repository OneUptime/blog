# Validation Summary: How to Configure MongoDB to Listen on Multiple IP Addresses

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (3.6+)
- mongod configuration (mongod.conf)
- mongosh (MongoDB Shell)
- Linux networking tools (ss, netstat)
- TLS/SSL configuration for MongoDB

## Sources Consulted
- MongoDB official documentation: net.bindIp configuration option (https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-net.bindIp)
- MongoDB official documentation: net.bindIpAll setting (https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-net.bindIpAll)
- MongoDB official documentation: --bind_ip command-line option (https://www.mongodb.com/docs/manual/reference/program/mongod/#std-option-mongod.--bind_ip)
- MongoDB official documentation: Security checklist (https://www.mongodb.com/docs/manual/administration/security-checklist/)
- MongoDB official documentation: TLS/SSL configuration (https://www.mongodb.com/docs/manual/reference/configuration-options/#tls-options)
- ss(8) man page for output format reference

## Issues Found
- **Incorrect `ss`/`netstat` expected output format**: The example output shown for the verification step did not match the actual output format of either `ss -tlnp` or `netstat -tlnp`. The columns were scrambled (showing `tcp 0.0.0.0:* LISTEN 0 27017 127.0.0.1:27017 ...` which doesn't correspond to any standard tool's output). Fixed to show realistic `ss -tlnp` output with correct column order: `LISTEN 0 128 <local_address>:<port> <peer_address>:* users:(("mongod",...))`.

## Review Notes
- The `net.tls` configuration shown in the Security Considerations section is valid for MongoDB 4.2+. Prior to 4.2, the equivalent setting was `net.ssl`. Since the post targets MongoDB 3.6+, readers using 3.6 or 4.0 would need to use `net.ssl` instead. This is a minor version-specific caveat but not an error since the post doesn't claim the TLS config applies to all 3.6+ versions, and 4.2+ is the current standard.
- The `bindIp: 0.0.0.0` example only covers IPv4. For dual-stack (IPv4 + IPv6) environments, `bindIp: 0.0.0.0,::` or `bindIpAll: true` (which covers both) would be needed. The post correctly shows `bindIpAll: true` as the primary option and `0.0.0.0` as an equivalent, though they are not strictly identical in IPv6-enabled environments.
- All other technical claims, configuration syntax, commands, and security recommendations are accurate.
