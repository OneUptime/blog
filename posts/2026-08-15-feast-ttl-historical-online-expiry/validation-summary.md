# Validation Summary: Feast TTL: Historical Join Windows vs Online Expiry

## Status
validated

## Post Type
Technical guide / reference

## Technologies Covered
- Feast 0.65
- Feast FeatureViews and point-in-time historical joins
- Feast online stores
- Redis and Redis key expiration
- Python
- YAML (`feature_store.yaml`)
- Prometheus metrics from the Feast Python feature server

## Sources Consulted
- [Feast v0.65.0 release](https://github.com/feast-dev/feast/releases/tag/v0.65.0) - current released version used for the version-specific source review.
- [Feast point-in-time joins](https://docs.feast.dev/getting-started/concepts/point-in-time-joins) - historical join direction and the entity-row-relative TTL window.
- [Feast online store](https://docs.feast.dev/getting-started/components/online-store) - latest-value online storage model.
- [Feast online-store functionality overview](https://docs.feast.dev/reference/online-stores/overview) - provider capability labels and the Redis, DynamoDB, and PostgreSQL matrix entries.
- [Feast Redis online store](https://docs.feast.dev/reference/online-stores/redis) and [v0.65.0 Redis documentation](https://github.com/feast-dev/feast/blob/v0.65.0/docs/reference/online-stores/redis.md#ttl-configuration) - `key_ttl_seconds`, entity-hash co-location, expiry reset behavior, and the statement that `FeatureView.ttl` does not filter online reads.
- [Feast v0.65.0 Redis implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/online_stores/redis.py) - confirmation that accepted writes issue `EXPIRE` and normal reads do not compare stored event time with `FeatureView.ttl`.
- [Feast v0.65.0 FeatureView implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/feature_view.py) - current constructor arguments and TTL type.
- [Feast Python feature server](https://docs.feast.dev/reference/feature-servers/python-feature-server) and [v0.65.0 metrics implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/metrics.py) - Prometheus metric name, labels, and materialization-end-time semantics.

## Issues Found
1. The post interpreted Redis's "TTL at retrieval" matrix entry as a separate event-time stale-read check. Current Redis documentation explicitly says `FeatureView.ttl` does not filter online reads, and the normal Redis read path performs no such comparison. The post now explains that Redis's physical key expiry accounts for both a later miss and deletion, while an event-time freshness policy must be enforced separately.
2. The three-clock table described an unsupported Redis/provider clock relative to serving time and stored event time. Replaced that row with an explicit serving-layer maximum-age policy and made the Redis row relative to the most recent accepted write to the shared entity hash.
3. The producer-failure explanation implied that `FeatureView.ttl` could eventually make normal Redis online reads missing. Corrected it to distinguish Redis key expiry after writes stop from a serving-layer event-time rejection.
4. The test plan conflated an old feature event timestamp with an old Redis key. Redis expiry begins or resets when an accepted write issues `EXPIRE`, so the post now tests event-time TTL behavior separately from elapsed key lifetime after the last accepted write.
5. The co-location warning was imprecise. It now states that an accepted write to any co-located FeatureView resets the TTL of the entire entity hash and can keep stale fields from another FeatureView alive.
6. The freshness metric description did not distinguish materialization recency from served-value age. It now states that `feast_feature_freshness_seconds` measures time since Feast's most recent recorded materialization end time and does not inspect each served value's event timestamp.
7. The serving-layer fallback suggested that statuses alone could enforce freshness. Normal Redis reads mark found values as present regardless of `FeatureView.ttl`, so the post now requires checking returned event timestamps and limits stale-status handling to providers that document such a status.

## Review Notes
- Reviewed against Feast v0.65.0, the latest release as of 2026-08-20, and current Feast master at commit `e79bd331694ffc7dd6023465b17348470afbe4e6` dated 2026-08-19.
- Feast's Redis documentation is easy to misread: its matrix marks "TTL at retrieval" as supported, while its detailed TTL section says `FeatureView.ttl` does not filter online reads. The corrected post follows the detailed provider documentation and the v0.65.0 implementation rather than treating the matrix label as an independent event-time check.
- The historical lookup explanation and examples are correct. The implemented lower bound is inclusive: a row exactly one TTL interval before the entity timestamp remains eligible.
- The Python FeatureView example uses the current API. It intentionally assumes that `driver` and `driver_stats_source` were defined earlier.
- The Redis YAML fields and values are valid. All five official documentation links in the post returned HTTP 200 during review.
