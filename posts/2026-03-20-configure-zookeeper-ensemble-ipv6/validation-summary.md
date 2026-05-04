# Validation Summary: How to Configure ZooKeeper Ensemble with IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Apache ZooKeeper (3.5+/3.6+/3.9 admin server, 4lw commands, ensemble configuration)
- IPv6 networking (address literals, link-local, address bracketing)
- Apache Kafka (zookeeper.connect, listeners over IPv6)
- JVM system properties (`java.net.preferIPv6Addresses`, `java.net.preferIPv4Stack`)
- ip6tables / netfilter-persistent
- Linux tooling (`systemctl`, `journalctl`, `ss`, `nc`, `curl`)

## Sources Consulted
- ZooKeeper 3.9 Administrator's Guide — https://zookeeper.apache.org/doc/r3.9.2/zookeeperAdmin.html (clientPortAddress, server.X format, admin.serverAddress, 4lw.commands.whitelist, embedded admin server endpoints)
- ZooKeeper source: `ConfigUtils.java::getHostAndPort()` and `QuorumPeerConfig.java` (parsing of `server.X` lines and bracket requirement for IPv6)
- ZooKeeper source: `bin/zkEnv.sh` (sourcing of `zookeeper-env.sh` and `java.env`)
- Debian `iptables-persistent` / `netfilter-persistent` package documentation (rules path under `/etc/iptables/`)
- Kafka documentation for `zookeeper.connect` and `listeners` IPv6 syntax (bracketed host:port)

## Issues Found
1. **`server.X` IPv6 syntax was invalid.** The post had `server.1=2001:db8::1:2888:3888` (and `.2`, `.3`). ZooKeeper's `ConfigUtils.getHostAndPort()` splits unbracketed entries on `:`, which mangles IPv6 literals — and the unbracketed string is even ambiguously parseable as a single legal IPv6 address. IPv6 literals on `server.X` lines **must** be bracketed. Changed all three lines to `server.X=[2001:db8::N]:2888:3888` and updated the inline comment to call out the bracket requirement.
2. **Missing `4lw.commands.whitelist`.** The post later uses `echo ruok | nc ...`, `echo stat | nc ...`, and `echo mntr | nc ...`. As of ZooKeeper 3.5.3 these commands are disabled by default; only `srvr` is whitelisted. Without `4lw.commands.whitelist` set, the `nc` calls would return "is not executed because it is not in the whitelist." Added `4lw.commands.whitelist=stat,ruok,conf,isro,mntr,srvr` to the `zoo.cfg` example so the testing section actually works.
3. **Wrong iptables-persistent path.** Post wrote rules to `/etc/ip6tables/rules.v6`. The `iptables-persistent` / `netfilter-persistent` package on Debian/Ubuntu uses a single `/etc/iptables/` directory for both `rules.v4` and `rules.v6`; there is no `/etc/ip6tables/` directory. Corrected to `/etc/iptables/rules.v6`.

## Review Notes
- `clientPortAddress=2001:db8::1` (no brackets) is correct — it is a bare host string passed to `InetAddress.getByName()`. Same for `admin.serverAddress`.
- `zkCli.sh -server "[2001:db8::1]:2181"` is correct — zkCli expects bracketed IPv6 literals when a port follows.
- `/commands/stat` and `/commands/mntr` are valid embedded admin server endpoints (Jetty, default port 8080); responses are JSON, unlike the raw-text 4lw output.
- `zookeeper-env.sh` is the standard environment file across 3.5–3.9 (`bin/zkEnv.sh` sources it from `$ZOOCFGDIR`); `java.env` in the same directory is also sourced and is the older convention. Both forms shown in the post are valid.
- Kafka 4.0 has dropped ZooKeeper entirely in favor of KRaft. This post is still relevant for Kafka 3.x and other ZooKeeper-dependent systems (HBase, SolrCloud, NiFi), but a future revision could note the Kafka deprecation timeline.
- `java.net.preferIPv4Stack=false` is the JVM default; setting it explicitly is harmless but not strictly required. Leaving as-is since it documents intent.
- The post does not mention that ZooKeeper requires a Java dual-stack or IPv6-only JVM — most modern OpenJDK builds have IPv6 enabled by default, so this is unlikely to bite users in practice.
