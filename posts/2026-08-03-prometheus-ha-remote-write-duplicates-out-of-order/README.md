# Prometheus HA Remote Write: Preventing Duplicate and Out-of-Order Samples

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Remote Write, High Availability, Deduplication, Out-of-Order Samples, Grafana Mimir

Description: Configure HA Prometheus source and replica identity, align receiver deduplication, and trace label collisions that cause duplicate or out-of-order writes.

---

Two Prometheus replicas scraping the same targets improve collection availability, but Remote Writing both replicas raises an identity question: should the receiver store two replica series, or elect one and deduplicate the other?

If both replicas send the same final label set without receiver-aware deduplication, they become concurrent writers to one logical series. Their scrape times and delivery batches can interleave, producing duplicate-timestamp or out-of-order errors. Remote Write preserves per-series order within each sender queue; it cannot coordinate order between independent Prometheus processes.

The reliable pattern is:

```text
shared HA cluster label + unique replica label + matching receiver HA policy
```

## Configure Shared and Unique External Labels

For the first Prometheus replica:

```yaml
global:
  scrape_interval: 15s
  external_labels:
    cluster: payments-production
    __replica__: prometheus-0

remote_write:
  - name: central
    url: https://metrics.example.net/api/v1/push
```

For the second:

```yaml
global:
  scrape_interval: 15s
  external_labels:
    cluster: payments-production
    __replica__: prometheus-1

remote_write:
  - name: central
    url: https://metrics.example.net/api/v1/push
```

The `cluster` value is identical for replicas that cover the same scrape domain. The `__replica__` value is unique and stable for each member.

These are Grafana Mimir's default HA label names. Other receivers may require different names or may not implement ingestion deduplication at all. Always use the receiver's documented label contract.

## What Happens Without the Replica Label

Assume both replicas scrape:

```text
http_requests_total{job="checkout",instance="10.0.1.8:9100"}
```

With only a shared `cluster` label, both send:

```text
http_requests_total{
  job="checkout",
  instance="10.0.1.8:9100",
  cluster="payments-production"
}
```

Replica A may send timestamp 10:00:00.105 after replica B already delivered 10:00:00.231. The receiver then sees an older sample for the same series. If both attach the same explicit timestamp but observe different values, it sees a duplicate timestamp with a different value.

Adding a replica label makes the two streams distinct, so they no longer collide at ingestion. It does not by itself remove the duplicate monitoring coverage or its cost.

## Choose One of Two Valid Storage Models

### Model 1: Receiver-Side HA Deduplication

A backend with an HA tracker elects one replica for each cluster and discards samples from the non-elected replica. Grafana Mimir documents this model. It expects both labels, keeps the cluster label, and removes the replica label when ingesting elected samples so the stored series identity remains stable across failover.

A minimal Mimir configuration excerpt is:

```yaml
limits:
  accept_ha_samples: true

distributor:
  ha_tracker:
    enable_ha_tracker: true
    kvstore:
      store: memberlist
```

The documented defaults expect `cluster` and `__replica__`; custom `ha_cluster_label` and `ha_replica_label` settings must match the Prometheus external-label names.

Mimir's normal HA path checks the first series in a write request and assumes the batch shares the same HA labels. Standard Prometheus external labels satisfy that assumption. A proxy that combines different sources into one request can violate it; follow Mimir's documented per-series option if that nonstandard topology is unavoidable.

Receiver-side deduplication is not free of gaps. Mimir elects a replacement after its failover timeout, and its documentation notes that a default 15-second scrape setup will likely lose one scrape during failover with default timeouts. Test the actual receiver and rate windows you use.

### Model 2: Store Both Replica Series

If the receiver has no HA tracker, retain the unique replica label and store both streams:

```text
...{cluster="payments-production",__replica__="prometheus-0"}
...{cluster="payments-production",__replica__="prometheus-1"}
```

This avoids ingestion collisions but doubles relevant series and samples. Queries and alerts must handle replica identity deliberately. A simple `sum without (__replica__)` double-counts most metrics and is not deduplication. Use the query layer's documented replica-deduplication feature if it has one, or design queries based on the metric's semantics.

The built-in Prometheus Remote Write receiver does not provide a distributed HA tracker. Adding `--web.enable-remote-write-receiver` enables ingestion, not HA deduplication.

## Do Not Drop the Replica Label in the Sender

This defeats the identity model before the receiver can elect a replica:

```yaml
write_relabel_configs:
  - regex: __replica__
    action: labeldrop
```

The receiver must see the configured replica label to identify the sender. In Mimir's model, the receiver removes it after election. A sender-side `labeldrop` makes both inputs collide and prevents HA tracking.

Also check metrics proxies and gateways for label removal or rewriting. Diagnose using the final label set logged by the receiver, not only the source configuration.

## Align Scrape Configuration Between Replicas

An HA pair should discover and scrape equivalent targets with equivalent metric and target relabeling. Drift can produce subtle outcomes:

- one replica sends labels absent on the other;
- a metric exists only on the currently non-elected replica;
- scrape intervals differ, changing failover gaps and rate behavior;
- one replica drops a metric in `write_relabel_configs`;
- external cluster values differ, so the receiver treats replicas as separate HA groups.

Compare the effective configuration from `/api/v1/status/config`, target lists, build versions, and runtime external-label values on both replicas.

## Trace Out-of-Order Errors by Final Series

The Remote Write protocol requires each sender to send samples for a given series in timestamp order. When a compliant Prometheus sender encounters receiver out-of-order errors, investigate multiple writers and label collapse first.

Common causes are:

1. two HA replicas use the same final labels;
2. `labeldrop` removes a target, pod, shard, cluster, or replica differentiator;
3. two targets expose identical `job` and `instance` labels;
4. a recording rule at the receiver creates the same series that Remote Write ingests;
5. a sender restart replays WAL data the receiver already accepted;
6. a source or target clock moved backward;
7. the receiver's HA tracker label names or tenant policy do not match the sender.

Inspect the full label set in receiver logs. Search every source that can write that exact set, including rules and migration tools.

## Out-of-Order Windows Are Not Deduplication

Prometheus TSDB can be configured with a nonzero window:

```yaml
storage:
  tsdb:
    out_of_order_time_window: 10m
```

The documented default is `0s`. A positive value allows certain older samples within the window, with additional storage and query behavior. It does not elect an HA replica, remove duplicate coverage, or make two writers one coherent stream. Same-timestamp conflicts and doubled observations remain receiver-specific problems.

Use an out-of-order window for an ingestion requirement that genuinely permits delayed samples, not to hide broken HA identity.

## Monitor Both Collection and Deduplication

On each sender, watch:

```promql
prometheus_remote_storage_samples_pending{remote_name="central"}
```

```promql
rate(prometheus_remote_storage_samples_failed_total{remote_name="central"}[5m])
```

At the receiver, monitor its documented HA election, deduplicated samples, rejected samples, and out-of-order counters. For Mimir, an HTTP 202 response saying replicas did not match is its documented successful deduplication outcome for a non-elected replica, not a sender failure requiring another route.

Test these scenarios:

1. stop the elected replica and measure the data gap before the second is accepted;
2. restart the old leader and ensure the receiver does not oscillate excessively;
3. temporarily misconfigure one cluster label and confirm alerts detect a second HA group;
4. verify central series do not retain the replica label when using receiver-side deduplication;
5. verify both local Prometheus servers can still alert if central ingestion is unavailable.

HA is achieved by coordinated collection, labeling, receiver election, and querying. Two senders alone provide duplicate traffic, not correct deduplication.

## Official Documentation

- [Prometheus global external labels](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#configuration-file)
- [Prometheus Remote Write 1.0 ordering requirements](https://prometheus.io/docs/specs/prw/remote_write_spec/#ordering)
- [Prometheus Remote Write 2.0 ordering and compatibility](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/)
- [Prometheus TSDB out-of-order window](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#tsdb)
- [Prometheus built-in Remote Write receiver](https://prometheus.io/docs/prometheus/latest/storage/#remote-storage-integrations)
- [Grafana Mimir HA deduplication](https://grafana.com/docs/mimir/latest/configure/configure-high-availability-deduplication/)
- [Grafana Mimir out-of-order error runbook](https://grafana.com/docs/mimir/latest/manage/mimir-runbooks/#err-mimir-sample-out-of-order)
