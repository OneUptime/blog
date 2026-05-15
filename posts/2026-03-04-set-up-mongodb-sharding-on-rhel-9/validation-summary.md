# Validation Summary: How to Set Up MongoDB Sharding on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- MongoDB
- MongoDB sharding
- mongod
- mongos
- mongosh
- systemd
- firewalld
- SELinux

## Sources Consulted
- MongoDB Manual: Deploy a Self-Managed Sharded Cluster - https://www.mongodb.com/docs/manual/tutorial/deploy-shard-cluster/
- MongoDB Manual: mongod options - https://www.mongodb.com/docs/manual/reference/program/mongod/
- MongoDB Manual: mongos options - https://www.mongodb.com/docs/v8.2/reference/program/mongos/
- MongoDB Manual: sh.addShard() - https://www.mongodb.com/docs/manual/reference/method/sh.addShard/
- MongoDB Manual: sh.shardCollection() - https://www.mongodb.com/docs/manual/reference/method/sh.shardCollection/
- MongoDB Manual: sh.enableSharding() - https://www.mongodb.com/docs/v8.2/reference/method/sh.enableSharding/
- MongoDB Manual: Install MongoDB Community Edition on Red Hat or CentOS - https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-red-hat/
- firewalld manual: firewall-cmd - https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The sharding setup skipped required replica set initiation for both the config server replica set and the shard replica set. Added `rs.initiate()` commands with the required `configsvr: true` field for the config server.
- The setup created `/data` directories with `sudo` but did not account for ownership. Added a `chown` command so the user running the `mongod` commands can write to the data directories.
- The guide connected to `mongos` without starting a `mongos` process. Added a `mongos --configdb configRS/localhost:27019 --port 27017` command.
- The `sh.addShard()` example used `shard1:27018`, but no such hostname was established in the guide. Changed it to `localhost:27018` to match the single-host test setup.
- The guide used ambiguous service and firewall placeholders. Clarified that service management requires custom unit names for the separate sharded-cluster processes and replaced the firewall placeholder with the MongoDB sharded-cluster ports `27017-27019/tcp`.
- The verification commands checked the default MongoDB service and target instead of the configured sharded-cluster service and `mongos` router. Updated them to use the custom service placeholder and connect to port `27017` with `sh.status()`.
- `sh.enableSharding("mydb")` is not required starting in MongoDB 6.0 for sharding a collection, so it was removed from the setup sequence.

## Review Notes
This remains a minimal single-host test setup. A production MongoDB sharded cluster should use multiple members for the config server replica set and shard replica sets, hostname-based networking, authentication, TLS or x.509 internal authentication, and dedicated systemd unit files or configuration files for each process.
