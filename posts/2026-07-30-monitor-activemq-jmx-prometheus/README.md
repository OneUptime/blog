# Monitoring ActiveMQ: Queue Age, Backlog, Consumers, and Store Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ActiveMQ, ActiveMQ Classic, JMX, Prometheus, Monitoring

Description: Export ActiveMQ Classic JMX metrics to Prometheus and build alerts that combine queue backlog, throughput, consumers, message age, and broker capacity.

---

An ActiveMQ dashboard should answer two questions: can the broker accept and retain work, and is each workload making progress before its deadline? A queue-size graph alone answers neither. Ten messages can be critical if they are hours old, while ten thousand can be healthy during a planned burst.

This article covers ActiveMQ Classic's JMX MBeans. Artemis exposes different object names and management attributes.

## Start with the Classic MBean model

ActiveMQ Classic enables JMX by default. Its broker MBean exposes totals and capacity, while destination MBeans expose per-queue or per-topic activity.

Useful broker attributes include:

- `TotalMessageCount`;
- `TotalEnqueueCount` and `TotalDequeueCount`;
- `TotalConsumerCount` and `TotalProducerCount`;
- `MemoryPercentUsage`;
- `StorePercentUsage`;
- `TempPercentUsage`;
- `CurrentConnectionsCount` and `TotalConnectionsCount`.

Useful queue attributes include:

- `QueueSize`;
- `EnqueueCount` and `DequeueCount`;
- `DispatchCount`;
- `InFlightCount`;
- `ConsumerCount` and `ProducerCount`;
- `ExpiredCount`;
- `AverageEnqueueTime`, `MinEnqueueTime`, and `MaxEnqueueTime`;
- `MemoryPercentUsage`;
- `BlockedSends` and blocked time;
- `DuplicateFromStoreCount`.

These names are documented by the Classic JMX and MBean API references. Check the exact attributes exposed by your broker version before writing recording rules.

## Export JMX without exposing remote RMI

Prometheus JMX Exporter supports a Java agent and a standalone remote-JMX mode. Its documentation recommends the Java agent for most users because it avoids the operational and security complexity of remote JMX/RMI.

Add the exporter to the broker JVM using the artifact version you have pinned and reviewed:

```text
-javaagent:/opt/jmx-exporter/jmx_prometheus_javaagent-<version>.jar=9404:/etc/activemq/jmx-exporter.yaml
```

Bind and protect the HTTP endpoint according to your network model. Do not expose JMX, Jolokia, the web console, or the Prometheus endpoint directly to the internet.

A starting exporter configuration can allow only the broker and destination MBeans:

```yaml
lowercaseOutputName: true
lowercaseOutputLabelNames: true

includeObjectNames:
  - "org.apache.activemq:type=Broker,brokerName=*"
  - "org.apache.activemq:type=Broker,brokerName=*,destinationType=Queue,destinationName=*"
```

Without custom rules, inspect the emitted metric names at `/metrics`. Then add explicit, integration-tested JMX Exporter rules for the attributes you use. Object-name quoting, property order, and metric naming can differ across exporter and broker versions, so copying an untested regex from a dashboard is fragile.

Keep destination names as a bounded label. Exclude temporary destinations and advisory topics unless they are deliberately monitored. Never export message IDs, correlation IDs, users, or arbitrary properties as metric labels.

## Interpret the queue metrics correctly

`QueueSize` is the number of messages not yet acknowledged. It is a gauge of current backlog.

`EnqueueCount` and `DequeueCount` are cumulative lifecycle counters since broker startup or statistics reset. Use `rate()` or `increase()` in Prometheus and expect resets:

```promql
rate(activemq_queue_enqueue_count_total[5m])

rate(activemq_queue_dequeue_count_total[5m])
```

Your final names will depend on exporter rules.

`InFlightCount` is work dispatched to consumers but not acknowledged. A high value with a healthy dequeue rate may simply reflect prefetch. A high value with no progress points to slow workers, blocked transactions, or lost connections.

`ConsumerCount` tells you whether subscriptions exist, not whether they are healthy. Combine it with dequeue rate and backlog.

Broker `StorePercentUsage` measures use relative to the configured store limit. Also monitor filesystem free space; a mis-sized limit or unrelated files can make either view incomplete.

## Queue age needs special care

Classic's `AverageEnqueueTime`, `MinEnqueueTime`, and `MaxEnqueueTime` describe time messages spent at the destination as observed by its statistics. They are useful latency signals, but `MaxEnqueueTime` is not guaranteed to be the current oldest outstanding message's age.

For robust message-age monitoring:

- have producers stamp an immutable event-created or enqueue timestamp;
- have consumers emit `now - timestamp` for every processed message as a processed-age metric;
- maintain an application-level oldest-pending metric keyed only by bounded queue/workload labels if you need a true current-backlog SLI;
- periodically inspect a bounded queue sample through management when operationally safe, treating it as a diagnostic sample rather than a guaranteed oldest-message measurement.

JMS `JMSTimestamp` records when the message was handed to the provider for sending and can help, but it may be zero when message timestamps are disabled and is not the broker's arrival time. Business event age may begin earlier. Clock synchronization matters. Do not run an unbounded queue browse on a hot production broker merely to calculate one metric.

## Build alerts from symptoms and progress

### Backlog is growing faster than it drains

Alert when queue size is above a workload-specific baseline and enqueue rate exceeds dequeue rate for a sustained window. This avoids paging on a normal brief burst.

### Work exists but no consumer is attached

```promql
activemq_queue_size > 0
and
activemq_queue_consumer_count == 0
```

Add a `for` duration appropriate to rollout gaps. A durable queue may intentionally wait between scheduled batch runs.

### Messages are missing their age objective

Alert on an application-derived oldest or processed-age metric, with queue size as context. This is often the most direct customer-impact signal.

### The broker is nearing capacity

Alert separately on:

- `StorePercentUsage`;
- memory-percent usage;
- temp-store usage where applicable;
- filesystem free bytes and projected exhaustion;
- blocked sends;
- KahaDB checkpoint/cleanup or I/O errors.

Capacity alerts should fire early enough to stop producers or add space safely.

### Consumers are present but progress stopped

Combine:

- queue size above zero;
- consumer count above zero;
- dequeue increase equal to zero;
- sustained in-flight messages or consumer error rate.

This distinguishes a missing consumer from a stuck one.

## Suggested dashboard layout

For each owned queue, show:

1. queue size and oldest/processed message age;
2. enqueue, dequeue, dispatch, expiry, and DLQ rates;
3. consumer and producer counts;
4. in-flight messages and prefetch context;
5. broker memory, store, temp, and filesystem capacity;
6. blocked sends and duplicate-from-store increases;
7. deploy, broker restart, and failover annotations.

At fleet level, aggregate rates but preserve queue-level alerts. Summing every queue can hide one critical workload behind a busy healthy one.

## Validate the instrumentation

Create a controlled test queue and verify:

1. enqueue count increases when messages are sent;
2. queue size rises without a consumer;
3. consumer count changes when a consumer connects;
4. in-flight count reflects unacknowledged prefetch;
5. dequeue count rises only after acknowledgement;
6. counters reset or change after broker restart as expected;
7. store usage responds to persistent backlog;
8. alerts clear after recovery without manual metric edits.

Monitoring is trustworthy only when its lifecycle has been exercised against the broker's actual acknowledgement and persistence behavior.

## Official Documentation

- [ActiveMQ Classic JMX reference](https://activemq.apache.org/components/classic/documentation/jmx)
- [How ActiveMQ Classic reports queue size](https://activemq.apache.org/components/classic/documentation/how-do-i-find-the-size-of-a-queue)
- [ActiveMQ Classic `QueueViewMBean` API](https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/broker/jmx/QueueViewMBean.html)
- [ActiveMQ Classic advisory messages](https://activemq.apache.org/components/classic/documentation/advisory-message)
- [Prometheus JMX Exporter documentation](https://prometheus.github.io/jmx_exporter/)
- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
