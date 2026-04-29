# Validation Summary: How to Configure ksqlDB to Listen on a Specific IPv4 Address

## Status
validated

## Post Type
Guide

## Technologies Covered
- ksqlDB
- Apache Kafka
- ksqlDB CLI
- ksqlDB REST API
- HTTP Basic authentication
- TLS/SSL
- Linux firewall configuration (`ufw`, `iptables`)

## Sources Consulted
- Confluent: Configure ksqlDB for Confluent Platform — https://docs.confluent.io/platform/current/ksqldb/operate-and-deploy/installation/server-config.html
- Confluent: Server Configuration in ksqlDB for Confluent Platform — https://docs.confluent.io/platform/current/ksqldb/reference/server-configuration.html
- Confluent: Configure Security in ksqlDB for Confluent Platform — https://docs.confluent.io/platform/current/ksqldb/operate-and-deploy/installation/security.html
- Confluent: Configure the CLI in ksqlDB for Confluent Platform — https://docs.confluent.io/platform/current/ksqldb/operate-and-deploy/installation/cli-config.html
- Confluent: HTTP API Reference for ksqlDB for Confluent Platform — https://docs.confluent.io/platform/current/ksqldb/developer-guide/ksqldb-rest-api/rest-api-reference.html
- Confluent: HTTP Streaming API in ksqlDB for Confluent Platform — https://docs.confluent.io/platform/current/ksqldb/developer-guide/ksqldb-rest-api/streaming-endpoint.html
- Confluent: Get the Status of a ksqlDB Server on Confluent Platform — https://docs.confluent.io/platform/current/ksqldb/developer-guide/ksqldb-rest-api/info-endpoint.html

## Issues Found
- The post described `ksql.advertised.listener` as a client-facing service URL. I corrected this to match the docs: it is used for inter-node communication and is only needed when the bound listener is not routable from other ksqlDB nodes.
- The Basic authentication example used undocumented/incorrect properties and an invalid plugin/class combination for the scenario described. I replaced it with the documented `authentication.method`, `authentication.realm`, and `authentication.roles` settings, plus the required JAAS file and password file example.
- The SSL example mixed listener TLS and Kafka-client TLS in a way that could be misleading. I updated the Kafka SSL example to use `ksql.streams.ssl.truststore.*`, which is the documented approach when you want separate TLS settings for Kafka and the external listener.
- The runtime example used package/service assumptions that were not aligned with the documented ksqlDB startup flow needed for the JAAS-based auth example. I replaced it with `ksql-server-start` and the required `KSQL_OPTS` setting for the JAAS file.
- The REST examples were missing important request details after authentication was enabled. I updated them to include authentication and appropriate `Accept`/`Content-Type` headers, and made the `/query-stream` example explicitly use HTTP/2.
- The conclusion said `bootstrap.servers` should list all Kafka brokers. I corrected this to “one or more reachable brokers,” which matches Kafka client bootstrap semantics.

## Review Notes
- The post does not pin a specific ksqlDB or Confluent Platform version; validation was performed against the current Confluent documentation available on 2026-04-29.
- The password-file example uses cleartext credentials for brevity. Confluent’s documentation also shows hashed password entries, which are preferable for production use.
- The post now correctly notes that if HTTP Basic authentication is enabled, HTTPS should be used in production because Basic credentials are otherwise sent in clear text.
