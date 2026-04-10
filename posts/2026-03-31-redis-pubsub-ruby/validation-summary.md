# Validation Summary: How to Use Redis Pub/Sub in Ruby

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Pub/Sub commands: PUBLISH, SUBSCRIBE, PSUBSCRIBE, PUBSUB)
- Ruby
- redis-rb gem (v5.x compatible)
- JSON standard library

## Sources Consulted
- redis-rb GitHub repository — https://github.com/redis/redis-rb
- redis-rb subscribe module source — https://github.com/redis/redis-rb/blob/master/lib/redis/subscribe.rb
- redis-rb pubsub examples — https://github.com/redis/redis-rb/blob/master/examples/pubsub.rb
- Redis PUBLISH command documentation — https://redis.io/docs/latest/commands/publish/
- Redis SUBSCRIBE command documentation — https://redis.io/docs/latest/commands/subscribe/
- Redis PSUBSCRIBE command documentation — https://redis.io/docs/latest/commands/psubscribe/
- Redis PUBSUB NUMSUB documentation — https://redis.io/docs/latest/commands/pubsub-numsub/
- Redis PUBSUB NUMPAT documentation — https://redis.io/docs/latest/commands/pubsub-numpat/
- RubyDoc.info redis-rb Pub/Sub commands — https://www.rubydoc.info/github/redis/redis-rb/Redis/Commands/Pubsub

## Issues Found
1. **Missing `require 'json'` in publisher.rb example**: The publisher code block used `JSON.generate` to serialize the message but did not `require 'json'`. Without this require, Ruby raises `NameError: uninitialized constant JSON`. Added `require 'json'` after `require 'redis'` in the publisher example. The subscriber example already had the correct require.

## Review Notes
- All subscribe/psubscribe callback signatures (`on.subscribe`, `on.message`, `on.unsubscribe`, `on.pmessage`) are correct and match the redis-rb API.
- The `redis.publish` return value (number of subscribers who received the message) is correctly documented.
- The constraint about subscribe-mode connections not being able to issue regular commands is accurate and important.
- The `redis.unsubscribe` call from inside the `on.message` callback is the correct and supported pattern.
- The `pubsub(:numsub)` and `pubsub(:numpat)` usage is correct.
- Threading advice for Rails/Rack apps is sound — using a separate `Redis.new` connection in the thread is the right approach.
