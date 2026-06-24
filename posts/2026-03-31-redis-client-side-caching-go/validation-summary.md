# Validation Summary: How to Implement Client-Side Caching in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis client-side caching (CLIENT TRACKING ON REDIRECT, `__redis__:invalidate` channel)
- go-redis v9 (`github.com/redis/go-redis/v9`)
- Go `sync.Map`

## Sources Consulted
- Redis client-side caching reference — https://redis.io/docs/latest/develop/reference/client-side-caching/ (confirmed `CLIENT TRACKING on REDIRECT <connection-id>`, subscribing to `__redis__:invalidate`, that invalidation payload is an array of key names, and that FLUSHALL/FLUSHDB sends a null instead of keys)
- go-redis pkg docs / source — https://pkg.go.dev/github.com/redis/go-redis/v9 and https://raw.githubusercontent.com/redis/go-redis/master/pubsub.go (confirmed `Message` struct fields `Channel`, `Pattern`, `Payload`, `PayloadSlice []string`; confirmed that array pub/sub payloads populate `PayloadSlice` while `Payload` is left empty; confirmed `OnConnect func(ctx context.Context, cn *Conn) error`)
- go-redis invalidation-message handling (WebSearch, issue #3093 / PR #3326 / PR #3007) — https://github.com/redis/go-redis/issues/3093 (confirmed invalidated keys are delivered in `PayloadSlice`)

## Issues Found
- Invalidation message handling was reading the wrong field. The original code used `msg.Payload` (a single `string`) to detect a flush (`if msg.Payload == ""`) and to delete a key (`c.cache.Delete(msg.Payload)`). Redis invalidation messages carry an **array** of affected keys, which go-redis decodes into `msg.PayloadSlice` (`[]string`), leaving `msg.Payload` empty. As written, every invalidation would hit the `msg.Payload == ""` branch and flush the entire local cache, and `c.cache.Delete(msg.Payload)` was unreachable. Fixed the goroutine to iterate `msg.PayloadSlice`, deleting each invalidated key, and to treat an empty `PayloadSlice` as a full flush (FLUSHALL/FLUSHDB).

## Review Notes
- The two-connection model (data connection with `CLIENT TRACKING ON REDIRECT`, dedicated subscriber connection on `__redis__:invalidate`) matches the Redis reference documentation.
- The `OnConnect` callback signature used in the post (`func(ctx context.Context, cn *redis.Conn) error`) matches go-redis v9, and `cn.ClientID(ctx).Result()` is valid on `*redis.Conn`.
- Capturing the subscriber connection's client ID via `OnConnect` works because `Subscribe` establishes the connection (running `OnConnect`) before `setupTracking` reads `subConnID`. This is a slightly fragile pattern (OnConnect fires for any connection the sub client's pool creates), but for a client used solely for the single subscription it is correct; left as-is as a design choice.
- Edge case left as-is: with go-redis default RESP3 and a FLUSHALL, the null invalidation payload may surface as an empty `PayloadSlice`; the fixed `len(msg.PayloadSlice) == 0` check handles this as a full flush. A non-array/null payload type is otherwise rejected by go-redis' parser.
