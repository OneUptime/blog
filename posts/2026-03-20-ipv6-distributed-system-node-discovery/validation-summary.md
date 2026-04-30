# Validation Summary: How to Handle IPv6 in Distributed System Node Discovery

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and multicast
- DNS AAAA and SRV records
- Multicast DNS (mDNS)
- Python `socket` networking
- dnspython
- Apache Cassandra
- Apache ZooKeeper
- Apache Kafka
- HashiCorp Consul
- etcd / `etcdctl`
- BIND `dig`

## Sources Consulted
- RFC 3986: Uniform Resource Identifier (URI): Generic Syntax - https://www.rfc-editor.org/rfc/rfc3986.html
- RFC 2782: A DNS RR for specifying the location of services (DNS SRV) - https://www.rfc-editor.org/rfc/rfc2782
- RFC 4007: IPv6 Scoped Address Architecture - https://www.rfc-editor.org/rfc/rfc4007.html
- RFC 4291: IP Version 6 Addressing Architecture - https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 6762: Multicast DNS - https://www.rfc-editor.org/rfc/rfc6762.html
- Python `socket` documentation - https://docs.python.org/3/library/socket.html
- dnspython resolver documentation - https://dnspython.readthedocs.io/en/latest/resolver-functions.html
- Apache Cassandra configuration docs - https://cassandra.apache.org/doc/stable/cassandra/getting-started/configuring.html
- Apache Cassandra `cassandra.yaml` reference - https://cassandra.apache.org/doc/latest/cassandra/managing/configuration/cass_yaml_file.html
- Apache Kafka admin client configs - https://kafka.apache.org/42/configuration/admin-configs/
- Apache ZooKeeper `NetUtils` API docs - https://zookeeper.apache.org/doc/r3.9.3/apidocs/zookeeper-server/org/apache/zookeeper/common/NetUtils.html
- Apache ZooKeeper `ConfigUtils` API docs - https://zookeeper.apache.org/doc/r3.9.3/apidocs/zookeeper-server/org/apache/zookeeper/server/util/ConfigUtils.html
- Consul Agent Service HTTP API - https://developer.hashicorp.com/consul/api-docs/agent/service
- Consul DNS overview - https://developer.hashicorp.com/consul/docs/discover/dns
- etcd developer guide: interacting with etcd - https://etcd.io/docs/v3.7/dev-guide/interacting_v3/
- BIND 9 `dig` manual - https://bind9.readthedocs.io/en/v9.20.16/manpages.html

## Issues Found
- The opening URL-format example used a Cassandra-specific key with a port, which was misleading for the surrounding explanation. I changed it to a generic `seed_node_url` example so the bracket rule is shown without implying the wrong product-specific config shape.
- The Cassandra comment said the seeds config is "just IP, no port". Current Cassandra docs are version-sensitive here, so I removed that claim and kept the example to the safe address-only form.
- The ZooKeeper example showed an unbracketed IPv6 literal in a `host:port:port` field and said brackets were optional. ZooKeeper's IPv6 host/port parsing utilities document bracketed IPv6 literal handling, so I changed the example to `[2001:db8::1]:2888:3888`.
- The Kafka example incorrectly pointed `bootstrap.servers` at ZooKeeper-style hostnames. Kafka documents `bootstrap.servers` as Kafka broker host/port pairs, so I changed the example to broker hostnames.
- The multicast section labeled `FF05::1` as the site-local all-nodes address. RFC 4291 only defines `FF01::1` and `FF02::1` as all-nodes addresses, so I replaced the incorrect line with the standard mDNS IPv6 multicast address `FF02::FB`.
- The IPv6 multicast Python example joined a link-local multicast group using interface index `0` as a generic default. RFC 4007 and Python's socket docs make scoped IPv6 handling interface-sensitive, so I updated the example to resolve and use an explicit interface index via `socket.if_nametoindex()`.
- The SRV lookup code queried `__service.__tcp...`, which is not valid SRV naming. RFC 2782 requires `_service._proto`, so I corrected the query name to `_{service_name}._tcp.example.com.`.
- The DNS lookup snippet used `socket.getaddrinfo()` without a socket type, which can return multiple protocol variants for the same endpoint. I constrained it to `socket.SOCK_STREAM` so the example resolves TCP bootstrap endpoints more directly.
- The Consul DNS example used `dig @[::1]`, but BIND `dig` expects the server argument as an IPv6 address in colon-delimited notation, not bracketed URI form. I changed it to `dig @::1 -p 8600 ...`.
- The etcd examples placed `--prefix` after the key path. I updated them to the documented `etcdctl get --prefix <key>` and `etcdctl watch --prefix <key>` forms from the official etcd guide.

## Review Notes
- The multicast example now uses `INTERFACE = 'eth0'` as a placeholder. Readers still need to replace that with a real interface name on their system.
- The post mixes static seed discussion with a dynamic SRV-based Python example. That is technically acceptable, but the section could be made more conceptually consistent in a future editorial pass.
- Cassandra's documentation currently shows some version-specific differences in how seed values are described. The post now avoids making a version-specific claim there.
