# Validation Summary: Multi-Tenant OTLP Routing: Preserve Tenant Headers and Prevent Identity Spoofing

## Status
validated

## Post Type
Technical guide with NGINX and OpenTelemetry Collector configuration examples.

## Technologies Covered
- OpenTelemetry Collector Contrib and OTLP/HTTP traces
- Routing connector and OpenTelemetry Transformation Language (OTTL)
- Batch processor, OTLP HTTP exporter, and debug exporter
- Headers setter extension and request metadata propagation
- NGINX HTTPS reverse proxy and auth_request authorization
- Kubernetes Pod networking and tenant isolation

## Sources Consulted
- NGINX authorization module: https://nginx.org/en/docs/http/ngx_http_auth_request_module.html
- NGINX proxy module, including header replacement and empty-value suppression: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header
- Routing connector configuration and metadata examples: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- Headers setter extension requirements: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/headerssetterextension/README.md
- Collector HTTP client/server configuration: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md
- OTLP HTTP exporter naming and endpoint semantics: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OTLP HTTP exporter configuration source: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/config.go
- Batch processor configuration: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- Debug exporter verbosity and output: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- Collector configuration, component identifiers, pipelines, and environment substitution: https://opentelemetry.io/docs/collector/configuration/
- Kubernetes Pod network namespaces: https://kubernetes.io/docs/concepts/workloads/pods/#pod-networking
- Kubernetes Pod Security Standards, including host namespace restrictions: https://kubernetes.io/docs/concepts/security/pod-security-standards/

## Issues Found
- The deployment description treated being on the same host as sufficient for loopback connectivity. Containers on one host can have separate network namespaces. Changed the description to require a shared network namespace, with host processes and containers in one Pod as examples.
- The claim that loopback prevents another Pod from bypassing the gateway was unconditional. Host-networked Pods can share the node network namespace, and same-Pod containers share loopback access. Qualified the isolation claim and explicitly identified processes sharing the Collector network namespace as trusted.
- The isolation test instructions grouped invalid credentials and unknown accounts with requests expected to land in tenant A. Clarified that missing or repeated tenant headers with valid tenant A credentials must route to A, whereas invalid credentials and unknown accounts must receive 401 or 403 and reach neither backend.

## Review Notes
- The configuration examples required no changes. The routing connector documentation explicitly supports resource-context conditions using otelcol.client.metadata with indexed header values. Explicit resource context remains supported.
- NGINX auth_request accepts 2xx, rejects 401/403, and treats other authorization response codes as errors. auth_request_set can capture the authorization response header; proxy_set_header replaces the caller's tenant header and suppresses the incoming Authorization header when configured with an empty value.
- The supplied authorization service must enforce the documented canonical tenant mapping contract. NGINX does not independently validate the returned tenant against the routing table.
- Routing precedes batching, and separate exporters carry fixed tenant headers and backend credentials. This avoids dependence on incoming metadata surviving downstream asynchronous processing in this configuration.
- Current upstream documents otlp_http as the preferred exporter name and otlphttp as a deprecated alias. Metadata-path support must be checked against the installed Contrib release; upstream main documentation does not establish a minimum compatible release.
- The unmatched debug exporter logs record counts at basic verbosity rather than full span contents. Those diagnostic logs can be retained by the deployment's logging system. With error_mode: propagate, condition evaluation errors are returned rather than treated as ordinary nonmatches.
- The example handles OTLP/HTTP traces only. Backend URLs and credentials are deployment placeholders. No terminal commands appear in the post. The Mermaid diagram matches the described topology, and the three technical links in the post resolve to the intended official resources.
- Review was based on official documentation and configuration inspection. NGINX and otelcol-contrib are not installed locally; no live gateway, Collector, authorization service, or backend isolation test was performed.
