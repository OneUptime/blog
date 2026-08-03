# Prometheus Remote Write 405: Enable and Route the Receiver Correctly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Remote Write, HTTP 405, Receiver, Reverse Proxy, Troubleshooting

Description: Fix Remote Write method errors by enabling the Prometheus receiver, checking the POST route, and isolating proxy and path-prefix mistakes.

---

A Prometheus Remote Write sender always sends an HTTP `POST` with a compressed protobuf body. An HTTP 405 response means that some HTTP handler recognized the path but does not allow that method. That handler might be Prometheus, an ingress controller, an authentication proxy, or a completely different service reached through a bad route.

The receiver flag is the first thing to verify, but status 405 alone does not prove that the flag is missing. Current Prometheus normally returns HTTP 404 with an explanatory message when `/api/v1/write` is disabled. Proxies and older deployments can return a different status, so trace the exact hop that generated the response.

## Enable the Receiver on the Destination

Start the Prometheus that should ingest the samples with:

```bash
prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --web.enable-remote-write-receiver
```

The flag is a command-line option, not a key in `prometheus.yml`. Adding this is incorrect and will fail configuration validation:

```yaml
# Invalid: this is not a prometheus.yml setting.
web:
  enable-remote-write-receiver: true
```

The enabled endpoint is normally:

```text
POST /api/v1/write
```

The current flag defaults to disabled. Do not rely on old references to an `--enable-feature=remote-write-receiver` feature flag; use `--web.enable-remote-write-receiver`.

## Confirm the Running Process Has the Flag

Inspect the destination's runtime flags through its status API:

```bash
curl --silent --show-error \
  http://destination-prometheus:9090/api/v1/status/flags
```

Look for `web.enable-remote-write-receiver` set to `true`. Also inspect the actual process or container arguments, not only the desired manifest:

```bash
ps -ef | grep '[p]rometheus'
```

For Kubernetes:

```bash
kubectl -n monitoring get pod prometheus-0 \
  -o jsonpath='{.spec.containers[?(@.name=="prometheus")].args}'
```

If an operator or Helm chart owns the workload, add the argument through that controller's supported field. Editing the generated Pod will be temporary because the controller replaces it.

After changing arguments, restart or roll out the destination. A Prometheus configuration reload cannot change command-line flags.

## Configure the Sender with the Complete URL

On the source Prometheus:

```yaml
remote_write:
  - name: central
    url: https://metrics.example.net/api/v1/write
```

Prometheus supplies the POST method, Remote Write headers, protobuf serialization, and Snappy compression. Do not add a method or content headers manually in `prometheus.yml`.

Common wrong URLs include:

```text
https://metrics.example.net/
https://metrics.example.net/api/v1/read
https://metrics.example.net/api/v1/query
https://metrics.example.net/federate
```

Remote Read and federation are separate protocols. A working query API does not imply that the write receiver is enabled.

## Account for a Route Prefix

If Prometheus is deliberately served below a prefix, the external write URL must include the routed prefix. For example, a destination started with:

```text
--web.external-url=https://metrics.example.net/prometheus/
--web.route-prefix=/prometheus
```

is normally reached at:

```text
https://metrics.example.net/prometheus/api/v1/write
```

Make the proxy and Prometheus agree on whether the prefix is preserved or stripped. A proxy that sends `/prometheus/api/v1/write` upstream to a Prometheus expecting `/api/v1/write`, or strips a prefix Prometheus expects, can land on another handler and return 404 or 405.

## Find Which Layer Returned 405

Capture the response headers and body from the sender network:

```bash
curl --silent --show-error \
  --request POST \
  --dump-header - \
  --data-binary '' \
  https://metrics.example.net/api/v1/write
```

An empty body is not a valid Remote Write payload. Once the route is correct, a decoding-related 400 response is expected from this diagnostic request. Its purpose is to identify the HTTP handler, not to prove ingestion.

Look at:

- the `Server` and proxy-specific response headers;
- whether the body is an HTML ingress page or plain Prometheus error text;
- access logs at the ingress and destination;
- the upstream path and method recorded at each hop.

Then bypass the proxy from a trusted network:

```bash
curl --silent --show-error \
  --request POST \
  --dump-header - \
  --data-binary '' \
  http://destination-prometheus.monitoring.svc:9090/api/v1/write
```

If the direct request reaches the protobuf decoder but the public request gets 405, the receiver is enabled and the proxy route is the remaining fault domain.

## Preserve POST Through the Reverse Proxy

A minimal Nginx location can pass the endpoint without changing its method or body:

```nginx
location = /api/v1/write {
    proxy_pass http://prometheus:9090;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_read_timeout 60s;
    proxy_send_timeout 60s;
}
```

Check for rules such as `limit_except GET`, a static-site handler, an ingress path that only exposes query APIs, or an authentication component that turns unauthenticated POSTs into an unsupported redirect target. Prometheus 3.13 and newer also avoid forwarding configured credentials across redirects to a different host, so use the final same-host endpoint instead of depending on a cross-host redirect.

Do not rewrite Remote Write POST requests to GET. Do not decompress, parse, or form-encode the body at the proxy.

## Interpret Nearby Status Codes Correctly

| Status | Common meaning in this path | Next check |
| --- | --- | --- |
| 404 | Receiver disabled, bad prefix, or wrong upstream | Runtime flag and exact route |
| 405 | Recognized path rejects POST, often a proxy or wrong service | Direct-to-origin POST and access logs |
| 400 | Request reached a decoder but payload, labels, or samples are invalid | Sender logs and response body |
| 401 or 403 | Authentication or authorization failed | Sender auth and proxy policy |
| 415 | Content encoding or protobuf message is unsupported | Protocol message compatibility |
| 429 | Receiver is deliberately rate limiting | Limits, capacity, and retry policy |

A browser address-bar test sends GET and can itself produce 405. It is not representative of Prometheus Remote Write.

## Verify with the Real Sender

After fixing the destination and proxy, reload the source configuration and watch its Remote Write metrics:

```promql
rate(prometheus_remote_storage_samples_total{remote_name="central"}[5m])
```

```promql
rate(prometheus_remote_storage_samples_failed_total{remote_name="central"}[5m])
```

```promql
prometheus_remote_storage_samples_pending{remote_name="central"}
```

Send attempts should continue, non-recoverable failures should stop increasing, and pending samples should drain. Because the send-attempt counter includes retries, finally query the destination for a source-specific external label to prove ingestion.

## Secure the Enabled Endpoint

Enabling the receiver exposes an ingestion API. Put it on a private listener or protect it with authenticated TLS, restrict network sources, set receiver-side ingestion limits where available, and monitor storage growth. The built-in Prometheus receiver does not add multi-tenancy or HA by itself.

## Official Documentation

- [Prometheus command-line flags](https://prometheus.io/docs/prometheus/latest/command-line/prometheus/)
- [Prometheus storage and receiver endpoint](https://prometheus.io/docs/prometheus/latest/storage/#remote-storage-integrations)
- [Prometheus Remote Write configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus management and status API](https://prometheus.io/docs/prometheus/latest/querying/api/#flags)
- [Prometheus Remote Write 1.0 protocol](https://prometheus.io/docs/specs/prw/remote_write_spec/)
- [Prometheus Remote Write 2.0 protocol and status handling](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/)
- [Prometheus 3.13 changelog](https://github.com/prometheus/prometheus/blob/main/CHANGELOG.md#3130--2026-07-01)
