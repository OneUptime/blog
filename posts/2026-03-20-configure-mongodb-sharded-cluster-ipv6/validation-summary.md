# Validation Summary: How to Configure MongoDB Sharded Cluster with IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- MongoDB (sharded cluster, replica sets, config servers, mongos router)
- mongosh (MongoDB Shell)
- IPv6 networking
- YAML configuration (mongod.conf, mongos.conf)
- pymongo (Python MongoDB driver)
- ip6tables (Linux IPv6 firewall)

## Sources Consulted
- [MongoDB Configuration File Options — net.ipv6](https://www.mongodb.com/docs/manual/reference/configuration-options/)
- [MongoDB Sharded Cluster Components](https://www.mongodb.com/docs/manual/core/sharded-cluster-components/)
- [Deploy a Sharded Cluster](https://www.mongodb.com/docs/manual/tutorial/deploy-shard-cluster/)
- [MongoDB Shell (mongosh) Documentation](https://www.mongodb.com/docs/mongodb-shell/)
- [Compatibility Changes in MongoDB 7.0](https://www.mongodb.com/docs/manual/release-notes/7.0-compatibility/) — confirms `storage.journal.enabled` removal
- [PyMongo Documentation — MongoClient](https://pymongo.readthedocs.io/en/stable/api/pymongo/mongo_client.html)
- [ip6tables(8) man page](https://man7.org/linux/man-pages/man8/ip6tables.8.html)

## Issues Found

1. **Missing `net.ipv6: true` in all config files (critical).** MongoDB does not accept IPv6 connections by default. Per the official docs, you must set `net.ipv6: true` (or pass `--ipv6` on the command line) in addition to setting `bindIp` to an IPv6 address; otherwise mongod/mongos will not listen on IPv6 even with a v6 bindIp. Added `ipv6: true` under `net:` in the config server, shard, and mongos YAML configurations.

2. **Use of the legacy `mongo` shell.** The legacy `mongo` shell was deprecated in MongoDB 5.0 and removed in MongoDB 6.0; the supported tool is `mongosh`. Replaced all `mongo --host …` invocations with `mongosh --ipv6 --host …`. The `--ipv6` flag is also required for the shell to attempt IPv6 connections.

3. **Removed `storage.journal.enabled: true`.** This option was deprecated in MongoDB 6.1 and removed in 7.0 (journaling is always enabled with WiredTiger). Leaving it in the config file produces an "Unrecognized option" startup error on modern MongoDB versions. Removed the `journal:` block from the config server YAML.

## Review Notes

- The bracketed IPv6 host syntax used throughout (`[2001:db8::c1]:27019`) is correct for both replica set member specifications and connection strings; MongoDB requires brackets to disambiguate the IPv6 address from the port colon.
- The `configDB` connection string format (`replSetName/host1,host2,host3`) and the `addShard` argument format are both syntactically correct.
- The pymongo seed-list entry `'[2001:db8::r1]:27017'` is a valid form; alternatively a `mongodb://[2001:db8::r1]:27017` connection URI could be used.
- Documentation example IPv6 addresses (`2001:db8::/32`) are appropriately used — this prefix is reserved for documentation per RFC 3849.
- `bindIpAll: true` is mentioned as an alternative; note that with `bindIpAll: true` you still need `net.ipv6: true` for IPv6 to be enabled.
- The post does not cover authentication (keyFile / x.509) or TLS, which would be required for any production sharded deployment, but that is a scope choice rather than a technical inaccuracy.
