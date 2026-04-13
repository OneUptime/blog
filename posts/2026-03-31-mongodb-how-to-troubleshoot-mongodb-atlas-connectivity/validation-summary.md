# Validation Summary: How to Troubleshoot MongoDB Atlas Connectivity

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MongoDB Atlas (cloud-hosted MongoDB)
- MongoDB Atlas CLI (`atlas` command)
- MongoDB Shell (`mongosh`)
- DNS SRV record resolution (`dig`, `nslookup`)
- TCP connectivity testing (`nc`, `openssl s_client`)
- Node.js MongoDB driver (`MongoClient`)
- AWS CLI (VPC peering, security groups, VPC endpoints)
- VPC Peering and AWS PrivateLink

## Sources Consulted
- MongoDB Atlas documentation: Connection String formats (https://www.mongodb.com/docs/manual/reference/connection-string/)
- MongoDB Atlas CLI reference: `atlas accessLists` commands (https://www.mongodb.com/docs/atlas/cli/current/command/atlas-accessLists-create/)
- MongoDB Node.js Driver documentation: MongoClient options including TLS and SDAM event monitoring (https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/)
- MongoDB Node.js Driver: Connection Monitoring (https://www.mongodb.com/docs/drivers/node/current/fundamentals/monitoring/connection-monitoring/)
- DNS SRV record specification for MongoDB (https://www.mongodb.com/docs/manual/reference/connection-string/#dns-seed-list-connection-format)
- `nslookup` man page for query type flags (`-type=SRV`)
- AWS CLI documentation for `describe-route-tables`, `describe-security-groups`, `describe-vpc-endpoints`

## Issues Found
1. **Missing `-type=SRV` flag on `nslookup` command (line 67)**: The command `nslookup _mongodb._tcp.cluster0.abc12.mongodb.net` was missing the `-type=SRV` flag. Without this flag, `nslookup` performs an A record query by default, which would not return SRV records for the `_mongodb._tcp` prefixed hostname. The comment stated "Should return SRV records with host:port entries," which would only be true with the `-type=SRV` flag. Fixed to `nslookup -type=SRV _mongodb._tcp.cluster0.abc12.mongodb.net`.

## Review Notes
- The post correctly warns against using `0.0.0.0/0` in production and `tlsAllowInvalidCertificates: true` in production, which is good security guidance.
- The Atlas CLI commands (`atlas accessLists create/list`) use the current command syntax.
- The Node.js driver options (`tls`, `tlsAllowInvalidCertificates`, `tlsCAFile`, `monitorCommands`, `serverMonitoringMode`) and SDAM events (`serverHeartbeatFailed`, `serverOpening`, `serverClosed`) are all current and valid.
- Port 27016 mentioned alongside 27017 is valid (used by Atlas Data Federation).
- The URL-encoding examples in the checklist (`@ -> %40, # -> %23`) are correct.
