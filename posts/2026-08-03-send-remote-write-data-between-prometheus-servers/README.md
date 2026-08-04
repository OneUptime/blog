# How to Send Remote Write Data from One Prometheus Server to Another

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Remote Write, Prometheus Receiver, Metrics, Configuration, Troubleshooting

Description: Configure a Prometheus sender and receiver safely, verify the write path, preserve source identity, and avoid loops and protocol mismatches.

---

Prometheus can send newly ingested samples to another Prometheus server through the Remote Write protocol. The receiving server must explicitly enable its write endpoint, and the sending server must target that endpoint with a compatible protobuf message.

The minimal flow is:

```text
targets -> source Prometheus -> POST /api/v1/write -> destination Prometheus TSDB
```

This is useful for a small centralization setup, a lab, or a controlled migration. Prometheus's built-in receiver is an ingestion endpoint, not a clustered long-term-storage system. For large multi-tenant deployments, evaluate a purpose-built Remote Write backend.

## Configure the Destination Prometheus

The receiver endpoint is disabled by default in current Prometheus releases. Start the destination with:

```bash
prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/prometheus \
  --web.enable-remote-write-receiver
```

The endpoint is:

```text
http://destination-prometheus:9090/api/v1/write
```

No `remote_write` block is needed on the destination merely to receive data. `remote_write` configures an outbound sender; `--web.enable-remote-write-receiver` enables inbound writes.

Prometheus v3.13.1 source configures the built-in receiver's default accepted list with both `prometheus.WriteRequest` and `io.prometheus.write.v2.Request`. The generated command reference and `prometheus --help` still display only `prometheus.WriteRequest` as the default, so neither shows the complete default for this list-valued flag. Check a running server's effective value through `/api/v1/status/flags`, and make a dual-protocol policy explicit by repeating the flag:

```bash
prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/prometheus \
  --web.enable-remote-write-receiver \
  --web.remote-write-receiver.accepted-protobuf-messages=prometheus.WriteRequest \
  --web.remote-write-receiver.accepted-protobuf-messages=io.prometheus.write.v2.Request
```

Keep the receiver private or protect it with TLS and authentication at Prometheus's web configuration or a trusted reverse proxy. Anyone allowed to call this endpoint can attempt to ingest arbitrary labeled series and consume storage.

## Configure the Source Prometheus

Add a stable source identity and the destination URL to the source configuration:

```yaml
global:
  scrape_interval: 15s
  external_labels:
    cluster: edge-london
    prometheus_replica: prometheus-0

scrape_configs:
  - job_name: node
    static_configs:
      - targets:
          - node-exporter:9100

remote_write:
  - name: central-prometheus
    url: http://destination-prometheus:9090/api/v1/write
```

The sender defaults to `prometheus.WriteRequest`, which the explicitly configured destination accepts. External labels are applied when Prometheus communicates with external systems, including Remote Write, when a series does not already contain that label. They let the destination distinguish sources that scrape equivalent `job` and `instance` label sets.

Validate and reload the source configuration:

```bash
promtool check config /etc/prometheus/prometheus.yml
curl --fail --request POST http://source-prometheus:9090/-/reload
```

The reload endpoint requires `--web.enable-lifecycle`. Without it, send `SIGHUP` or restart Prometheus using your normal service manager.

## A Docker Compose Example

The following excerpt connects both servers over a dedicated Compose network, publishes the destination only on the host's loopback interface, and gives both servers persistent storage:

```yaml
services:
  source:
    image: prom/prometheus:v3.13.1
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.path=/prometheus
    volumes:
      - ./source.yml:/etc/prometheus/prometheus.yml:ro
      - source-data:/prometheus
    networks:
      - metrics

  destination:
    image: prom/prometheus:v3.13.1
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.path=/prometheus
      - --web.enable-remote-write-receiver
    volumes:
      - ./destination.yml:/etc/prometheus/prometheus.yml:ro
      - destination-data:/prometheus
    ports:
      - "127.0.0.1:9091:9090"
    networks:
      - metrics

networks:
  metrics:

volumes:
  source-data:
  destination-data:
```

The source URL in this network is `http://destination:9090/api/v1/write`. Pin a tested Prometheus version in production rather than copying a floating tag. The example pins Prometheus 3.13.1; substitute the version your deployment has tested.

## Verify the Connection

First confirm the destination is ready from the source network:

```bash
curl --fail --show-error \
  http://destination-prometheus:9090/-/ready
```

Do not use a plain `curl` GET against `/api/v1/write` as a success test. Remote Write requires an HTTP POST containing a snappy-compressed protobuf body, so an empty or unencoded request should fail even when the route is enabled.

On the source, inspect its own Remote Write metrics:

```promql
prometheus_remote_storage_samples_pending{remote_name="central-prometheus"}
```

```promql
rate(prometheus_remote_storage_samples_failed_total{remote_name="central-prometheus"}[5m])
```

```promql
prometheus_remote_storage_queue_highest_timestamp_seconds{remote_name="central-prometheus"}
-
prometheus_remote_storage_queue_highest_sent_timestamp_seconds{remote_name="central-prometheus"}
```

The pending gauge should normally return toward zero, non-recoverable failures should not increase, and the timestamp difference should remain close to the scrape and batch delay.

Then query the destination for a series that only the source scrapes:

```bash
curl --get --fail --show-error \
  --data-urlencode 'query=up{cluster="edge-london"}' \
  http://destination-prometheus:9090/api/v1/query
```

Allow at least one scrape plus one Remote Write batch before concluding that the series is missing.

## Add Authentication and TLS

For a destination protected by a bearer token and a private certificate authority:

```yaml
remote_write:
  - name: central-prometheus
    url: https://metrics.example.net/api/v1/write
    authorization:
      type: Bearer
      credentials_file: /etc/prometheus/secrets/remote-write-token
    tls_config:
      ca_file: /etc/prometheus/pki/metrics-ca.pem
      server_name: metrics.example.net
```

Use secret files rather than embedding credentials in the main configuration. `server_name` must match a DNS name covered by the receiver certificate; it is not a way to ignore an invalid certificate.

## Avoid These Common Mistakes

### Wrong Endpoint

`/api/v1/write` receives Remote Write. `/api/v1/read` is the separate Remote Read protocol, `/api/v1/query` is the HTTP query API, and `/federate` is a scrape endpoint.

### Receiver Flag Missing

A current Prometheus without `--web.enable-remote-write-receiver` returns a not-found response explaining that the receiver must be enabled. A proxy may transform that into a different status. Check both the Prometheus flags and the proxy route.

### Protocol 2.0 Enabled Only on the Sender

This sender setting changes the protobuf schema:

```yaml
protobuf_message: io.prometheus.write.v2.Request
```

The receiver must accept that message. Prometheus v3.13.1 does so by default, but verify older Prometheus releases and other receivers. Mismatched content negotiation commonly produces HTTP 400 or 415 responses rather than a silent fallback.

### A Remote Write Loop

Do not configure A to write to B while B writes the received series back to A. Received samples enter the destination WAL and can be selected for its outbound Remote Write, creating repeated ingestion and collisions. Use `write_relabel_configs` with an origin label if a destination also forwards other data, and prove that already-forwarded series are excluded.

### Missing Source Labels

Two sources that send identical label sets describe the same series at the receiver. Add a stable cluster label and, for HA senders, a deliberate replica label. The receiving Prometheus does not invent source identity for you.

## Production Boundaries

The destination Prometheus is still a single-node TSDB. Its local storage is not clustered or replicated, and its retention and disk limits still apply. Remote Write does not turn it into an HA service, add tenancy, or deduplicate HA replicas.

For production, monitor receiver ingestion, head-series growth, disk space, out-of-order errors, and sender lag. Test a receiver restart and a network outage before depending on the path for complete history.

## Official Documentation

- [Prometheus storage and Remote Write receiver endpoint](https://prometheus.io/docs/prometheus/latest/storage/#remote-storage-integrations)
- [Prometheus command-line flags](https://prometheus.io/docs/prometheus/latest/command-line/prometheus/)
- [Prometheus v3.13.1 receiver flag defaults in source](https://github.com/prometheus/prometheus/blob/v3.13.1/cmd/prometheus/main.go#L465-L467)
- [Prometheus Remote Write configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus HTTP and TLS configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#http_config)
- [Prometheus Remote Write 1.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec/)
- [Prometheus Remote Write 2.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/)
- [Prometheus Remote Write tuning](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus local storage limitations](https://prometheus.io/docs/prometheus/latest/storage/#operational-aspects)
