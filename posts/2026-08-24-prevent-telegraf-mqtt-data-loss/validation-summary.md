# Validation Summary: Prevent Telegraf MQTT Data Loss with QoS and Persistent Sessions

## Status
validated

## Post Type
Technical configuration and reliability guide

## Technologies Covered
- Telegraf 1.39.3
- Telegraf `inputs.mqtt_consumer` and `inputs.internal` plugins
- MQTT 3.1.1 QoS and persistent sessions
- Telegraf tracking metrics, output batching, and buffering
- TOML configuration

## Sources Consulted
- [Telegraf MQTT consumer input plugin](https://docs.influxdata.com/telegraf/v1/input-plugins/mqtt_consumer/)
- [Telegraf 1.39.3 MQTT consumer implementation](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/inputs/mqtt_consumer/mqtt_consumer.go)
- [Telegraf reconnect and resubscription change](https://github.com/influxdata/telegraf/commit/b060ccc32f12)
- [Collect data from MQTT with Telegraf](https://docs.influxdata.com/telegraf/v1/examples/collect-mqtt/)
- [Telegraf tracking metrics](https://docs.influxdata.com/telegraf/v1/concepts/metrics/#tracking-metrics)
- [Telegraf data pipeline and buffering](https://docs.influxdata.com/telegraf/v1/concepts/data-pipeline/#buffering-and-delivery)
- [Telegraf agent batching and buffering settings](https://docs.influxdata.com/telegraf/v1/configuration/agent/#batching-and-buffering)
- [Monitor Telegraf internal metrics](https://docs.influxdata.com/telegraf/v1/administer/monitor/)
- [Telegraf internal input plugin](https://docs.influxdata.com/telegraf/v1/input-plugins/internal/)
- [OASIS MQTT Version 3.1.1 specification](https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/mqtt-v3.1.1.html)

## Issues Found
- The configuration block did not state that it was only an input-side baseline. A complete Telegraf configuration requires an output plugin, so the lead-in now makes that prerequisite explicit without adding an arbitrary output configuration.
- The configuration did not state its minimum Telegraf version. The post now identifies Telegraf 1.38.0 as the minimum because older versions do not recognize `max_reconnect_interval`.
- The example client ID was 24 bytes long and contained hyphens. MQTT 3.1.1 only requires brokers to accept client IDs of 1–23 bytes containing ASCII alphanumeric characters, so it was replaced with the portable 21-byte ID `telegrafFactoryProd01`.
- Offline delivery was described as requiring configured publisher and subscriber QoS 1 or 2 without distinguishing the broker-granted subscription QoS. The post now states that MQTT 3.1.1 guarantees offline queueing when both the published QoS and the broker-granted subscription QoS are 1 or 2. It also notes that brokers may queue QoS 0 messages but are not required to do so.
- The post used “retain” for offline session queueing, which could be confused with MQTT retained messages. It now uses “queue”; retained messages are a separate MQTT feature and are not part of persistent session state.
- QoS 2 was described too broadly as exactly once across an MQTT protocol exchange. It now correctly scopes exactly-once delivery to one MQTT sender-to-receiver delivery flow; publisher-to-broker and broker-to-subscriber are separate flows.
- The persistent-session topic warning was outdated. Since Telegraf 1.38.0, `mqtt_consumer` re-subscribes its configured topics after every successful connection, including a resumed session, so added topics take effect. The corrected warning explains that subscriptions removed from the configuration can remain in the broker session because Telegraf does not unsubscribe them.
- `metric_buffer_limit` was described as a universal per-output bound. The post now limits that statement to Telegraf's default memory buffer strategy; disk buffering is not bounded by the same metric count.
- The tracked-window explanation referred ambiguously to bounded “in-flight broker acknowledgements” and to room for output batches. It now distinguishes source messages awaiting acknowledgement from emitted metrics and says to size the source-message window to produce complete metric batches.
- The opening delivery statement did not explicitly tie deferred MQTT acknowledgement to `persistent_session = true` and did not account for output filters. It now states that successfully parsed metrics must be delivered to all applicable outputs before Telegraf acknowledges a persistent-session message.
- The tracked-delivery discussion did not identify the handling of invalid payloads. It now states that messages which fail payload or topic parsing, or produce no metrics, are acknowledged and not retried.

## Review Notes
- The TOML syntax and all shown Telegraf option names and value types are correct for Telegraf 1.39.3. `max_reconnect_interval` was introduced in Telegraf 1.38.0, so older agents require an upgrade or removal of that setting.
- `metric_batch_size = 1000`, `metric_buffer_limit = 20000`, and `max_undelivered_messages = 2000` form a valid starting configuration, but production sizing still depends on how many Telegraf metrics each MQTT message produces and on measured traffic and outage duration.
- `internal_mqtt_consumer.messages_received` and `payload_size` are cumulative process-level counters. They are aggregated across MQTT consumer instances rather than tagged per alias.
- Tracking waits for outputs applicable after output filtering; an output that filters out a metric is not treated as a failed delivery.
