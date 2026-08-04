# Validation Summary: Prometheus Remote Write vs. Federation vs. Remote Read: Choosing a Pattern

## Status
validated

## Post Type
Technical architecture guide

## Technologies Covered

- Prometheus server and Agent mode
- Prometheus Remote Write 1.0 and 2.0 messages
- Prometheus federation and scrape configuration
- Prometheus Remote Read API
- PromQL and recording rules
- Prometheus write-ahead log and remote-write queues
- YAML configuration

## Sources Consulted

- [Prometheus federation](https://prometheus.io/docs/prometheus/latest/federation/)
- [Prometheus configuration: Remote Write and Remote Read](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus storage and remote storage integrations](https://prometheus.io/docs/prometheus/latest/storage/#remote-storage-integrations)
- [Prometheus Remote Read API](https://prometheus.io/docs/prometheus/latest/querying/remote_read_api/)
- [Prometheus Remote Write tuning](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus Agent mode](https://prometheus.io/docs/prometheus/latest/prometheus_agent/)
- [Prometheus Remote Write 1.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec/)
- [Prometheus Remote Write 2.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/)
- [Prometheus API stability guarantees](https://prometheus.io/docs/prometheus/latest/stability/)

## Issues Found

- The post said that every matching sample is sent unless write relabeling filters it. That was too broad because exemplars and native histogram samples have separate behavior in the current Remote Write configuration. The text now specifies matching float samples, notes the separate settings, and records that native histograms are always enabled with the Remote Write 2.0 message.

## Review Notes

- All three YAML snippets parse correctly and use current Prometheus configuration fields.
- The Remote Read API remains unstable, as the post states.
- The current Prometheus configuration defaults to the Remote Write 1.0 `prometheus.WriteRequest` message; the Remote Write 2.0 specification remains experimental. Receiver compatibility should be confirmed before changing messages, consistent with the post's checklist.
- Federating native histograms requires `scrape_native_histograms: true` in the destination scrape configuration. The federation example selects ordinary float series and does not claim to enable native histogram federation.
