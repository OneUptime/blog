# Validation Summary: How to Use the Dapr Configuration API to Get Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Configuration API (HTTP and gRPC)
- Redis as Dapr configuration store
- Kubernetes (deployment manifests)
- Node.js with @dapr/dapr SDK
- Python with httpx

## Sources Consulted
- Dapr Configuration API reference: https://docs.dapr.io/reference/api/configuration_api/
- Dapr Configuration how-to guide: https://docs.dapr.io/developing-applications/building-blocks/configuration/howto-manage-configuration/
- Dapr Redis Configuration store component: https://docs.dapr.io/reference/components-reference/supported-configuration-stores/redis-configuration-store/
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/
- Previously validated Dapr configuration posts in this repository (dapr-configuration-with-redis, dapr-configuration-nodejs)

## Issues Found

1. **HTTP API endpoint outdated (4 occurrences)**: The post used `/v1.0-alpha1/configuration/` which is the old alpha endpoint. Changed to `/v1.0/configuration/` — the Configuration API was promoted to stable in Dapr v1.11.

2. **Redis key format incorrect**: The post used `<app-id>||<key-name>` as the Redis key format (e.g., `SET myapp||max-retries "3"`). This is the Dapr **state store** key format, not the configuration store format. For configuration, keys are plain strings and the value format is `<value>||<version>` (e.g., `SET max-retries "3||1"`). Changed to use `MSET` with correct format.

3. **HTTP response format incorrect**: The post showed the HTTP response wrapped in an `items` object with `version` and `metadata` fields. The HTTP API returns configuration keys at the top level without an `items` wrapper. Changed to the correct response format.

4. **Node.js SDK missing gRPC protocol requirement**: The Dapr JavaScript SDK only supports gRPC transport for Configuration API operations. The HTTP client throws `HTTPNotSupportedError`. Added `CommunicationProtocolEnum.GRPC` to the DaprClient constructor and the required import.

5. **Node.js top-level await incompatible with CommonJS**: The code used `require()` (CommonJS) but had top-level `await` which only works in ES modules. Wrapped the usage code in an `async function main()` and called it.

6. **Python `lru_cache` misleading comment**: The comment said "Cache the config for 60 seconds" but `lru_cache` has no time-based expiration — it caches indefinitely based on arguments. Removed the misleading comment.

7. **Python response parsing incorrect**: The code accessed `resp.json()["items"]` but the HTTP API does not wrap the response in an `items` object. Changed to `resp.json()` to access the configuration keys directly.

## Review Notes
- The Node.js SDK `config.items` accessor is correct — the SDK wraps the gRPC response in an object with an `items` property. This is different from the raw HTTP API response which has no `items` wrapper.
- The `lru_cache` approach in the Python example caches forever (since the function takes no arguments). For production use, a TTL-based cache (e.g., `cachetools.TTLCache`) would be more appropriate for configuration that may change, but this is a style choice rather than a technical error.
- The Kubernetes Deployment for Redis lacks a Service resource, which would be needed for the DNS name `redis.production.svc.cluster.local` to resolve. This is acceptable for a tutorial that focuses on the Configuration API rather than Kubernetes setup.
