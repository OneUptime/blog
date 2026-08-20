# Feast TTL: Historical Join Windows vs Online Expiry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Feast, TTL, Point-in-Time Join, Online Store, Redis, Feature Freshness

Description: Separate Feast's historical lookup horizon from online stale-read enforcement and physical backend key expiration.

---

TTL appears in several parts of a Feast deployment, but those settings do not all mean "delete this value after N seconds." The FeatureView TTL primarily defines a historical point-in-time lookup horizon. Serving-time freshness checks and backend key expiration are separate concerns.

Confusing these mechanisms causes two opposite failures: training joins unexpectedly return null, or online serving keeps returning values that an operator assumed had expired.

## FeatureView TTL Limits Historical Lookback

For historical retrieval, Feast starts at each entity DataFrame timestamp and scans backward for the newest matching feature row. The FeatureView `ttl` limits how far backward the join may look.

```python
from datetime import timedelta
from feast import FeatureView, Field
from feast.types import Float32

driver_stats = FeatureView(
    name="driver_stats",
    entities=[driver],
    ttl=timedelta(hours=6),
    schema=[Field(name="conversion_rate", dtype=Float32)],
    source=driver_stats_source,
)
```

For an entity row at 12:00, a feature event at 10:00 is eligible. A feature event at 04:00 is outside the six-hour horizon. The TTL is evaluated relative to 12:00, even if the retrieval job runs months later.

This is a modeling rule. It answers, "How old may this feature have been at prediction time?" It does not describe how long a registry object lives or how frequently materialization runs.

## Online Stores Keep Only the Latest Value

Feast's online-store model retains the latest feature values for each entity key, not a history of values. The stored row also has an event timestamp, but what happens when it becomes old depends on the online-store implementation.

The Feast online-store functionality matrix explicitly tracks two different capabilities:

- support for TTL at retrieval;
- support for deleting expired data.

These are not universally supported, and the labels do not guarantee two independent controls. Current Feast documentation lists both capabilities for Redis, while the current DynamoDB and PostgreSQL Feast backends list neither. The Redis-specific documentation clarifies that `FeatureView.ttl` does not filter online reads; `key_ttl_seconds` controls online expiry. For normal Redis reads, the same physical key expiry accounts for both a later miss and deletion, rather than a separate stored-event-time stale-read check.

That is a provider contract, not a claim that those databases lack native expiration features. Native database settings are not automatically wired to Feast's FeatureView semantics.

Therefore, never assume `ttl=timedelta(hours=6)` guarantees that every online backend will hide or delete a seven-hour-old value. Check the provider-specific documentation and implementation for the exact Feast version and online-store plugin you deploy, then test it.

## Redis Key TTL Is a Third Clock

The Feast Redis online store supports `key_ttl_seconds`:

```yaml
online_store:
  type: redis
  connection_string: redis.internal:6379
  key_ttl_seconds: 86400
```

Feast's Redis documentation notes that this TTL is applied at the entity level. Feature values associated with that entity are removed together, and an accepted write to any co-located FeatureView resets the expiry for the whole entity hash. It is a physical retention policy, so it can delete multiple FeatureView values that share the entity key even if they have different freshness expectations.

The relevant policies now look like this:

| Setting | Primary purpose | Relative to | Effect |
| --- | --- | --- | --- |
| FeatureView `ttl` | historical validity window | entity-row lookup time | excludes old rows from point-in-time joins |
| serving-layer maximum age | stale-read enforcement | serving time and returned event time | application rejects or falls back from stale values |
| Redis `key_ttl_seconds` | physical key retention | most recent accepted write to the shared entity hash | deletes all co-located FeatureView values for the entity |

Do not set these equal by reflex. A feature may need 90 days of offline validity for backtesting but only two hours of acceptable online freshness. Conversely, physical retention may need extra headroom to survive a delayed pipeline while alerts fire.

## Freshness Is Not Materialization Frequency

A six-hour FeatureView TTL does not refresh data every six hours. Materialization or push ingestion must still write newer rows. If the producer stops, `FeatureView.ttl` does not make normal Redis online reads missing. A Redis key TTL can remove the entity hash after no accepted writes reset it, and a serving-layer age check can reject a stale value sooner, but neither repairs freshness.

Use separate service-level objectives:

```text
producer lag target:          under 10 minutes
materialization completion:  under 20 minutes
maximum online value age:    under 30 minutes
historical FeatureView TTL:  6 hours
physical Redis key retention: 24 hours
```

Monitor the event timestamp of served or sampled values, not only whether the key exists. A present value can be stale, and a missing value can be an intentional consequence of freshness enforcement.

The current Python feature server can expose Prometheus metrics including `feast_feature_freshness_seconds`, labeled by `feature_view` and `project`. This gauge measures seconds since the most recent materialization end time recorded by Feast; it does not inspect the event timestamp of each served value. Combine it with scheduler success, source-watermark lag, and a known-entity canary.

## Test the Actual Provider Contract

Before rollout, write features with controlled timestamps and test three cases:

1. an event timestamp comfortably inside FeatureView TTL;
2. an event timestamp just outside FeatureView TTL;
3. an online key just before and after its physical TTL, measured from the last accepted write.

Run both historical and online retrieval for the first two cases. Test the third separately with a short `key_ttl_seconds` or by inspecting Redis's key TTL; an old event timestamp does not make a newly written Redis key old. Record whether the provider returns a value, a missing status, or a null. Repeat after upgrading Feast because capability matrices and implementations can change.

Also test co-located data. With Redis entity-level expiration, an accepted write to any FeatureView resets the TTL of the shared entity hash and can keep stale fields from another FeatureView alive. Base operational assumptions on observed behavior for your schema and plugin version.

## Choose Policies Deliberately

Use FeatureView TTL to express the oldest feature value that remains meaningful for a historical observation. Use freshness monitoring to detect ingestion lag. Use an explicit serving-layer event-time check, or documented provider read-time enforcement, to prevent stale predictions. Use physical key expiration to control retention and cleanup.

If a backend lacks a required Feast TTL capability, enforce freshness in a serving layer by checking returned event timestamps and rejecting values beyond policy; use provider statuses only where the plugin documents a stale status. Alternatively, select a backend whose Feast integration supports the required behavior. Do not quietly rely on undocumented native settings.

## Official Documentation

- [Feast point-in-time joins](https://docs.feast.dev/getting-started/concepts/point-in-time-joins)
- [Feast online store](https://docs.feast.dev/getting-started/components/online-store)
- [Feast online-store functionality overview](https://docs.feast.dev/reference/online-stores/overview)
- [Feast Redis online store](https://docs.feast.dev/reference/online-stores/redis)
- [Feast Python feature server metrics](https://docs.feast.dev/reference/feature-servers/python-feature-server)

## Conclusion

FeatureView TTL, serving-time freshness enforcement, and backend key expiration solve different problems. Model the historical horizon with FeatureView TTL, verify the provider's online capabilities, configure physical retention separately, and alert on actual event-time freshness.
