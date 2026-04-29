# Validation Summary: How to Configure MongoDB Replica Set on IPv4

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- MongoDB (mongod, mongosh)
- MongoDB replica sets (`rs.initiate()`, `rs.status()`, etc.)
- YAML mongod.conf configuration
- OpenSSL (keyfile generation)
- iptables (firewall rules)
- systemd (service management)

## Sources Consulted
- MongoDB Manual — Configuration File Options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Manual — Deploy a Replica Set: https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set/
- MongoDB Manual — Internal/Membership Authentication (keyfile): https://www.mongodb.com/docs/manual/core/security-internal-authentication/
- MongoDB Manual — `rs.initiate()`: https://www.mongodb.com/docs/manual/reference/method/rs.initiate/
- MongoDB Manual — `rs.printSecondaryReplicationInfo()`: https://www.mongodb.com/docs/manual/reference/method/rs.printSecondaryReplicationInfo/
- MongoDB 5.0 Release Notes (removal of `printSlaveReplicationInfo`): https://www.mongodb.com/docs/manual/release-notes/5.0/
- MongoDB Manual — Connection String URI Format: https://www.mongodb.com/docs/manual/reference/connection-string/

## Issues Found
1. **Invalid comment syntax inside `rs.initiate()` JavaScript object** — Line previously had `# Preferred primary` inside a JavaScript/mongosh object literal. JavaScript uses `//` for line comments, not `#`. The `#` would have produced a `SyntaxError: Unexpected token '#'`. Changed to `// Preferred primary`.
2. **Removed method `rs.printSlaveReplicationInfo()`** — The post listed this with a comment "Older syntax", but it was actually removed in MongoDB 5.0 (not just deprecated) and will throw a "no such method" error on any current MongoDB. Replaced with `rs.printSecondaryReplicationInfo()` and updated the inline comment to clarify that the slave-named method was removed in MongoDB 5.0.

## Review Notes
- `rs.isMaster()` is shown alongside the description "Check who is primary". This method has been deprecated since MongoDB 5.0 in favor of `rs.hello()` / the `hello` command, but the legacy alias still works on current servers, so it is functionally correct. Future revisions could swap it for `rs.hello()`.
- The keyfile permissions (`chmod 400`, owner `mongodb:mongodb`) match the official MongoDB recommendation. Note that keyfiles must be no looser than `0600`/`0400` and must be owned by the mongod user.
- `bindIp: 127.0.0.1,10.0.0.1` correctly disables wildcard binding while allowing both loopback and the cluster-facing IPv4 address. `net.ipv6: false` is the correct knob to disable IPv6.
- The default data directory `/var/lib/mongodb` matches the Debian/Ubuntu package default; on RHEL-family packages the default is `/var/lib/mongo`. Readers on RHEL should adjust accordingly.
- The `openssl rand -base64 756` keyfile size matches the MongoDB documentation example.
- The replica-set connection string format with comma-separated hosts and `replicaSet=rs0` is correct, as is `readPreference=secondaryPreferred`.
