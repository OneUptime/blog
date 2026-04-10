# How to Use PUBSUB CHANNELS in Redis to List Active Channels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, PubSub, Channel, Monitoring

Description: Learn how to use PUBSUB CHANNELS to list all active Redis Pub/Sub channels that currently have at least one subscriber.

---

`PUBSUB CHANNELS` returns a list of channels that are currently active - meaning they have at least one subscriber. This is a key operational command for monitoring which channels are in use and diagnosing Pub/Sub connectivity.

## How PUBSUB CHANNELS Works

Redis tracks all active Pub/Sub channel subscriptions in a server-side dictionary. `PUBSUB CHANNELS` scans this dictionary and returns channel names matching the optional glob pattern. Channels with zero subscribers are not included.

## Syntax

```redis
PUBSUB CHANNELS [pattern]
```

- `pattern` - optional glob pattern to filter channel names (default: `*`, returns all)

## Examples

### List All Active Channels

```redis
PUBSUB CHANNELS
```

Output:

```text
1) "orders:us"
2) "orders:eu"
3) "notifications"
4) "dashboard:metrics"
```

### List Channels Matching a Pattern

```redis
PUBSUB CHANNELS orders:*
```

Output:

```text
1) "orders:us"
2) "orders:eu"
```

### Check if a Specific Channel is Active

```redis
PUBSUB CHANNELS notifications
```

Returns the channel name if active, or an empty array if no one is subscribed.

### Find All Channels for a Namespace

```redis
PUBSUB CHANNELS user:*
```

Lists all per-user channels that currently have subscribers.

### Monitoring Workflow

Check active channels before publishing to avoid silent drops:

```bash
active=$(redis-cli PUBSUB CHANNELS notifications)
if [ -z "$active" ]; then
  echo "No subscribers - message will be dropped"
else
  redis-cli PUBLISH notifications "Hello everyone"
fi
```

## PUBSUB CHANNELS vs PUBSUB NUMSUB

| Command | Returns |
|---|---|
| `PUBSUB CHANNELS` | List of active channel names |
| `PUBSUB NUMSUB` | Channel names with subscriber counts |

Use `PUBSUB CHANNELS` to discover what is active, then `PUBSUB NUMSUB` to see how many subscribers each channel has.

## Important Notes

- Pattern subscribers (via `PSUBSCRIBE`) are not counted - a channel only appears if it has at least one direct subscriber (via `SUBSCRIBE`)
- If a channel's only subscribers are pattern subscribers, it will NOT appear in the output
- `PUBSUB CHANNELS` is O(N) where N is the number of active channels - using a pattern filters the output but does not reduce the scan cost

## Use Cases

- **Operational monitoring** - verify expected subscriber channels are active before deployments
- **Debugging** - see which channels are live in a development or staging environment
- **Health checks** - confirm subscriber services have connected and subscribed
- **Channel discovery** - dynamically discover what topics are currently being consumed

## Summary

`PUBSUB CHANNELS` is the primary discovery command for Redis Pub/Sub channels. Use it with a pattern to filter results in systems with many channels, and combine it with `PUBSUB NUMSUB` to get subscriber counts for the channels you care about. It does not show pattern subscriptions - use `PUBSUB NUMPAT` to get the count of active pattern subscriptions.
