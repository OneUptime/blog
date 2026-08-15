# Feast Python vs Alpha Go Server for Non-Python Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Feast, Feature Server, Python, Go, REST API, gRPC

Description: Choose Feast's Python HTTP server for broad compatibility or evaluate the Alpha Go server behind strict capability and parity gates.

---

Non-Python applications do not need to embed the Feast Python SDK. The current Python feature server exposes JSON over HTTP so any language with an HTTP client can retrieve online features. Feast also documents a Go feature server with HTTP and gRPC, but the current page still labels it Alpha and lists a narrower API surface.

Choose from the exact versioned capabilities, not from the implementation language alone.

## Start with the Python Feature Server

The Python server is the general Feast serving surface:

```bash
feast serve --workers -1 --registry_ttl_sec 60
```

It listens on port 6566 by default and documents production controls for worker count, connections, request recycling, keep-alive, registry refresh, TLS, Prometheus metrics, and permissions.

A non-Python client sends JSON:

```http
POST /get-online-features HTTP/1.1
Content-Type: application/json

{
  "feature_service": "fraud_model_v17",
  "entities": {
    "account_id": ["a-17", "a-29"]
  }
}
```

Verify the exact request schema against the running server's OpenAPI or current documentation. Use generated or hand-written client code that preserves arrays, nulls, integer widths, timestamps, and feature statuses.

The Python server also documents push, write, materialization, document retrieval, authentication, and metrics endpoints. Expose only the endpoints a client needs and enforce network policy and authorization.

## Treat the Current Go Server as Alpha

The unversioned Feast Go feature-server page currently documents:

- Alpha status;
- HTTP/gRPC serving;
- `POST /get-online-features`;
- `GET /health`;
- OpenTelemetry tracing through `ENABLE_OTEL_TRACING='true'`;
- `entity_key_serialization_version: 3`;
- a Python transformation service dependency.

The current configuration shape is:

```yaml
entity_key_serialization_version: 3
feature_server:
  type: local
  transformation_service_endpoint: "localhost:6569"
```

The transformation service is started separately:

```python
from feast import FeatureStore

store = FeatureStore(repo_path="./feature_repo")
store.serve_transformations(6569)
```

This is important: using the current Go server does not necessarily eliminate Python from the deployment, especially when transformations are involved. Older Feast branches document different flags and supported-store claims. Do not copy `go_feature_serving: true` or another historical configuration into a current deployment without checking the pinned branch.

## Compare the Required Surface

| Requirement | Python server | Current Go server page |
| --- | --- | --- |
| non-Python online reads | documented | documented |
| JSON HTTP | documented | documented overview and endpoint |
| gRPC | not the primary online API | documented overview |
| push and materialize endpoints | documented | not in current supported API table |
| Prometheus feature freshness | documented | not listed; OpenTelemetry tracing documented |
| Python transform dependency | native process | separate transformation service documented |
| stability label | standard reference | Alpha |

This table is deliberately based on documented surfaces, not an assumption that an unlisted implementation detail is supported.

Use Python when broad API coverage, ODFV compatibility, current metrics, and operational familiarity matter. Evaluate Go when measured latency or CPU goals justify Alpha risk and the limited endpoint surface is enough.

## Run Contract and Parity Tests

Send identical requests to both servers against an isolated copy of the same registry and online data. Compare:

- full feature names and ordering;
- Feast types, arrays, nulls, and missing statuses;
- composite and aliased entity keys;
- FeatureService selection;
- ODFV results and transformation-service failure behavior;
- registry refresh after apply;
- partial multi-entity results;
- unauthorized and malformed requests.

Then benchmark p50, p95, p99, throughput, CPU, memory, and tail behavior during registry refresh and store failover. A faster median with unstable tail latency is not an automatic win.

## Put Alpha Behind a Reversible Boundary

Deploy a stable internal serving contract in front of Feast:

```text
model client -> internal feature API -> Python or Go Feast server
```

Canary the Go backend for a subset of traffic, shadow requests without using shadow values for predictions, and compare results. Keep the Python server ready for rollback. Do not expose an Alpha server directly to untrusted networks without separately proving authentication and authorization, since current Feast permission documentation specifically discusses enforcement through Python servers.

Pin the Feast server image, registry serialization version, online-store plugin, protobuf or JSON contract, and transformation service together.

## Official Documentation

- [Feast feature servers](https://docs.feast.dev/reference/feature-servers)
- [Feast Python feature server](https://docs.feast.dev/reference/feature-servers/python-feature-server)
- [Feast Alpha Go feature server](https://docs.feast.dev/reference/feature-servers/go-feature-server)
- [Feast permissions](https://docs.feast.dev/getting-started/concepts/permission)
- [Run Feast in production](https://docs.feast.dev/how-to-guides/running-feast-in-production)

## Conclusion

Use the Python feature server as the default language-neutral HTTP boundary. Evaluate the Alpha Go server only for a measured need, with the current configuration and Python transformation dependency, strict response parity tests, a narrow exposed surface, and immediate rollback.
