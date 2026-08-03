# Prometheus Remote Write vs. Federation vs. Remote Read: Choosing a Pattern

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Remote Write, Federation, Remote Read, PromQL, Metrics Architecture

Description: Choose the right Prometheus data-sharing pattern by comparing ingestion direction, data selection, query behavior, buffering, and operational tradeoffs.

---

Prometheus can move or expose metrics through three mechanisms that sound similar but solve different problems. Remote Write copies newly ingested samples to another system. Federation lets one Prometheus scrape selected current series from another Prometheus. Remote Read lets a Prometheus query fetch raw historical series from an external store.

The decision becomes much easier when you start with the data flow instead of the feature name.

## The Three Data Flows

```text
Remote Write: source Prometheus  -> receiver
Federation:   source Prometheus <- destination Prometheus scrape
Remote Read:  querying Prometheus -> external store during a query
```

They differ in several important ways:

| Question | Remote Write | Federation | Remote Read |
| --- | --- | --- | --- |
| Who initiates traffic? | The sender | The federating destination | The querying Prometheus |
| When does data move? | Continuously after ingestion | At each federation scrape | When a query needs it |
| Typical data | Raw samples, optionally filtered | Selected current series, often aggregates | Raw historical series for requested selectors and ranges |
| Where is data retained? | Receiver | Destination Prometheus | Remote store |
| PromQL execution | At the receiver or its query layer | At the destination after scraping | In Prometheus after raw data is fetched |
| Outage buffering | Sender WAL, within its recovery window | No replay of missed federation scrapes | Not an ingestion path |

Remote Write and federation create another stored copy. Remote Read does not continuously copy data into local storage.

## Use Remote Write for Central Ingestion

Remote Write is usually the right choice when many Prometheus servers or Agent-mode collectors must forward samples to a central, Remote-Write-compatible backend.

```yaml
global:
  external_labels:
    cluster: eu-west-production
    prometheus_replica: prometheus-0

remote_write:
  - name: central
    url: https://metrics.example.com/api/v1/write
    authorization:
      credentials_file: /etc/prometheus/secrets/remote-write-token
```

Each destination has a queue that reads the Prometheus write-ahead log, batches samples, and sends them in parallel shards. Temporary receiver failures are retried. This makes Remote Write appropriate for near-real-time offloading, but it is not an unlimited message queue. A sufficiently long outage eventually exceeds the recoverable WAL window.

Use it when you need:

- durable central storage beyond the local Prometheus retention period;
- an egress-only flow from edge or restricted networks;
- a global query layer supplied by many collectors;
- a managed metrics service that exposes a Remote Write endpoint.

Remember that every matching sample is sent unless `write_relabel_configs` filters it. Network traffic and receiver ingestion cost therefore scale with the post-relabel sample rate.

## Use Federation for Selected Prometheus-to-Prometheus Views

Federation exposes the current value of selected series at `/federate`. A destination Prometheus scrapes that endpoint like any other target. At least one `match[]` selector is required.

```yaml
scrape_configs:
  - job_name: regional-federation
    scrape_interval: 30s
    honor_labels: true
    metrics_path: /federate
    params:
      match[]:
        - '{__name__=~"job:.*"}'
        - 'up{team="payments"}'
    static_configs:
      - targets:
          - prometheus-eu.example.net:9090
          - prometheus-us.example.net:9090
```

Federation is strongest when local Prometheus servers retain detailed metrics and a higher-level Prometheus scrapes a smaller set of recording-rule outputs. This is the hierarchical model documented by Prometheus. It is also useful when one service Prometheus needs selected current metrics owned by another service.

Federation is a scrape, not replication. If the destination cannot scrape for ten minutes, it does not later receive every missed 30-second value. It records the values returned on the next successful scrape. This is a poor fit for copying a complete raw history.

Use federation when:

- the destination needs a deliberately small, PromQL-selectable view;
- local rule evaluation can pre-aggregate high-cardinality data;
- normal pull-based scrape health is operationally useful;
- gaps during a destination outage are acceptable.

Set `honor_labels: true` as shown in the official federation example so labels supplied by the source are preserved. Also plan cluster labels so identically named series from different sources remain distinguishable.

## Use Remote Read to Extend Queryable History

Remote Read connects Prometheus to external storage on the query path:

```yaml
remote_read:
  - name: long-term-store
    url: https://metrics-store.example.com/api/v1/read
    remote_timeout: 1m
    read_recent: false
```

Prometheus sends label selectors and a time range to the remote endpoint, receives raw series, and evaluates PromQL itself. The official storage documentation calls out the resulting scalability limit: all required raw data must travel back to the querying Prometheus before evaluation.

Remote Read can be useful for an integration that genuinely implements this API, especially when older data should appear transparently through a Prometheus query endpoint. It is not the same as querying a distributed backend through that backend's native query frontend. A native query layer can often distribute or push down work that Prometheus Remote Read cannot.

Use Remote Read when:

- an existing compatible store must be queried transparently from Prometheus;
- query volume and raw result sizes are bounded;
- you accept that the Remote Read API is not considered stable;
- copying the data into another local TSDB is unnecessary.

Do not configure Remote Read merely because Remote Write is enabled. Writing to a service and querying that service are independent architecture decisions.

## Common Combinations

These patterns are not mutually exclusive.

### Local Detail, Global Aggregates

Run full Prometheus servers in each region, create recording rules locally, and federate only the aggregates to a global Prometheus. This keeps regional drill-down local and makes the global series set small.

### Edge Collection, Central Querying

Run Prometheus in Agent mode at each edge, add stable external labels, and Remote Write to a central backend. The edge has no local PromQL, rules, or alerting, so the central system must provide those functions.

### Local Recent Data, Remote History

Keep recent data in a normal Prometheus and use a compatible Remote Read store for older time ranges. Test expensive range queries before adopting this pattern because PromQL still runs locally.

### Remote Write Plus Local Rules

Use a full Prometheus when local dashboards and alerts must survive a central backend outage, while also Remote Writing data centrally. Agent mode would remove those local query and rule capabilities.

## A Practical Decision Checklist

Choose Remote Write if the requirement says **forward every new matching sample**. Choose federation if it says **scrape a selected current view from another Prometheus**. Choose Remote Read if it says **load external raw history when a query runs**.

Then test the failure mode:

1. Stop the central endpoint and observe how long the Remote Write WAL can protect unsent samples.
2. Stop federation scrapes and confirm stakeholders accept unreplayed gaps.
3. Run representative Remote Read range queries and measure transferred data, latency, and Prometheus memory.
4. Confirm label ownership at every boundary to avoid cross-cluster series collisions.
5. Confirm the chosen receiver supports the protocol message, authentication, and metric types you enable.

The best architecture may use more than one mechanism, but each should have one explicit job. Treating all three as interchangeable usually produces unexpected gaps, duplicate data, or an overloaded query path.

## Official Documentation

- [Prometheus federation](https://prometheus.io/docs/prometheus/latest/federation/)
- [Prometheus storage and remote storage integrations](https://prometheus.io/docs/prometheus/latest/storage/#remote-storage-integrations)
- [Prometheus Remote Write configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus Remote Read configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_read)
- [Prometheus Remote Read API](https://prometheus.io/docs/prometheus/latest/querying/remote_read_api/)
- [Prometheus Remote Write tuning](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus Agent mode](https://prometheus.io/docs/prometheus/latest/prometheus_agent/)
