# Prevent Telegraf MQTT Data Loss with QoS and Persistent Sessions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telegraf, MQTT, Reliability, Message Delivery, Observability

Description: Configure MQTT and Telegraf's tracked delivery window together so disconnects and output backpressure do not silently turn into missing metrics.

---

Reliable MQTT collection spans three boundaries: publisher to broker, broker to Telegraf, and Telegraf to each applicable configured output. Raising a single setting cannot protect all three. With `persistent_session = true`, Telegraf's MQTT consumer uses tracking metrics to delay broker acknowledgement until the metrics derived from a source message have been delivered to all applicable outputs.

The result is strong loss resistance when the entire chain is configured coherently, but it is not a blanket exactly-once guarantee for the final database.

## Use QoS 1 or 2 with a Stable Session

Assuming at least one output plugin is configured elsewhere, a practical input baseline is:

```toml
[agent]
  metric_batch_size = 1000
  metric_buffer_limit = 20000

[[inputs.mqtt_consumer]]
  alias = "factory_broker"
  servers = ["ssl://broker.example.com:8883"]
  topics = ["factory/+/+/metrics"]
  qos = 1
  client_id = "telegrafFactoryProd01"
  persistent_session = true
  max_undelivered_messages = 2000
  max_reconnect_interval = "30s"
  keepalive = "60s"
  ping_timeout = "10s"
  data_format = "influx"
```

This configuration requires Telegraf 1.38.0 or later; older versions do not recognize `max_reconnect_interval`.

For offline delivery to be guaranteed by MQTT 3.1.1, the publisher must also publish at QoS 1 or 2. A persistent session requires a non-empty, stable `client_id`; a random client ID creates a new identity after restart and cannot resume the old session.

QoS meanings are:

- QoS 0: at most once; a disconnect can lose a message.
- QoS 1: at least once; duplicates are possible and consumers should be idempotent where business effects matter.
- QoS 2: exactly once for a single MQTT sender-to-receiver delivery flow, with more handshake overhead.

Neither QoS 2 nor a persistent session makes arbitrary downstream database writes globally exactly once.

## Understand Telegraf's Tracked Window

`inputs.mqtt_consumer` supports tracking metrics. With persistent sessions enabled, Telegraf allows up to `max_undelivered_messages` source messages that successfully produce metrics to await output delivery confirmation before broker acknowledgement. Messages that fail payload or topic parsing, or produce no metrics, are acknowledged and not retried. This bounds the number of in-flight broker messages awaiting acknowledgement and applies backpressure when an output is slow or unavailable.

Size the value with `metric_batch_size` in mind. The plugin documentation warns that a value that is too high can continuously feed output batches, while a value that is too low may prevent broker messages from reaching a useful flush. Start with enough source messages to produce complete output batches and load-test the actual ratio of MQTT messages to emitted metrics.

Do not confuse this setting with `metric_buffer_limit`:

- `max_undelivered_messages` bounds source messages awaiting tracked delivery;
- `metric_batch_size` bounds metrics in one output write; and
- `metric_buffer_limit` bounds unsent metrics independently for each output when using the default memory buffer strategy.

One MQTT payload can produce multiple Telegraf metrics, so measure rather than assuming a one-to-one ratio.

## Protect Offline Periods at the Broker

With `persistent_session = true`, Telegraf tells the client not to clear its session. The broker can queue qualifying messages while that client is disconnected. The plugin requires `client_id`; for protocol-guaranteed offline delivery, both the published QoS and the broker-granted subscription QoS must be 1 or 2. A broker may also queue matching QoS 0 messages, but MQTT 3.1.1 does not require it.

As of Telegraf 1.38.0, the plugin re-subscribes the configured topics after every successful connection, so added topics take effect. A resumed broker session can still retain subscriptions removed from the Telegraf configuration because the plugin does not unsubscribe them. Reset or delete the old broker session, or use a new versioned client ID, when removing or replacing topic filters, and account for queued messages tied to the old identity.

Broker-side session expiry, queue limits, storage capacity, and per-client policies are outside Telegraf. Configure and monitor them explicitly.

## Make Reconnect Detection Timely

`max_reconnect_interval` caps the MQTT library's exponential reconnect backoff. `keepalive` plus `ping_timeout` governs how long a dead connection may take to be detected. Tune both against network behavior; extremely aggressive values can create reconnect churn during brief packet loss.

For difficult cases, set `client_trace = true` only while agent debug logging is enabled. The plugin calls the resulting trace very noisy, so collect it for a bounded diagnostic window and avoid leaking credentials or payload details.

## Monitor Every Queue

Enable `inputs.internal` and watch both source and output health. Relevant MQTT self-statistics include cumulative `messages_received` and `payload_size`. For outputs, alert when `internal_write.buffer_size` climbs toward `buffer_limit` or when `metrics_dropped` increases.

Also monitor:

- broker queued messages and session expiry;
- reconnect and disconnect rates;
- time from publish to stored metric;
- Telegraf process restarts;
- disk or memory pressure on Telegraf; and
- duplicate event IDs where the payload provides them.

Test failure modes by stopping the output, disconnecting Telegraf, publishing through the outage, restoring each component, and reconciling unique sequence IDs. A metric count alone cannot distinguish loss from duplicates.

## Official Documentation

- [MQTT consumer input plugin](https://docs.influxdata.com/telegraf/v1/input-plugins/mqtt_consumer/)
- [Collect data from MQTT](https://docs.influxdata.com/telegraf/v1/examples/collect-mqtt/)
- [Telegraf data pipeline and buffering](https://docs.influxdata.com/telegraf/v1/concepts/data-pipeline/)
- [Monitor Telegraf internal write metrics](https://docs.influxdata.com/telegraf/v1/administer/monitor/)
- [OASIS MQTT 3.1.1 specification](https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/mqtt-v3.1.1.html)

## Conclusion

Loss-resistant MQTT ingestion requires QoS 1 or 2 for both published messages and broker-granted subscriptions, a stable persistent client identity, a tracked in-flight window sized with output batches, and adequate per-output buffers. Monitor broker and Telegraf queues together, expect duplicates with at-least-once delivery, and prove recovery with sequence-based outage tests.
