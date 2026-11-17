# How to Diagnose Repeated OTLP Exporter DeadlineExceeded Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Monitoring

Description: Separate network, protocol, payload, and backend causes of OTLP export deadlines before increasing Collector timeouts.

`DeadlineExceeded` says an export operation did not finish before its deadline. It does not identify which layer consumed the time. DNS resolution, connection establishment, TLS, an incompatible endpoint, proxy queuing, backend processing, and oversized requests can all produce similar symptoms.

Start with one failing exporter and one known-small batch. This guide uses the `otlp` gRPC exporter in Collector 0.120.0. OTLP/HTTP uses a different exporter and endpoint conventions; do not switch ports without also checking the protocol.

## Confirm the transport contract

Inspect the effective endpoint, protocol, certificate authority, and authentication headers. A gRPC endpoint usually takes `host:port`. An HTTP endpoint uses a URL and signal-specific path behavior. Port 443 alone does not tell you which protocol a vendor accepts.

```yaml
exporters:
  otlp/backend:
    endpoint: ingest.example.net:443
    timeout: 10s
    headers:
      authorization: ${env:OTLP_AUTHORIZATION}
    tls:
      ca_file: /etc/otel/backend-ca.pem
```

Do not print secrets while inspecting configuration. Check that the environment reference resolves in the actual Collector process, including during container restarts and secret rotation.

From the same network environment, inspect DNS and TLS negotiation:

```bash
getent hosts ingest.example.net
openssl s_client -connect ingest.example.net:443 \
  -servername ingest.example.net -alpn h2 </dev/null
```

Successful TLS only proves that handshake. It does not prove the OTLP service accepts your credentials or payload. Likewise, a server without gRPC reflection can reject a generic reflection probe while serving OTLP correctly.

```mermaid
flowchart LR
  Export[Export attempt] --> DNS
  DNS --> Connect[TCP and TLS]
  Connect --> Proxy[Proxy queue]
  Proxy --> Backend[OTLP processing]
  Backend --> Response
  Deadline[One attempt deadline] -.-> Export
  Deadline -.-> Response
```

## Reduce the experiment to a small request

A small batch can distinguish a general connectivity problem from payload-sensitive behavior. Keep the maximum separate from the trigger:

```yaml
processors:
  batch/diagnostic:
    timeout: 1s
    send_batch_size: 64
    send_batch_max_size: 128
```

Use the fragment only in the affected test pipeline. If small exports succeed and large exports fail, inspect proxy message limits, backend processing latency, compression cost, and large attributes. A count of 128 spans does not guarantee a small request if each span contains a huge stack trace.

Inspect queues and failures over the same interval:

```promql
max by (instance, exporter) (otelcol_exporter_queue_size)
/
max by (instance, exporter) (otelcol_exporter_queue_capacity)
```

A growing queue with successful but slow exports indicates drain capacity below arrival rate. Repeated immediate errors with an empty queue suggest a different path, such as permanent rejection or disabled queuing. Read the complete error chain and status code rather than matching one log phrase.

## Change timeouts only with evidence

Increasing an attempt timeout can help when valid exports consistently finish just beyond the current limit. It can also hold workers occupied longer and accelerate queue exhaustion. Measure the backend's successful export latency and compare it with the intended deadline.

Retry duration is a separate budget. A request may have several timed-out attempts before the total retry horizon expires. Persistent failure eventually requires a policy for discarding, storing, or rejecting records. Do not configure unlimited retries without bounding storage and observing queue growth.

During remediation, change one factor at a time: endpoint/protocol, certificates, payload size, worker concurrency, or timeout. Record accepted and exported volumes, queue drain time, and backend errors. If all gateways fail simultaneously while network checks pass, investigate the destination's ingestion capacity or rate limit before adding more exporters. Additional concurrent attempts can worsen a saturated backend and obscure the original cause.

## References

The [community question](https://stackoverflow.com/questions/74263356/why-does-the-opentelemetry-exporter-to-newrelic-is-failing) motivated this investigation. The implementation references are [official reference 1](https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector/v0.120.0/exporter/otlpexporter/README.md), [official reference 2](https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector/v0.120.0/exporter/exporterhelper/README.md), [official reference 3](https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector/v0.120.0/processor/batchprocessor/README.md).
