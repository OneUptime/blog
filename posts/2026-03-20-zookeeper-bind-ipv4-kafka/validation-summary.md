# Validation Summary: How to Set Up ZooKeeper to Bind to Specific IPv4 Addresses for Kafka

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Apache ZooKeeper (3.5+)
- Apache Kafka (with ZooKeeper mode and KRaft mode)
- systemd service unit files
- iptables firewall rules
- Linux networking (`ss`, `nc`)

## Sources Consulted
- Apache ZooKeeper Administrator's Guide: https://zookeeper.apache.org/doc/current/zookeeperAdmin.html
- ZooKeeper config reference (clientPortAddress, tickTime, initLimit, syncLimit, autopurge.*, admin.*): https://zookeeper.apache.org/doc/r3.8.4/zookeeperAdmin.html#sc_advancedConfiguration
- ZooKeeper dynamic reconfiguration / server entry format: https://zookeeper.apache.org/doc/current/zookeeperReconfig.html
- Apache Kafka documentation (`zookeeper.connect`, `zookeeper.session.timeout.ms`, `zookeeper.connection.timeout.ms`): https://kafka.apache.org/documentation/#brokerconfigs
- Kafka KRaft documentation (`process.roles`, `node.id`, `controller.quorum.voters`): https://kafka.apache.org/documentation/#kraft
- KIP-833 (KRaft production-ready in Kafka 3.3): https://cwiki.apache.org/confluence/display/KAFKA/KIP-833
- iptables manual: https://linux.die.net/man/8/iptables
- systemd.service manual: https://www.freedesktop.org/software/systemd/man/systemd.service.html

## Issues Found
No technical issues found.

All configuration parameters, port numbers, command syntax, file paths, and version claims were verified against official ZooKeeper and Kafka documentation:

- `clientPortAddress`, `clientPort`, `tickTime`, `initLimit`, `syncLimit`, `minSessionTimeout`, `maxSessionTimeout`, `autopurge.snapRetainCount`, `autopurge.purgeInterval` — valid zoo.cfg parameters.
- `admin.serverAddress` / `admin.serverPort` — valid for ZooKeeper 3.5+ AdminServer.
- Quorum entry format `server.N=host:peerPort:leaderPort[;[clientAddress:]clientPort]` — matches official docs.
- Ports 2181 (client), 2888 (peer), 3888 (leader election) — standard ZooKeeper defaults.
- `zookeeper.connect` with chroot `/kafka` — valid Kafka broker config.
- KRaft went production-ready in Kafka 3.3 (Oct 2022) — accurate.
- `controller.quorum.voters` format `id@host:port`, `process.roles=broker,controller`, `listeners=PLAINTEXT://...,CONTROLLER://...` — all match KRaft docs.
- Four-letter words (`ruok`, `stat`) syntax is correct.
- `zkServer.sh status` / `zkCli.sh -server` invocations are correct.

## Review Notes
- **Four-letter word commands (`ruok`, `stat`) require whitelisting in ZooKeeper 3.5+.** The commands shown (`echo ruok | nc ...`, `echo stat | nc ...`) are syntactically correct, but by default ZooKeeper 3.5+ disables four-letter commands unless they are listed in `4lw.commands.whitelist` (e.g. `4lw.commands.whitelist=ruok,stat,conf,mntr`) in `zoo.cfg`. Readers following the post on a fresh ZooKeeper install may need to add this setting. This is a caveat rather than an error and does not change the correctness of the commands shown.
- The `;clientIP:clientPort` suffix in the `server.N=` entry has been supported since ZooKeeper 3.5.0 (the post says "3.5.7+", which is also correct but slightly more conservative than necessary). Multi-address quorum entries for redundancy (multiple `|`-separated addresses) were added in 3.6.0, but that feature is not used in the examples.
- The systemd unit sets `PIDFile=/var/lib/zookeeper/zookeeper_server.pid`. `zkServer.sh` writes its PID to `$ZOOPIDFILE` (or `$ZOO_DATADIR/zookeeper_server.pid` by default). Readers should ensure `ZOOPIDFILE` is exported in `zookeeper-env.sh` (or rely on the default dataDir match) so that the path matches. The example is consistent with the `dataDir=/var/lib/zookeeper` used elsewhere in the post.
- Dropping all traffic to ports 2181/2888/3888 at the end of the firewall rules assumes the default `INPUT` policy is `ACCEPT`; if it is already `DROP`, the explicit `-j DROP` lines are redundant but harmless.
- For new deployments, the post correctly recommends KRaft. ZooKeeper support is deprecated in Kafka 3.5 and is planned for removal in Kafka 4.0.
