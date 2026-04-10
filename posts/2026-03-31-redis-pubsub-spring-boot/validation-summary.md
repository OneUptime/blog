# Validation Summary: How to Use Redis Pub/Sub with Spring Boot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Pub/Sub
- Spring Boot
- Spring Data Redis (`spring-boot-starter-data-redis`)
- Java (text blocks, Java 15+)
- Redis CLI (`PUBSUB` subcommands)

## Sources Consulted
- Spring Data Redis Javadoc for `MessageListenerAdapter` — confirms delegate method signature `handleMessage(String message, String channel)` is supported (channel passed as second argument)
- Spring Data Redis Javadoc for `RedisMessageListenerContainer` — confirms `setConnectionFactory`, `addMessageListener`, and `removeMessageListener` APIs
- Spring Data Redis Javadoc for `PatternTopic` and `ChannelTopic` — confirms `PatternTopic` maps to `PSUBSCRIBE` for glob-style patterns
- Spring Data Redis Javadoc for `StringRedisTemplate` — confirms `convertAndSend(String destination, Object message)` publishes to Pub/Sub channels
- Redis official documentation for `PUBSUB CHANNELS`, `PUBSUB NUMSUB`, and `PUBSUB NUMPAT` commands — https://redis.io/docs/latest/commands/pubsub-channels/

## Issues Found
1. **OrderController missing constructor** — The `publisher` field was declared `final` but no constructor was provided, which would cause a compilation error. Added the missing constructor `public OrderController(OrderPublisher publisher)` to match the pattern used in `OrderPublisher`.

2. **PUBSUB commands misleading for pattern subscriptions** — The "Inspect Active Subscriptions" section only showed `PUBSUB CHANNELS` and `PUBSUB NUMSUB`, which exclusively count exact (`SUBSCRIBE`) subscribers. Since the tutorial uses `PatternTopic` (which maps to `PSUBSCRIBE`), these commands would return empty/zero results. Added `PUBSUB NUMPAT` command and a clarifying note explaining the distinction.

## Review Notes
- The JSON message in `OrderPublisher` is constructed via string formatting rather than a JSON library. This works but is susceptible to injection if `orderId` or `status` contain quotes or special characters. Not a correctness error for the tutorial's scope, but production code should use a JSON serializer.
- The `Unsubscribe Dynamically` section shows a code snippet using `@Autowired` field injection rather than constructor injection, which is inconsistent with the rest of the post. This is a style preference, not a technical error.
- `RedisMessageListenerContainer` was deprecated in Spring Data Redis 3.4.x in favor of `RedisMessageListenerRegistration`-based approaches. The API still works but may be removed in a future major version. Worth monitoring for future updates.
