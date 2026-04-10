# Validation Summary: How to Set Up Ceph Metrics in OneUptime

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Ceph storage orchestrated via Rook on Kubernetes)
- Ceph Prometheus Manager Module (metrics exporter on port 9283)
- OpenTelemetry Collector Contrib (version 0.96.0)
- Prometheus receiver for OpenTelemetry Collector
- OTLP gRPC exporter
- OneUptime (observability platform - monitors, on-call policies, status pages)
- Kubernetes (Deployments, ConfigMaps, Services, kubectl)

## Sources Consulted
- OpenTelemetry Collector Contrib OTLP exporter documentation: the `otlp` (gRPC) exporter expects `host:port` endpoint format without a URI scheme; TLS is enabled by default (https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/otlpexporter)
- OpenTelemetry Collector Prometheus receiver documentation: scrape_configs follow standard Prometheus configuration format (https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/prometheusreceiver)
- Ceph Prometheus Module documentation: default metrics port is 9283, module enabled via `ceph mgr module enable prometheus` (https://docs.ceph.com/en/latest/mgr/prometheus/)
- Rook-Ceph documentation: Rook deploys the Ceph manager as `rook-ceph-mgr-a`, service name `rook-ceph-mgr` in the `rook-ceph` namespace (https://rook.io/docs/rook/latest/)
- OneUptime codebase: verified API endpoint paths via `@CrudApiEndpoint` route annotations in the Common/Models/DatabaseModels directory

## Issues Found

### 1. OTLP gRPC exporter endpoint format (Step 3)
- **What was wrong:** The `otlp` exporter endpoint was set to `"https://oneuptime.example.com:4317"`. The `otlp` exporter uses gRPC, which expects `host:port` format without a URI scheme. The `https://` prefix is only valid for the `otlphttp` exporter. Using a scheme prefix with the gRPC exporter can cause connection failures.
- **What was changed:** Changed endpoint from `"https://oneuptime.example.com:4317"` to `"oneuptime.example.com:4317"`. TLS is enabled by default in the OTLP gRPC exporter, so HTTPS transport is still used.
- **Why:** The OpenTelemetry Collector gRPC client config parses `host:port` directly and configures TLS separately. Including a URI scheme is incorrect per the official exporter documentation.

### 2. On-call policy API endpoint path (Step 5)
- **What was wrong:** The curl command used `/api/on-call-policy` as the endpoint path.
- **What was changed:** Corrected to `/api/on-call-duty-policy` to match the actual OneUptime API route defined via `@CrudApiEndpoint(new Route("/on-call-duty-policy"))` in the codebase.
- **Why:** The incorrect path would result in a 404 error when readers attempt to follow the tutorial.

## Review Notes
- The Rook-Ceph Prometheus module is typically enabled by default when deploying via Rook. Step 1's manual enable command is not harmful but may be unnecessary for most Rook deployments. This is worth noting but not incorrect.
- The Ceph metric names in the relabel config (`ceph_health_status`, `ceph_osd_up`, `ceph_osd_in`, `ceph_pool_bytes_used`, `ceph_pool_max_avail`, `ceph_mon_quorum_status`) are valid for current Ceph releases. Some metric names have evolved across Ceph major versions; readers on very old or very new releases should verify against their own `/metrics` endpoint output.
- The OTel Collector image version 0.96.0 is valid but will become dated over time. Readers should check for newer stable releases.
- The OneUptime API examples in Steps 4-6 use placeholder values (`<PROJECT_ID>`, etc.) which is appropriate for a tutorial, but the request body schemas are simplified representations. Actual API calls may require additional fields depending on the OneUptime version.
