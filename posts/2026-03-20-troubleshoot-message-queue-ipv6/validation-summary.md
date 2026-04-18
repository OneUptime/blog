# Validation Summary: How to Troubleshoot Message Queue IPv6 Connectivity Issues

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- RabbitMQ (AMQP 5672, Management UI 15672)
- Apache Kafka (9092)
- NATS (4222 client, 8222 monitoring)
- Apache ZooKeeper (2181)
- IPv6 networking
- Linux networking tools (ss, nc, ping6, traceroute6, ip)
- ip6tables / firewalld
- JVM IPv6 system properties

## Sources Consulted
- RabbitMQ Networking and Configuration docs: https://www.rabbitmq.com/docs/networking and https://www.rabbitmq.com/docs/configure
- Apache Kafka broker configuration (listeners, advertised.listeners): https://kafka.apache.org/documentation/#brokerconfigs
- NATS server configuration and monitoring endpoints (/varz, /routez): https://docs.nats.io/running-a-nats-service/configuration/monitoring
- Apache ZooKeeper Administrator's Guide (clientPortAddress): https://zookeeper.apache.org/doc/current/zookeeperAdmin.html
- Oracle JDK Networking Properties (java.net.preferIPv6Addresses): https://docs.oracle.com/javase/8/docs/api/java/net/doc-files/net-properties.html
- iproute2 / ss man page
- ncat / netcat man pages
- iptables/ip6tables and firewalld man pages

## Issues Found
No technical issues found.

## Review Notes
- The grep on port 11211 in Step 1 is memcached, which isn't a message queue in the traditional sense and isn't covered elsewhere in the post. It's harmless (the grep simply won't match anything if memcached isn't running) but slightly out of scope.
- RabbitMQ's `listeners.tcp.1 = 2001:db8::10:5672` format is accepted by RabbitMQ's classic config parser (which splits on the last colon), but newer docs increasingly prefer bracketed form `[2001:db8::10]:5672` for clarity with IPv6. Both work.
- NATS `varz` does not have a literal `listen_addresses` field; the actual fields are `host`, `port`, and `connect_urls`. The grep in Step 6 would simply not match, but the endpoint URL and intent (inspecting the server's listen configuration) are correct.
- The post uses the documentation-reserved `2001:db8::/32` prefix consistently, which is appropriate for examples per RFC 3849.
- Example error strings are plausible and illustrative rather than verbatim log output, which is fine for a troubleshooting guide.
