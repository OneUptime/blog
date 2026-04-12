# Validation Summary: How to Restrict Database Operations by IP in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (server configuration, `net.bindIp`)
- iptables (Linux firewall)
- ufw (Ubuntu firewall)
- AWS Security Groups (EC2)
- MongoDB Atlas CLI (IP access lists)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB documentation on `net.bindIp` configuration: https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-net.bindIp
- MongoDB documentation on security hardening: https://www.mongodb.com/docs/manual/administration/security-checklist/
- MongoDB Atlas CLI `accessLists create` reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-accessLists-create/
- AWS CLI `authorize-security-group-ingress` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- iptables man page and documentation
- ufw documentation: https://help.ubuntu.com/community/UFW
- MongoDB Shell (mongosh) documentation: https://www.mongodb.com/docs/mongodb-shell/

## Issues Found
1. **Atlas CLI `--entry` flag incorrect**: The `atlas accessLists create` command takes the IP address or CIDR block as a positional argument, not via a `--entry` flag. Changed `atlas accessLists create --entry 203.0.113.45 ...` to `atlas accessLists create 203.0.113.45 ...` (and similarly for the CIDR example).

2. **Legacy `mongo` shell replaced by `mongosh`**: The "Verifying Access Control" section used the `mongo` command, which is the legacy MongoDB shell removed from MongoDB 6.0+ distributions (since 2022). Updated to `mongosh`, which is the current MongoDB Shell.

## Review Notes
- The `mongod.conf` YAML snippets, iptables rules, ufw commands, AWS security group JSON format, and combined bindIp + authorization config are all correct.
- The post correctly notes that MongoDB 3.6+ defaults to binding to localhost only.
- The advice to combine IP restrictions with `security.authorization: enabled` is sound and follows MongoDB's official security checklist recommendations.
- The `--type` flag in the Atlas CLI commands (e.g., `--type ipAddress`, `--type cidrBlock`) is optional since the CLI can infer the type from the entry format, but specifying it explicitly is not wrong and improves clarity.
