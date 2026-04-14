# How to Configure JSON Log Format in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Logging, JSON, Configuration, Observability

Description: Enable and validate JSON structured log output for Dapr sidecars to enable parsing, indexing, and alerting in log aggregation platforms.

---

Dapr's default log format is plain text, which is human-readable but difficult for log aggregators to parse. Switching to JSON format enables platforms like Elasticsearch, Loki, Datadog, and Splunk to index individual log fields and run structured queries.

## Default vs JSON Log Format

Default plain text format:
```text
time="2026-03-31T10:00:00.000Z" level=info msg="component loaded" component=statestore type=state.redis
```

JSON format:
```json
{"time":"2026-03-31T10:00:00.000Z","level":"info","msg":"component loaded","component":"statestore","type":"state.redis","ver":"1.13.0"}
```

The JSON format includes additional fields like `ver` (Dapr version) and preserves proper types.

## Enabling JSON Format via Annotation

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inventory-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "inventory-service"
        dapr.io/log-as-json: "true"
```

## Enabling Globally via Helm

```bash
helm install dapr dapr/dapr \
  --namespace dapr-system \
  --set global.logAsJson=true
```

Or update an existing installation:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --reuse-values \
  --set global.logAsJson=true
```

## JSON Log Fields Reference

The standard Dapr JSON log entry contains these fields:

| Field | Type | Description |
|-------|------|-------------|
| `time` | string | ISO 8601 timestamp |
| `level` | string | debug, info, warn, error |
| `msg` | string | Log message |
| `ver` | string | Dapr runtime version |
| `type` | string | Log type (e.g., log) |
| `scope` | string | Logging scope |
| `app_id` | string | Dapr app ID |
| `instance` | string | Pod name |

Additional fields appear for specific events (e.g., `component`, `type`, `error`).

## Verifying JSON Output

```bash
# Confirm JSON format is active
kubectl logs deploy/inventory-service -c daprd | head -5 | jq .

# If jq succeeds, JSON format is working
# Example output:
# {
#   "time": "2026-03-31T10:00:00.000Z",
#   "level": "info",
#   "msg": "starting Dapr Runtime",
#   "ver": "1.13.0",
#   "app_id": "inventory-service"
# }
```

## Parsing JSON Logs with FluentD

Configure FluentD to parse Dapr JSON logs:

```yaml
<source>
  @type tail
  path /var/log/containers/*daprd*.log
  pos_file /var/log/dapr-daprd.pos
  tag dapr.sidecar
  <parse>
    @type json
    time_key time
    time_type string
    time_format %Y-%m-%dT%H:%M:%S.%NZ
  </parse>
</source>
```

## Parsing JSON Logs with Fluent Bit

```ini
[PARSER]
    Name        dapr-json
    Format      json
    Time_Key    time
    Time_Format %Y-%m-%dT%H:%M:%S.%LZ
    Time_Keep   On
    Decode_Field_As   escaped  log
```

## Querying JSON Fields in Loki

With JSON format enabled:

```text
# Filter by log level
{app="daprd"} | json | level="error"

# Filter by component name
{app="daprd"} | json | component="statestore"

# Filter by app ID
{app="daprd"} | json | app_id="order-service" | level="error"
```

## Summary

JSON log format in Dapr is enabled with the `dapr.io/log-as-json: "true"` annotation or globally via Helm. The format produces structured entries with consistent fields including time, level, message, Dapr version, and app ID. Enable JSON format before deploying log collectors like FluentD or Fluent Bit to ensure all sidecar logs are parseable, otherwise collectors will treat each line as a raw string without field indexing.
