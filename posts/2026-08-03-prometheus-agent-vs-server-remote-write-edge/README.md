# Prometheus Agent Mode vs. Full Prometheus for Remote Write at the Edge

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Agent Mode, Remote Write, Edge Monitoring, Architecture, WAL

Description: Choose between Prometheus Agent mode and a full Prometheus server at the edge by comparing local queries, rules, outage tolerance, resources, and recovery behavior.

---

Both Prometheus Agent mode and a full Prometheus server can discover targets, scrape metrics, and send samples with Remote Write. The decisive difference is what must still work at the edge when the central metrics platform or network is unavailable.

Agent mode is a forwarding-focused deployment. It keeps a purpose-built write-ahead log, but it does not provide a queryable local TSDB, PromQL queries, recording rules, or alerting rules. A full server retains queryable local data and runs rules, at the cost of more storage and compute.

Use Agent mode when the edge is a collection tier. Use full Prometheus when the edge is also an independent monitoring tier.

## The Decision in One Table

| Requirement | Agent mode | Full Prometheus |
| --- | --- | --- |
| Service discovery and scraping | Yes | Yes |
| Remote Write | Yes | Yes |
| Query local history with PromQL | No | Yes |
| Recording and alerting rules | No | Yes |
| Queryable local TSDB blocks | No | Yes |
| Temporary on-disk forwarding buffer | Yes | Yes |
| Automatic Remote Write backfill from old TSDB blocks | No | No |
| Primary design goal | Efficient forwarding | Complete monitoring server |

That final backfill row matters. A full server may still have samples in local TSDB blocks after its Remote Write WAL replay window is lost, but the normal Remote Write queue does not return to those blocks and upload them automatically. Retaining local data is valuable, but historical repair requires a separate workflow supported by the destination.

## What Agent Mode Keeps and Removes

Agent mode preserves the ingestion path:

```text
service discovery -> scrape -> relabel -> Agent WAL -> Remote Write
```

It removes the local query and rule-evaluation path:

```text
local TSDB blocks -> PromQL -> recording rules and alerts
```

This makes Agent mode a good fit for Kubernetes clusters, stores, factories, branch offices, and other locations where a central system owns long-term storage, dashboards, and alerting.

It does not make scraping free. Service discovery, parsing, relabeling, active-series tracking, the Remote Write series-label cache, WAL I/O, compression, and HTTP requests still consume CPU, memory, disk, and network. Size an Agent from measured targets, active series, churn, and samples per second rather than from mode alone.

## A Minimal Edge Agent

The configuration format for scraping and Remote Write is the same one used by a full server:

```yaml
global:
  scrape_interval: 30s
  external_labels:
    environment: production
    region: eu-west
    cluster: edge-london-01

scrape_configs:
  - job_name: node
    static_configs:
      - targets:
          - 10.20.0.11:9100
          - 10.20.0.12:9100

remote_write:
  - name: central
    url: https://metrics.example.net/api/v1/write
    authorization:
      credentials_file: /etc/prometheus/remote-write.token
    queue_config:
      retry_on_http_429: true
```

Start the binary explicitly in Agent mode:

```bash
prometheus \
  --agent \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.agent.path=/var/lib/prometheus-agent \
  --storage.agent.retention.min-time=5m \
  --storage.agent.retention.max-time=4h \
  --web.listen-address=0.0.0.0:9090
```

Specifying the listen address avoids relying on assumptions copied from old examples. Specifying the retention limits makes the intended outage budget visible in the deployment, although disk capacity and catch-up throughput must still support it.

Put the Agent WAL on persistent storage if a restart or reschedule must preserve queued samples. An ephemeral container filesystem turns every replacement into a possible forwarding gap.

## The Equivalent Full Server

The same configuration can be run without `--agent`:

```bash
prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus \
  --web.listen-address=0.0.0.0:9090
```

The full server writes samples to its local TSDB, serves PromQL, and can evaluate configured recording and alerting rules. It can therefore keep local dashboards and alerts useful during a central outage.

For an isolated factory, for example, a local rule can continue detecting a stopped production line even when the WAN is down. Agent mode cannot evaluate that rule locally; the central rule evaluator cannot see new samples until connectivity and forwarding recover.

Full Prometheus is also the better choice when operators need to investigate targets locally, compare live behavior with local history, or retain a source of evidence during a prolonged central incident.

## Outage Tolerance Is Not Just Local Retention

There are three separate questions:

1. How long do unsent samples remain replayable by Remote Write?
2. How quickly can the sender and receiver catch up after recovery?
3. Does the edge need local queries and alerts during the outage?

The current Prometheus command reference exposes these Agent settings:

```text
--storage.agent.retention.min-time   default 5m
--storage.agent.retention.max-time   default 4h
```

Older Agent documentation describes a two-hour buffer, so always check `prometheus --help` and the arguments of the deployed version. A configured maximum is not a guarantee if the volume runs out of disk first.

For full server mode, the official Remote Write tuning guide warns that an unavailable destination for more than approximately two hours can lose unsent samples when WAL compaction removes records the queue has not processed. Longer local TSDB retention does not extend that normal Remote Write replay path.

In either mode, estimate catch-up rather than considering retention alone:

```text
backlog = incoming samples per second * outage seconds

drain time = backlog / (post-recovery send capacity - incoming rate)
```

The second equation works only when post-recovery capacity is greater than the continuing incoming rate. A four-hour buffer cannot recover if the destination accepts samples no faster than they continue to arrive.

## Choose Agent Mode When Collection Is the Only Edge Job

Agent mode is usually the clearer choice when all of these are true:

- dashboards, queries, long-term storage, rules, and notifications are centralized;
- short network interruptions fit inside a tested WAL and disk budget;
- no safety-critical or operational alert must run without the central platform;
- lowering the edge storage and compute footprint is valuable;
- a receiver-supported plan exists for gaps that exceed the replay window.

It also works well as a shared collection layer, but one process is not automatic high availability. If two Agents scrape the same targets and send the same label sets, the receiver sees both sample streams as one time series; depending on timing and receiver behavior, this can mix the streams or cause duplicate-timestamp or out-of-order samples. Give replicas explicit labels and use the destination's supported HA deduplication mechanism, or partition scrape ownership so each target has one active collector.

Do not use `external_labels` as accidental uniqueness. Stable labels such as `cluster` and `region` should identify the source consistently. A replica label should identify only the redundant sender and must match the receiver's deduplication convention.

## Choose Full Prometheus When the Edge Must Be Autonomous

Use a full server when any of these requirements matters:

- local PromQL and dashboards must survive a WAN outage;
- alerting or recording rules must execute at the edge;
- local retention is part of incident response or compliance;
- central and local operators both need the same freshly scraped data;
- outages can exceed a forwarding-only design and local visibility remains useful.

The extra capability has a cost. Queryable TSDB blocks, compaction, queries, and rules need more disk I/O, storage, memory, and CPU. Define retention and storage capacity intentionally, and place the TSDB on a supported local or block filesystem. Prometheus documentation explicitly warns against NFS for local storage.

A full server is not automatically more reliable. It still needs persistent storage, resource headroom, monitoring, backups or rebuild procedures, and a plan for the remote gap after the queue's WAL window is exceeded.

## Operate Either Mode as a Production Sender

Monitor every named Remote Write destination independently:

```promql
time()
-
prometheus_remote_storage_queue_highest_sent_timestamp_seconds{
  remote_name="central"
}
```

```promql
prometheus_remote_storage_samples_pending{remote_name="central"}
```

```promql
increase(
  prometheus_remote_storage_samples_failed_total{
    remote_name="central"
  }[10m]
)
```

```promql
increase(
  prometheus_remote_storage_samples_dropped_total{
    remote_name="central"
  }[10m]
)
```

The highest-sent timestamp shows queue progress for an active source; check it alongside failure counters because the queue can also advance past an irrecoverable failure. Pending samples show backlog. Failed samples are non-recoverable send failures. Dropped samples were not sent after being read from the WAL; inspect the `reason` label because `dropped_series` can be an intentional write-relabeling result, while `too_old` and `unintentionally_dropped_series` indicate unplanned loss. Gate timestamp-age alerts with a known heartbeat because an intentionally idle sender has no new timestamp to send.

Also alert on WAL disk usage, filesystem errors, scrape failures, target count, sample ingestion rate, memory, restarts, and receiver throttling. Agent mode removes features; it does not remove the need to monitor the collector.

## Migrate with an Explicit Acceptance Test

Switching from full server mode to Agent mode is an architectural change, not merely a flag change.

1. Inventory local queries, dashboards, rules, alerts, and integrations.
2. Move every required rule and dashboard to a central component and test it.
3. Confirm labels and Remote Write credentials in a canary Agent.
4. Give the Agent persistent disk sized for the intended outage window.
5. Compare scrape target health and sample rates between old and new senders.
6. Avoid running both against the same targets without a duplicate strategy.
7. Test a receiver outage and measure loss-free catch-up.
8. Remove the full server only after local autonomy is no longer required.

The reverse migration is simpler operationally, but the new full server starts without old queryable history unless data is restored through a separate supported process.

The practical rule is straightforward: choose Agent mode to transport metrics efficiently, and choose full Prometheus when the edge must remain a monitoring system in its own right.

## Official Documentation

- [Prometheus Agent mode](https://prometheus.io/docs/prometheus/latest/prometheus_agent/)
- [Prometheus current command-line flags](https://prometheus.io/docs/prometheus/latest/command-line/prometheus/)
- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus Remote Write characteristics and tuning](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus local storage](https://prometheus.io/docs/prometheus/latest/storage/)
- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
