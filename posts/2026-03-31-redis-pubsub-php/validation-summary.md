# Validation Summary: How to Use Redis Pub/Sub in PHP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Pub/Sub
- PHP
- Predis (PHP Redis client library)
- phpredis (PHP Redis extension)

## Sources Consulted
- Predis source code on GitHub (predis/predis) — `pubSubLoop()` method signature, `PubSub\Consumer` class, and message object structure
- phpredis official documentation on GitHub (phpredis/phpredis) — `subscribe()`, `psubscribe()`, `publish()` callback signatures and behavior
- Redis PUBLISH/SUBSCRIBE command documentation

## Issues Found
1. **Incorrect Predis API in "Important Limitations" section**: The code used `$subscriber->subscribe(['events'], function ($loop, $message) {...})` on a Predis `Client` object. Predis's `Client` class does not have a `subscribe()` method that accepts a callback — that is the phpredis API. The correct Predis method is `pubSubLoop()`. Fixed to use `$subscriber->pubSubLoop(['subscribe' => 'events'], function ($loop, $message) {...})` with a `$message->kind === 'message'` check, consistent with the rest of the Predis examples in the post.

## Review Notes
- The phpredis in-callback `unsubscribe()` support was added in phpredis 6.0. Earlier versions required closing the connection as a workaround. The post does not mention version requirements, which is acceptable for a current tutorial but worth noting.
- For Predis pattern messages (`pmessage` kind), the message object also includes a `pattern` property in addition to `kind`, `channel`, and `payload`. The post's Predis psubscribe example does not reference `$message->pattern`, which is fine since it is not needed for the demonstrated use case.
