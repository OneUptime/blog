# Validation Summary: How to Send Remote Write Data from One Prometheus Server to Another

## Status

validated

## Post Type

Technical tutorial and configuration guide

## Technologies Covered

- Prometheus 3.13.1
- Prometheus Remote Write 1.0 and 2.0
- Prometheus Remote Write receiver
- Prometheus configuration and `promtool`
- PromQL and Prometheus self-monitoring metrics
- Docker Compose networking, ports, and volumes
- HTTP, bearer-token authentication, and TLS

## Sources Consulted

- [Prometheus storage and Remote Write receiver endpoint](https://prometheus.io/docs/prometheus/latest/storage/#remote-storage-integrations)
- [Prometheus command-line flags](https://prometheus.io/docs/prometheus/latest/command-line/prometheus/)
- [Prometheus v3.13.1 release](https://github.com/prometheus/prometheus/releases/tag/v3.13.1)
- [Prometheus v3.13.1 receiver flag defaults and parser](https://github.com/prometheus/prometheus/blob/v3.13.1/cmd/prometheus/main.go#L459-L467)
- [Prometheus Remote Write configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus HTTP client and TLS configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#http_config)
- [Prometheus HTTPS and authentication](https://prometheus.io/docs/prometheus/latest/configuration/https/)
- [Prometheus management API](https://prometheus.io/docs/prometheus/latest/management_api/)
- [Prometheus HTTP API, including instant queries and runtime flag values](https://prometheus.io/docs/prometheus/latest/querying/api/)
- [Prometheus Remote Write 1.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec/)
- [Prometheus Remote Write 2.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/)
- [Prometheus Remote Write tuning](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus v3.13.1 Remote Write queue metrics source](https://github.com/prometheus/prometheus/blob/v3.13.1/storage/remote/queue_manager.go)
- [Prometheus v3.13.1 fanout storage source](https://github.com/prometheus/prometheus/blob/v3.13.1/storage/fanout.go)
- [Prometheus security model](https://prometheus.io/docs/operating/security/)
- [Docker Compose service and port reference](https://docs.docker.com/reference/compose-file/services/#ports)
- [Docker Compose networking reference](https://docs.docker.com/compose/how-tos/networking/)

## Issues Found

- The post advised using `prometheus --help` to determine the receiver's effective accepted-protobuf default. In v3.13.1, both the generated command reference and the binary's help output render only the first value, `prometheus.WriteRequest`, even though the source and a running server's `/api/v1/status/flags` response show both accepted message types. The text now directs readers to the runtime flags endpoint and retains the explicit repeated-flag configuration.
- The Compose example published `9091:9090`, which binds to all host interfaces by default and contradicted the claim that the receiver was kept private. The mapping is now `127.0.0.1:9091:9090`, and the surrounding description now accurately distinguishes the dedicated Compose network from the loopback-only host publication.

## Review Notes

- The Prometheus YAML examples passed `promtool check config` using the official v3.13.1 binary, and the corrected Compose excerpt passed `docker compose config` validation.
- Prometheus 3.13.2 was the latest release on the validation date and includes security dependency updates and a PromQL bug fix. The post's 3.13.1 pin remains internally consistent and explicitly tells readers to substitute a version their deployment has tested.
- Remote Write 2.0 remains marked experimental in the official specification. The post correctly leaves the sender on its v3.13.1 default, `prometheus.WriteRequest`, unless the operator deliberately selects the v2 message.
