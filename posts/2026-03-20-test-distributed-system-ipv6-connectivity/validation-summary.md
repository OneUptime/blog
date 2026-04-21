# Validation Summary: How to Test Distributed System IPv6 Connectivity

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv6 networking
- Bash scripting
- ping/iputils
- netcat
- Apache Kafka command-line tools
- PostgreSQL psql
- MySQL client
- MongoDB Shell
- Redis CLI
- Elasticsearch Cluster Health API
- OpenSSL
- Kubernetes kubectl
- curl
- iperf3

## Sources Consulted
- iputils ping man page: https://manpages.debian.org/testing/iputils-ping/ping6.8.en.html
- OpenBSD nc manual: https://man.openbsd.org/nc.1
- GNU Bash Reference Manual: https://www.gnu.org/software/bash/manual/bash.html
- Apache Kafka 4.2 quickstart and producer configuration: https://kafka.apache.org/quickstart/ and https://kafka.apache.org/42/configuration/producer-configs/
- Apache Kafka ConsoleProducer source: https://github.com/apache/kafka/blob/trunk/tools/src/main/java/org/apache/kafka/tools/ConsoleProducer.java
- Apache Kafka address parsing source: https://github.com/apache/kafka/blob/trunk/clients/src/main/java/org/apache/kafka/common/utils/Utils.java
- PostgreSQL psql documentation: https://www.postgresql.org/docs/current/app-psql.html
- MySQL client options documentation: https://dev.mysql.com/doc/refman/8.4/en/mysql-command-options.html
- MongoDB mongosh options and MongoDB 6.0 compatibility notes: https://www.mongodb.com/docs/mongodb-shell/reference/options/ and https://www.mongodb.com/docs/rapid/release-notes/6.0-compatibility/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Elasticsearch Cluster Health API documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/cluster-health.html
- OpenSSL s_client and x509 documentation: https://docs.openssl.org/master/man1/openssl-s_client/ and https://docs.openssl.org/master/man1/openssl-x509/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- curl man page and URL syntax documentation: https://curl.se/docs/manpage.html and https://curl.se/docs/url-syntax.html
- RFC 3986 URI generic syntax for IPv6 literals in brackets: https://datatracker.ietf.org/doc/html/rfc3986

## Issues Found
- The layer-by-layer example said it tested from application to network while the commands actually moved from network to application. Changed the comment and labels to use ordered steps.
- The examples used `ping6`; changed this to the current `ping -6` form documented by iputils.
- The TCP examples used `nc` without zero-I/O scan mode. Added `-z` to make them explicit TCP connect checks.
- The Bash script stored values as `IPv6:port` and split on `:`, which breaks for IPv6 literals. Changed the service values to separate host and port with whitespace and parse them with `read`.
- The Kafka admin check piped output through `grep -v "Error"`, which could fail when a healthy cluster has no topics and could pass on unrelated non-error output. Replaced it with an exit-status check.
- The Kafka producer example read from `/dev/null`, so it might not send a record. Changed it to send a small test message synchronously with `--max-block-ms 5000`.
- The Kafka bootstrap server IPv6 literal was unquoted and bracketed. Quoted it to avoid shell globbing and kept brackets, which Kafka's address parser supports for IPv6.
- The MongoDB example used the removed legacy `mongo` shell. Replaced it with `mongosh` and a bracketed IPv6 MongoDB URI.
- The Elasticsearch curl URL contained brackets but was unquoted. Quoted it to avoid shell globbing issues.
- The TLS section claimed certificate verification, but the command only checks expiration with `openssl x509 -checkend`. Renamed the section and output text to describe expiration checking accurately, used the documented `-checkend` exit status, and stopped sending the IPv6 literal as SNI unless a server name is supplied.
- The Kubernetes test used HTTP curl requests against Kafka and Redis ports, which are not HTTP services. Changed those probes to curl's `telnet://` scheme for TCP connectivity checks over IPv6.
- The Redis latency example combined `--latency` and `--latency-history`. Changed it to `--latency-history`, which Redis documents as the history mode.

## Review Notes
The examples use `2001:db8::/32`, which is the documentation IPv6 prefix and should be replaced with real service addresses in an actual environment. The Kubernetes curl checks now validate TCP reachability only; application-level Kafka and Redis validation still requires protocol-specific clients or commands.
