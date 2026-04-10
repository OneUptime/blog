# Validation Summary: How to Use PUBSUB CHANNELS in Redis to List Active Channels

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis
- Redis Pub/Sub (PUBSUB CHANNELS, PUBSUB NUMSUB, PUBSUB NUMPAT)
- Bash scripting (redis-cli usage)

## Sources Consulted
- Official Redis documentation for PUBSUB CHANNELS: https://redis.io/docs/latest/commands/pubsub-channels/
- Official Redis documentation for PUBSUB NUMSUB: https://redis.io/docs/latest/commands/pubsub-numsub/
- Official Redis documentation for PUBSUB NUMPAT: https://redis.io/docs/latest/commands/pubsub-numpat/

## Issues Found

### 1. Misleading performance advice about pattern usage
**What was wrong:** The "Important Notes" section stated: "PUBSUB CHANNELS scans the entire subscription dictionary - on busy systems with thousands of channels, prefer using a pattern to narrow results." This implies using a pattern improves scan performance. Per the official docs, the time complexity is O(N) where N is the number of active channels regardless of whether a pattern is used — the pattern only filters the output, not the scan.
**What was changed:** Reworded to accurately state that the command is O(N) and that using a pattern filters output but does not reduce scan cost.

### 2. Imprecise wording about PSUBSCRIBE and channel visibility
**What was wrong:** The note "Channels created by PSUBSCRIBE pattern subscriptions do NOT appear in PUBSUB CHANNELS" was slightly misleading. It's not that channels "created by" PSUBSCRIBE are excluded — it's that pattern subscribers are not counted toward making a channel active. A channel with both direct subscribers and pattern subscribers will still appear.
**What was changed:** Reworded to two clearer bullet points: (1) pattern subscribers are not counted, and (2) if a channel's only subscribers are pattern subscribers, it will not appear.

### 3. Misleading PUBSUB NUMPAT description
**What was wrong:** The summary stated "use PUBSUB NUMPAT for those" (referring to pattern subscriptions), which could imply NUMPAT returns a list of pattern names (analogous to how CHANNELS returns channel names). In reality, NUMPAT returns only an integer count of active pattern subscriptions.
**What was changed:** Clarified to "use PUBSUB NUMPAT to get the count of active pattern subscriptions."

## Review Notes
- The blog's claim that the pattern parameter defaults to `*` is a reasonable simplification. The official docs say "all channels are listed" when no pattern is given, which is functionally equivalent, though the docs never explicitly state the default is `*`.
- The bash monitoring workflow example is functional and correct for basic use, though in production scenarios a race condition exists between checking and publishing.
- The PUBSUB CHANNELS vs PUBSUB NUMSUB comparison table is accurate.
