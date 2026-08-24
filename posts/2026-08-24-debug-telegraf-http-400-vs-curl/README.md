# How to Debug Telegraf HTTP 400 Responses When the Same Request Works with curl

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telegraf, HTTP, API Integration, Debugging, Observability

Description: Compare Telegraf's real HTTP method, serialized batch, headers, compression, and runtime network path with a successful curl request.

---

An HTTP endpoint does not accept a URL in isolation. It accepts a method, query string, headers, authentication context, content encoding, and exact body. When curl returns success but `outputs.http` receives `400 Bad Request`, the two clients are almost always sending materially different requests or reaching the server through different runtime paths.

Start from what Telegraf actually sends. Its HTTP output defaults to `POST`, the Influx line-protocol serializer, batch serialization where supported, and identity content encoding. JSON is not selected automatically because an endpoint happens to end in `/metrics`.

## Make the Request Contract Explicit

For an API that documents Telegraf's standard batched JSON shape, a configuration can look like:

```toml
[[outputs.http]]
  alias = "metrics_api"
  url = "https://api.example.com/v1/metrics?tenant=platform"
  method = "POST"
  timeout = "5s"
  response_timeout = "5s"
  data_format = "json"
  use_batch_format = true
  content_encoding = "identity"

  [outputs.http.headers]
    Content-Type = "application/json"
    Accept = "application/json"
    Authorization = "@{api_secrets:authorization_header}"
```

The HTTP plugin accepts only `POST`, `PUT`, or `PATCH`. For `data_format = "json"`, InfluxData says to set `Content-Type = "application/json"` manually. Keep the headers table at the end of the plugin block because later TOML keys would otherwise become members of that table.

The plugin supports secrets for `username`, `password`, `headers`, and `cookie_auth_headers`. In this example the stored secret must be the complete header value expected by the server, such as `Bearer ...`, unless the chosen secret backend or API integration constructs it differently.

Do not copy this configuration blindly. Some APIs expect one JSON object per request, newline-delimited JSON, a custom envelope, protobuf, or line protocol. Match the endpoint's documented media type and body schema.

## Compare the Serialized Body

Telegraf's standard JSON serializer emits `name`, `tags`, `fields`, and `timestamp`. In batch mode it wraps metrics in a top-level `metrics` array. A curl test that sends a hand-written flat object is not equivalent.

Use an isolated file output with the same serializer settings to inspect the body shape:

```toml
[[outputs.file]]
  files = ["/tmp/telegraf-payload.json"]
  data_format = "json"
  use_batch_format = true
  json_timestamp_units = "1s"
```

The file output proves serialization, not HTTP framing. Batch membership can also differ if the output-specific `metric_batch_size` or filters differ. For byte-for-byte diagnosis, point a staging agent at a controlled request-capture endpoint over an approved network and inspect method, URL, headers, and raw bytes there.

Test mode does not execute outputs. Use `--once` only with the file or capture destination:

```bash
telegraf --config ./capture.conf --once
```

Never aim a diagnostic `--once` run at a production write endpoint unless the resulting write is intentional.

## Replay the Same Request with curl

Once the exact uncompressed payload is captured, make curl match Telegraf rather than comparing it with an unrelated successful example:

```bash
curl --verbose \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Accept: application/json' \
  --header "Authorization: Bearer ${API_TOKEN}" \
  --data-binary @/tmp/telegraf-payload.json \
  'https://api.example.com/v1/metrics?tenant=platform'
```

Compare the final URL including query encoding, method, header spelling and values, body bytes, and `Content-Encoding`. If Telegraf uses `content_encoding = "gzip"`, either capture and replay the compressed form or tell curl to send an equivalent gzip request; `curl --compressed` controls response decompression and does not by itself gzip the request body.

## Check the Service Runtime Path

An interactive curl command and the Telegraf service may have different DNS, proxy, certificates, network namespaces, or credentials. The HTTP output's `use_system_proxy` default is `false`; configure it or `http_proxy_url` explicitly if a proxy is required. A container's `localhost` is the container, and a systemd service may not inherit shell environment variables.

From the same service or container context, verify:

- DNS resolves the same address and SNI name;
- the CA bundle and optional client certificate are readable;
- the URL path and query parameters are identical;
- secret references resolve for the service identity; and
- a proxy or gateway is not rewriting one request but not the other.

Do not use `insecure_skip_verify = true` to solve a `400`. TLS verification failures occur before an HTTP response; weakening verification hides a separate certificate problem.

## Read the Response and Protect the Buffer

For non-2xx responses, the current HTTP output includes the status and the first response-body line in its error. Enable debug logs briefly, inspect the server's structured validation message, and redact tokens before sharing it.

By default, a failed output write returns an error and its batch remains eligible for retry through the output buffer. Repeated permanent `400` responses can therefore create backpressure. The plugin offers:

```toml
non_retryable_statuscodes = [400, 409, 413, 422]
```

Do **not** add `400` while diagnosing. For a configured non-retryable code, the plugin logs that metrics are lost and treats the write as handled, so that batch is not retried. Add only codes the API contract proves are permanently invalid and alert on the resulting loss. A `413` may instead require a smaller `metric_batch_size`; a `429` or transient gateway failure generally requires backoff and buffering rather than dropping.

Monitor `internal_write` for the HTTP output's `write_errors`, `buffer_size`, `buffer_limit`, and `metrics_dropped` while fixing the request.

## Official Documentation

- [Telegraf HTTP output plugin](https://docs.influxdata.com/telegraf/v1/output-plugins/http/)
- [Telegraf output serializers](https://docs.influxdata.com/telegraf/v1/data_formats/output/)
- [Telegraf JSON output format](https://docs.influxdata.com/telegraf/v1/data_formats/output/json/)
- [Troubleshoot Telegraf outputs](https://docs.influxdata.com/telegraf/v1/administer/troubleshoot/)
- [Monitor Telegraf internal metrics](https://docs.influxdata.com/telegraf/v1/administer/monitor/)
- [Current HTTP output status handling](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/outputs/http/http.go)

## Conclusion

Reduce a curl-versus-Telegraf discrepancy to two captured requests. Match serializer and batch shape, method, headers, encoding, credentials, and runtime network path, then use the server's response body to correct the contract. Preserve retries during diagnosis and mark a status non-retryable only when losing that invalid batch is the deliberate policy.
