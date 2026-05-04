# Validation Summary: How to Configure ZooKeeper with IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Apache ZooKeeper (3.5+)
- IPv6 networking
- JVM system properties (`java.net.*`)
- ZooKeeper four-letter words (`stat`, `mntr`, `ruok`)
- ZooKeeper AdminServer
- Python Kazoo client
- Apache Kafka (`zookeeper.connect`)
- Linux utilities: `systemctl`, `ss`, `nc`

## Sources Consulted
- Apache ZooKeeper Administrator's Guide — https://zookeeper.apache.org/doc/current/zookeeperAdmin.html (server.X, clientPortAddress, secureClientPort, AdminServer, four-letter words)
- ZooKeeper Reconfig / multi-address server line documentation
- OpenJDK networking system properties — `java.net.preferIPv4Stack` and `java.net.preferIPv6Addresses`
- Kazoo documentation — https://kazoo.readthedocs.io/ (KazooClient `hosts` connection string)
- Apache Kafka documentation — `zookeeper.connect` connection string format
- IETF RFC 5952 / RFC 3986 — bracket notation for IPv6 literals in URI/host:port contexts

## Issues Found

1. **`server.X=` lines using bare IPv6 addresses (lines 33–35)**
   - **Original:** `server.1=2001:db8::10:2888:3888`
   - **Problem:** ZooKeeper's `server.X=host:quorum_port:election_port` format is colon-separated. With a bare IPv6 literal, the parser cannot tell where the address ends and the ports begin, so the configuration is ambiguous/invalid.
   - **Fix:** Wrapped each address in brackets: `server.1=[2001:db8::10]:2888:3888` (matches the bracketed syntax already used in the "Multi-Address Configuration" section below it). Added a clarifying comment.

2. **Non-existent JVM flag `-Djava.net.preferIPv6Stack=true` (line 65)**
   - **Problem:** There is no `java.net.preferIPv6Stack` system property in the JDK. The supported properties are `java.net.preferIPv4Stack` and `java.net.preferIPv6Addresses`.
   - **Fix:** Replaced with `-Djava.net.preferIPv4Stack=false -Djava.net.preferIPv6Addresses=true`, which is the documented way to force a dual-stack JVM toward IPv6, and updated the comment accordingly.

## Review Notes
- The four-letter words (`stat`, `mntr`, `ruok`) used in the verification section require enabling via `4lw.commands.whitelist` (or `*`) in `zoo.cfg` since ZooKeeper 3.5 — the post does not mention this, but the commands themselves are correct, so this is left as-is.
- ZooKeeper 3.5+ reachable-address tuples (`server.X=[addr]:2888:3888;[client]:2181`) shown in the "Multi-Address Configuration" section are correct. The semicolon-separated client section is the older single-address form; ZooKeeper also supports listing multiple quorum addresses separated by `|` for the multi-address feature, but that is an optional enhancement and not required for the IPv6 scope of this post.
- Kafka's ZooKeeper-as-metadata-store mode is being phased out in favor of KRaft from Kafka 3.x onward; the `zookeeper.connect` example is still accurate for clusters that use ZooKeeper, but readers on newer Kafka versions may want to note this trajectory. No change needed.
- `nc -6` is the GNU/OpenBSD netcat IPv6 flag — this is correct on most Linux distributions but `ncat` (nmap-ncat) uses different flags. Not a defect in the post.
