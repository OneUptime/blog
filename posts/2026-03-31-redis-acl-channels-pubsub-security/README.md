# How to Use Redis ACL Channels for Pub/Sub Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ACL, Pub/Sub, Security, Channel

Description: Learn how to use Redis ACL channel permissions to control which pub/sub channels each user can publish to or subscribe from, securing your messaging system.

---

Redis ACL includes channel permissions for pub/sub, introduced in Redis 6.2. Without channel restrictions, any authenticated user can subscribe to any channel and intercept messages. Channel ACL rules let you enforce namespace isolation in your pub/sub system.

## Channel Permission Syntax

Channel rules use the `&` prefix in `ACL SETUSER`:

```text
&pattern         Allow subscribe/publish to matching channels
&*               Allow all channels (default in Redis 6.2; Redis 7.0+ defaults to resetchannels)
resetchannels    Deny all channels
```

## Restrict a User to Specific Channels

Create a user that can only access channels in the `notifications:` namespace:

```bash
ACL SETUSER notif-consumer on >pass1 ~* resetchannels &notifications:* -@all +SUBSCRIBE +PSUBSCRIBE +UNSUBSCRIBE
```

Test the restriction:

```bash
# This works
redis-cli -u redis://notif-consumer:pass1@127.0.0.1:6379 SUBSCRIBE notifications:user-alerts

# This fails
redis-cli -u redis://notif-consumer:pass1@127.0.0.1:6379 SUBSCRIBE payments:events
# (error) NOPERM No permissions to access a channel
```

## Separate Publisher and Subscriber Permissions

Create distinct users for publishers and subscribers:

```bash
# Publisher: can only publish to order events
ACL SETUSER order-publisher on >pubpass &orders:* resetchannels \
  -@all +PUBLISH

# Subscriber: can only subscribe to order events
ACL SETUSER order-subscriber on >subpass &orders:* resetchannels \
  -@all +SUBSCRIBE +UNSUBSCRIBE +PSUBSCRIBE +PUNSUBSCRIBE
```

## Pattern-Based Channel Subscriptions

Control access to pattern subscriptions (`PSUBSCRIBE`):

```bash
# Allow pattern subscribe to all metrics channels
ACL SETUSER metrics-reader on >metricspass &metrics:* resetchannels \
  -@all +PSUBSCRIBE +PUNSUBSCRIBE
```

```bash
redis-cli -u redis://metrics-reader:metricspass@127.0.0.1:6379 \
  PSUBSCRIBE "metrics:*"
# Subscribed to all metrics channels
```

## Sharded Pub/Sub Channel Permissions (Redis 7.0+)

For sharded pub/sub with `SSUBSCRIBE`, the same `&` channel rules apply:

```bash
ACL SETUSER shard-consumer on >pass &events:shard1:* resetchannels \
  -@all +SSUBSCRIBE +SUNSUBSCRIBE
```

## Full Isolation: Deny All Channels by Default

For applications that do not use pub/sub at all:

```bash
ACL SETUSER db-only-app on >pass ~app:* resetchannels -@all +@read +@write
```

`resetchannels` removes all channel permissions, preventing any pub/sub activity.

## Verify Channel Permissions

```bash
ACL GETUSER order-publisher
```

```text
...
9) "channels"
10) "orders:*"
...
```

## Summary

Redis ACL channel rules use `&pattern` to allow access to matching pub/sub channels and `resetchannels` to deny all channels. Separate publishers and subscribers into distinct users, and scope channel patterns to match your application's namespace. Always add `resetchannels` explicitly to applications that should not use pub/sub at all.
