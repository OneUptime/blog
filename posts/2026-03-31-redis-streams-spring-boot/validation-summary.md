# Validation Summary: How to Use Redis Streams with Spring Boot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Streams
- Spring Boot
- Spring Data Redis (`spring-boot-starter-data-redis`)
- Java (records, Map.of)
- Redis CLI (`xpending`, `xlen`)

## Sources Consulted
- Spring Data Redis StreamMessageListenerContainer API: https://docs.spring.io/spring-data/redis/docs/current/api/org/springframework/data/redis/stream/StreamMessageListenerContainer.html
- Spring Data Redis StreamOperations API: https://docs.spring.io/spring-data/redis/docs/current/api/org/springframework/data/redis/core/StreamOperations.html
- Spring Data Redis StreamListener API: https://docs.spring.io/spring-data/redis/docs/current/api/org/springframework/data/redis/stream/StreamListener.html
- Spring Data Redis Consumer API: https://docs.spring.io/spring-data/redis/docs/current/api/org/springframework/data/redis/connection/stream/Consumer.html
- Spring Data Redis ReadOffset API: https://docs.spring.io/spring-data/redis/docs/current/api/org/springframework/data/redis/connection/stream/ReadOffset.html
- Spring Data Redis Streams Reference: https://docs.spring.io/spring-data/redis/reference/redis/redis-streams.html
- Redis XPENDING command docs: https://redis.io/docs/latest/commands/xpending/
- Redis XLEN command docs: https://redis.io/docs/latest/commands/xlen/

## Issues Found
No technical issues found.

## Review Notes
- The `OrderEvent` record is defined but never used in subsequent code examples — all code works directly with `Map<String, String>`. This is not an error but readers may wonder how to map the record to/from the stream fields. A future revision could show `ObjectRecord` usage or a manual mapping step.
- The post correctly uses `container.receive()` (manual ack) rather than `receiveAutoAck()`, which is consistent with the separate "Acknowledge Messages" section.
- The `createGroup` call is wrapped in a try-catch to handle the case where the group already exists. This is the standard pattern since Redis returns a `BUSYGROUP` error if the group already exists.
- All Spring Data Redis APIs verified against current documentation: `StreamMessageListenerContainer.create()`, `StreamMessageListenerContainerOptions.builder()`, `StreamListener.onMessage()`, `Consumer.from()`, `ReadOffset.lastConsumed()`, `StreamOperations.createGroup()`, `StreamOperations.acknowledge()`, and `StreamOperations.add()` — all correct.
