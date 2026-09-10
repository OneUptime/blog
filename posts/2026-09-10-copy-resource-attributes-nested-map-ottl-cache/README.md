# Copy Matching Resource Attributes into a Nested Map with OTTL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpenTelemetry Collector, OTTL, Observability, Troubleshooting

Description: Copy regex-selected resource attributes into a nested log body map using OTTL cache without deleting or mutating the original resource.

Suppose your logs should contain a structured `resource_context` object with selected Kubernetes and cloud metadata. Applying `keep_matching_keys` directly to resource attributes would remove every nonmatching resource key. That changes the shared resource rather than simply building the nested copy you wanted.

Use a temporary cache map to copy the resource first, filter the copy, and then assign it to the destination. This guide uses OpenTelemetry Collector Contrib **0.160.0** and a map-valued log body.

## Define the Input and Output Shape

Assume the resource contains these attributes:

```json
{
  "service.name": "checkout",
  "k8s.namespace.name": "payments",
  "k8s.pod.name": "checkout-7c8",
  "cloud.region": "eu-west-1",
  "process.pid": 812
}
```

The log body is already structured:

```json
{"message": "payment accepted", "order_id": "o-123"}
```

The desired body gains a nested map containing the `k8s.` and `cloud.` keys. The original resource, including `service.name` and `process.pid`, must stay intact.

A dot inside an attribute key is a literal character. Copying `k8s.pod.name` into a map does not automatically create three nested maps called `k8s`, `pod`, and `name`.

## Copy Before Filtering

Configure the transformation in one explicit log group:

```yaml
processors:
  transform/resource_context:
    error_mode: ignore
    log_statements:
      - context: log
        statements:
          - set(log.cache["selected_resource"], resource.attributes)
          - keep_matching_keys(log.cache["selected_resource"], "^(k8s|cloud)\\.")
          - set(log.body["resource_context"], log.cache["selected_resource"]) where IsMap(log.body)
```

The first statement copies the resource map into cache. The second removes nonmatching keys from that copied map. The last adds the result only when the body can hold a nested map.

The [set and map editor documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md#set) and the [keep_matching_keys implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/func_keep_matching_keys.go) are useful references for these operations. Filtering is destructive to its target, which is why selecting the cache target matters.

The regular expression is anchored at the beginning. `\\.` in the OTTL string supplies an escaped dot to the regex engine. Without that escape, the dot would match any character and admit unintended keys such as `k8sXnamespace`.

## Choose a Conflict Policy

`set` replaces an existing `resource_context` value. If an application already owns that field, choose a different destination name or add an absence condition:

```yaml
processors:
  transform/resource_context_if_absent:
    error_mode: ignore
    log_statements:
      - context: log
        statements:
          - set(log.cache["selected_resource"], resource.attributes)
          - keep_matching_keys(log.cache["selected_resource"], "^(k8s|cloud)\\.")
          - set(log.body["resource_context"], log.cache["selected_resource"]) where IsMap(log.body) and log.body["resource_context"] == nil
```

That version preserves any existing field, including a malformed string value. If malformed existing values should be repaired, make that a separate documented policy rather than hiding it inside an unconditional overwrite.

For a merge, establish that the destination is a map and use `merge_maps` with an explicit conflict strategy. `insert` preserves existing keys; `upsert` replaces collisions. Keep the preparatory copy and the consuming statements in the same group because the cache is temporary processing state.

## Handle String Bodies Deliberately

A JSON-looking string is still a string. The map assignment guard skips it. If the destination requires a structured body, parse into cache, verify the result is a map, and then replace the body as a separate intentional transformation.

Do not wrap every plain text body automatically unless downstream consumers accept the new shape. A log viewer or query that expects a string can behave differently when `message` becomes a nested field.

Nested values are a natural fit for a structured log body. If you instead choose a nested attribute map, confirm that your destination preserves that representation and that it fits the attribute constraints of your instrumentation and backend. A successful Collector transformation does not guarantee identical indexing downstream.

## Verify Resource Isolation and Key Selection

Send two log records sharing one resource. Give them different messages, and include a third record with a plain string body. Inspect detailed debug output or an OTLP file export.

Expect the map bodies to gain identical selected resource copies, the string body to remain unchanged, and the shared resource to retain every original attribute. Include `k8sXnamespace` as a negative regex test and verify that it is excluded.

```bash
otelcol-contrib validate --config collector.yaml
otelcol-contrib --config collector.yaml
```

Attach `transform/resource_context` to the logs pipeline before running the fixture. Also test a resource with no matching keys: the selected map should be empty, not contain stale metadata from a previous record.

## Conclusion

Copy a resource map into cache before applying a destructive key filter. Keep the cache operations together, choose an explicit destination conflict policy, and verify that original resources remain intact. This produces a predictable nested log structure without sacrificing metadata elsewhere in the pipeline.

## Official Documentation

- [OTTL map and cache functions](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md)
- [Key filtering source](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/func_keep_matching_keys.go)
- [Log context](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/contexts/ottllog/README.md)
