# How to Remove One High-Cardinality Tag from One Telegraf Measurement with `namepass` and Starlark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telegraf, Starlark, Cardinality, Metrics, InfluxDB

Description: Scope a Starlark processor to one measurement and safely remove one volatile tag without changing unrelated metrics.

---

A tag such as `request_id`, `trace_id`, or an unbounded URL can create a new time-series identity for nearly every event. Removing it globally may break measurements that legitimately use the same tag key. Telegraf's `namepass` selector and Starlark processor provide a precise transformation: only matching metrics enter the script, and nonmatching metrics continue downstream unchanged.

Assume the unwanted tag occurs only on the `http_request` measurement:

```text
http_request,host=api-1,method=GET,request_id=a7f9 duration_ms=18.2 1787532000000000000
```

The intended output keeps the measurement, fields, timestamp, and useful dimensions:

```text
http_request,host=api-1,method=GET duration_ms=18.2 1787532000000000000
```

## Scope the Processor Before Editing Tags

Use `namepass` on the processor instance:

```toml
[[processors.starlark]]
  namepass = ["http_request"]
  source = '''
def apply(metric):
    if "request_id" in metric.tags:
        metric.tags.pop("request_id")
    return metric
'''
```

The exact measurement title belongs in `namepass`; values are glob patterns, so `http_*` would deliberately select a wider set. A metric excluded by a processor selector bypasses that processor and proceeds to the next pipeline stage-it is not dropped.

Telegraf exposes `metric.tags` as a dict-like object. The current implementation supports `pop`, which removes the key and returns its previous value. The membership check makes the script safe when a matching metric does not contain `request_id`. This matters because a Starlark execution error causes Telegraf to drop the affected metric.

Always return `metric`. Returning `None`, or reaching the end without returning a metric, intentionally drops it.

## Confirm the Transformation Before Deployment

Create a minimal staging configuration with representative line protocol and the processor. Telegraf test mode runs inputs, processors, and aggregators, prints the resulting metrics to standard output, and does not execute configured outputs:

```bash
telegraf --config ./candidate.conf --test
```

Verify all three cases:

1. `http_request` with `request_id` loses only that tag.
2. `http_request` without the tag passes without error.
3. another measurement containing `request_id` remains unchanged.

Run with debug logging during a controlled rollout and watch for errors from `processors.starlark`. If the pipeline uses aggregators, keep the script idempotent-as this one is-and review the agent's processor-before/after-aggregator settings. In current Telegraf releases, processors can run in both pipeline positions depending on those settings; the documented default for `skip_processors_after_aggregators` is scheduled to change in Telegraf 1.40.

## Know When Starlark Is Unnecessary

Telegraf's common metric modifiers can remove tags without a script:

```toml
tagexclude = ["request_id"]
```

Use `tagexclude` directly on an input when that plugin instance produces only metrics where the tag should disappear. Use it on an output when only that destination should omit the tag. A processor is useful when the scope must be expressed by measurement name and the transformed metric should affect every downstream output.

`taginclude` is an allowlist and is safer when the complete desired tag schema is small and stable. Do not confuse either modifier with `tagpass`: `tagpass` selects whole metrics based on tag values; it does not remove a tag key.

## Understand What Cardinality Changes

After removal, points that differ only by `request_id` share the same measurement-and-tag series identity. That substantially reduces series cardinality, but it also removes request-level grouping. Preserve correlation in logs or traces if operators still need it; do not turn a high-cardinality identifier into a field unless the downstream storage and query design genuinely calls for it.

The change is prospective. Existing series already stored in InfluxDB or another backend are not rewritten or deleted by Telegraf. Cardinality dashboards may decline only after retention or explicit data-management actions remove old series.

Also consider timestamp collisions. In line protocol destinations, points with the same measurement, tag set, and timestamp can merge or overwrite field values according to the destination's rules. Removing a differentiating tag is correct only when the remaining schema still represents the events faithfully.

## Keep the Script Small and Observable

Starlark in Telegraf is sandboxed and cannot perform file or socket I/O. That is a useful boundary: this processor should be a deterministic schema transformation, not an external lookup. Give the processor an `alias` if distinct log identification is useful, but remember that aliases identify plugin instances in logs; they are not routing keys.

## Official Documentation

- [Telegraf Starlark processor](https://docs.influxdata.com/telegraf/v1/processor-plugins/starlark/)
- [Telegraf metric filtering and modifiers](https://docs.influxdata.com/telegraf/v1/configuration/filtering/)
- [Transform data with processors and aggregators](https://docs.influxdata.com/telegraf/v1/configure_plugins/aggregator_processor/)
- [Current Telegraf Starlark tag dictionary implementation](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/common/starlark/tag_dict.go)
- [InfluxDB schema design and series cardinality](https://docs.influxdata.com/influxdb/cloud/write-data/best-practices/schema-design/)

## Conclusion

Put `namepass` on the Starlark processor, check that the tag exists, call `metric.tags.pop`, and return the metric. Test matching, missing-tag, and nonmatching cases, then monitor processor errors and backend cardinality. This removes one harmful dimension without silently changing the rest of the pipeline.
