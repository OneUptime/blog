# Validation Summary: How to Stream Redis Changes to Apache Kafka

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (keyspace notifications, Pub/Sub)
- Apache Kafka (topics, consumers)
- Kafka Connect (source connectors)
- jaredpetersen/kafka-connect-redis connector
- Python kafka-python / kafka-python-ng library
- Python redis-py library
- Confluent Hub CLI

## Sources Consulted
- Redis keyspace notifications documentation: https://redis.io/docs/latest/develop/use/keyspace-notifications/
- jaredpetersen/kafka-connect-redis GitHub repository: https://github.com/jaredpetersen/kafka-connect-redis
- jaredpetersen/kafka-connect-redis source connector config source code (RedisSourceConfig.java)
- Confluent Hub listing for jaredpetersen/kafka-connect-redis
- kafka-python library documentation
- redis-py library documentation

## Issues Found

1. **Connector version does not exist**: The post specified `jaredpetersen/kafka-connect-redis:0.6.0`, but version 0.6.0 was never released. The available versions range from 1.0.0 to 1.2.3. Changed to `1.2.3`.

2. **Wrong Java package in connector class name**: The post used `com.github.jaredpetersen.kafkaconnectredis.source.RedisSourceConnector`, but the actual package is `io.github.jaredpetersen`. Changed to `io.github.jaredpetersen.kafkaconnectredis.source.RedisSourceConnector`.

3. **Incorrect config property name**: The post used `redis.channels.pattern.active` but the actual property defined in the connector source code is `redis.channels.pattern.enabled`. Changed accordingly.

4. **Unused import**: The Python consumer snippet imported `json` but never used it. Removed the unused import.

5. **Misleading description of `A` flag**: The post described the `A` flag as "all commands" but it is actually an alias for `g$lshzxetd` which covers most but not all event classes (excludes key miss, new key, overwritten, and type changed events). Clarified the description.

## Review Notes
- The Python code snippets in Step 5 only handle `string` and `hash` Redis types, falling through to `None` for lists, sets, sorted sets, and streams. This is not incorrect but could be noted as a limitation for readers who need comprehensive type coverage.
- The Kafka Connect REST API commands and monitoring commands are correct.
- The overall architecture description and approach (using keyspace notifications piped through a Kafka Connect source connector) is sound and well-explained.
