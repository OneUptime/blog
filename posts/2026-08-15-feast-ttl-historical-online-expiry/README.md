# Feast TTL: Historical Join Windows vs Online Expiry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Feast, TTL, Point-in-Time Join, Online Store, Redis, Feature Freshness

Description: Separate Feast's historical lookup horizon from online stale-read enforcement and physical backend key expiration.

---

TTL appears in several parts of a Feast deployment, but those settings do not all mean "delete this value after N seconds." The FeatureView TTL primarily defines a historical point-in-time lookup horizon. Online-store retrieval checks and backend key expiration are separate capabilities.

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

These are not universally supported. Current Feast documentation lists both capabilities for Redis, while the current DynamoDB and PostgreSQL Feast backends list neither. That is a provider contract, not a claim that those databases lack native expiration features. Native database settings are not automatically wired to Feast's FeatureView semantics.

Therefore, never assume `ttl=timedelta(hours=6)` guarantees that every online backend will hide or delete a seven-hour-old value. Check the matrix for the exact Feast version and online-store plugin you deploy, then test it.

## Redis Key TTL Is a Third Clock

The Feast Redis online store supports `key_ttl_seconds`:

```yaml
online_store:
  type: redis
  connection_string: redis.internal:6379
  key_ttl_seconds: 86400
```

Feast's Redis documentation notes that this TTL is applied at the entity level. Feature values associated with that entity are removed together. It is a physical retention policy, so it can delete multiple FeatureView values that share the entity key even if they have different freshness expectations.

The three clocks now look like this:

| Setting | Primary purpose | Relative to | Effect |
| --- | --- | --- | --- |
| FeatureView `ttl` | historical validity window | entity-row lookup time | excludes old rows from point-in-time joins |
| online retrieval TTL support | stale-read enforcement | serving time and stored event time | provider may return no value |
| Redis `key_ttl_seconds` | physical key retention | backend write and expiry behavior | deletes the entity-level key |

Do not set these equal by reflex. A feature may need 90 days of offline validity for backtesting but only two hours of acceptable online freshness. Conversely, physical retention may need extra headroom to survive a delayed pipeline while alerts fire.

## Freshness Is Not Materialization Frequency

A six-hour FeatureView TTL does not refresh data every six hours. Materialization or push ingestion must still write newer rows. If the producer stops, TTL may eventually turn stale reads into missing values on stores that enforce it, but it does not repair freshness.

Use separate service-level objectives:

```text
producer lag target:          under 10 minutes
materialization completion:  under 20 minutes
maximum online value age:    under 30 minutes
historical FeatureView TTL:  6 hours
physical Redis key retention: 24 hours
```

Monitor the event timestamp of served or sampled values, not only whether the key exists. A present value can be stale, and a missing value can be an intentional consequence of freshness enforcement.

The current Python feature server can expose Prometheus metrics including `feast_feature_freshness_seconds`, labeled by FeatureView and project. Combine that with scheduler success, source-watermark lag, and a known-entity canary.

## Test the Actual Provider Contract

Before rollout, write a feature with a controlled timestamp and test three ages:

1. comfortably inside FeatureView TTL;
2. just outside FeatureView TTL;
3. beyond any physical key TTL.

Run both historical and online retrieval. Record whether the provider returns a value, a missing status, or a null. Repeat after upgrading Feast because capability matrices and implementations can change.

Also test co-located data. With Redis entity-level expiration, refreshing one group of values may affect the lifetime of a shared entity key differently than a design that stores each FeatureView independently. Base operational assumptions on observed behavior for your schema and plugin version.

## Choose Policies Deliberately

Use FeatureView TTL to express the oldest feature value that remains meaningful for a historical observation. Use freshness monitoring to detect ingestion lag. Use online retrieval enforcement, where supported, to prevent stale predictions. Use physical key expiration to control retention and cleanup.

If a backend lacks a required Feast TTL capability, enforce freshness in a serving layer by returning and checking feature statuses or timestamps, or select a backend whose Feast integration supports the behavior. Do not quietly rely on undocumented native settings.

## Official Documentation

- [Feast point-in-time joins](https://docs.feast.dev/getting-started/concepts/point-in-time-joins)
- [Feast online store](https://docs.feast.dev/getting-started/components/online-store)
- [Feast online-store functionality overview](https://docs.feast.dev/reference/online-stores/overview)
- [Feast Redis online store](https://docs.feast.dev/reference/online-stores/redis)
- [Feast Python feature server metrics](https://docs.feast.dev/reference/feature-servers/python-feature-server)

## Conclusion

FeatureView TTL, online stale-read behavior, and backend key expiration solve different problems. Model the historical horizon with FeatureView TTL, verify the provider's online capabilities, configure physical retention separately, and alert on actual event-time freshness.
