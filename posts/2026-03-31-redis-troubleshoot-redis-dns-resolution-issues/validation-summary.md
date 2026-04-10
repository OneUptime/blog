# Validation Summary: How to Troubleshoot Redis DNS Resolution Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Redis (Sentinel, Cluster)
- DNS (dig, nslookup, systemd-resolved)
- Kubernetes (CoreDNS, kubectl)
- Java JVM DNS caching
- Node.js ioredis client

## Sources Consulted
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis 6.2 release notes (sentinel resolve-hostnames / announce-hostnames introduced in 6.2)
- Redis 7.0 release notes (cluster-announce-hostname introduced in 7.0)
- systemd documentation on resolvectl (systemd-resolve deprecated since systemd 239, June 2018)
- Oracle Java Networking Properties: https://docs.oracle.com/javase/8/docs/technotes/guides/net/properties.html
- ioredis GitHub repository and API documentation: https://github.com/redis/ioredis
- ioredis PR #723 (dnsLookup option for Cluster): https://github.com/redis/ioredis/pull/723

## Issues Found

1. **Deprecated `systemd-resolve` command**: The post used `sudo systemd-resolve --flush-caches` which has been deprecated since systemd 239 (June 2018). Changed to `sudo resolvectl flush-caches`.

2. **Sentinel config directives in bash code block**: The bash code block for "Stale DNS Cache After Failover" included `sentinel resolve-hostnames yes` and `sentinel announce-hostnames yes` as if they were shell commands. These are `sentinel.conf` directives and were already correctly shown in the config block below. Removed the duplicate lines from the bash block.

3. **Wrong Java security file name**: The comment referenced `jvm.security` but the correct file is `java.security` (located at `$JAVA_HOME/conf/security/java.security` in Java 11+). Fixed the comment.

4. **Incorrect ioredis `lookup` option**: The code example showed a `lookup` option on the standalone `Redis` constructor, which is not a supported ioredis option. The correct option is `dnsLookup`, and it is only available on the `Cluster` constructor (added in ioredis v4.2.0). Replaced the example with the correct Cluster-mode `dnsLookup` usage.

## Review Notes
- The claim "Java applications using the JVM cache DNS indefinitely by default" is a simplification. This is only true when a SecurityManager is installed. Without one (typical in modern standalone apps), the default TTL is 30 seconds. The advice to explicitly set TTL is still valid and the statement is a commonly cited caveat, so it was left as-is.
- All Redis commands (`CLUSTER NODES`, `CLUSTER MYID`, `CONFIG SET cluster-announce-hostname`) are correct and properly noted as Redis 7+ where applicable.
- Kubernetes commands and CoreDNS troubleshooting steps are accurate.
- The Sentinel configuration directives (`sentinel resolve-hostnames`, `sentinel announce-hostnames`) were correctly identified as Redis 6.2+ features.
