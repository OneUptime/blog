# Validation Summary: How to Configure MongoDB for IPv4 Only

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongod server configuration)
- mongod.conf YAML configuration
- MongoDB command-line options (--bind_ip, --ipv6, --port)
- Linux networking (sysctl, ss command)
- Node.js MongoDB driver (MongoClient connection string)

## Sources Consulted
- MongoDB official documentation: mongod configuration file options (net.ipv6, net.bindIp) — https://www.mongodb.com/docs/manual/reference/configuration-options/#net-options
- MongoDB official documentation: mongod command-line options (--ipv6, --bind_ip) — https://www.mongodb.com/docs/manual/reference/program/mongod/
- Linux kernel documentation: sysctl parameters for disabling IPv6 (net.ipv6.conf.all.disable_ipv6)

## Issues Found
- **Minor: Misleading sysctl comment** — The inline comment said "requires reboot" but the script immediately runs `sudo sysctl -p`, which applies the changes without a reboot. Changed the comment to "applied immediately by sysctl -p" to accurately reflect the behavior.

## Review Notes
- `net.ipv6: false` is the default value in MongoDB, so setting it explicitly is redundant. However, being explicit is a reasonable teaching choice in a tutorial context and is not technically incorrect.
- The `--ipv6` flag and `net.ipv6` config option only enable IPv6 support — they do not by themselves cause mongod to listen on IPv6 addresses. You must also bind to an IPv6 address via `bindIp`. The post correctly focuses on binding to IPv4 addresses only.
- The advice to use `127.0.0.1` instead of `localhost` in connection strings is sound, as localhost resolution behavior varies by OS and /etc/hosts configuration.
