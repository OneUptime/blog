# Validation Summary: How to Restrict Network Access with bindIp in MongoDB

## Status
validated

## Post Type
Tutorial / Security Configuration Guide

## Technologies Covered
- MongoDB (mongod configuration)
- MongoDB replica sets
- YAML configuration (`mongod.conf`)
- Linux networking tools (`ss`, `netstat`)
- iptables firewall rules
- systemd service management

## Sources Consulted
- MongoDB official documentation on `net.bindIp` configuration option (https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-net.bindIp)
- MongoDB 3.6 release notes regarding default bindIp change (https://www.mongodb.com/docs/manual/release-notes/3.6/#bind-to-localhost)
- MongoDB `getCmdLineOpts` command reference (https://www.mongodb.com/docs/manual/reference/command/getCmdLineOpts/)
- MongoDB replica set configuration reference (https://www.mongodb.com/docs/manual/reference/replica-configuration/)
- Linux `ss` and `netstat` man pages
- Linux `iptables` man page

## Issues Found
No technical issues found.

## Review Notes
- The post correctly notes the MongoDB 3.6 default bindIp change from `0.0.0.0` to `127.0.0.1`, which was a significant security improvement.
- All YAML configuration snippets use the correct format for `mongod.conf` with proper `net.bindIp` syntax (comma-separated string of IPs).
- The IPv6 binding example (`::`) alongside `0.0.0.0` is correct and a useful inclusion.
- The distinction between `bindIp` (interface binding) and firewall rules (source IP filtering) is accurately explained - these are complementary security layers.
- The iptables examples omit `sudo`, which is typically required for modifying firewall rules, but this is a minor stylistic choice rather than a technical error since the user may be running as root.
- The `netstat` command is noted as an alternative to `ss`; on newer Linux distributions, `netstat` may not be installed by default (it's in the `net-tools` package), while `ss` is part of `iproute2` which is standard. The post correctly lists `ss` first.
