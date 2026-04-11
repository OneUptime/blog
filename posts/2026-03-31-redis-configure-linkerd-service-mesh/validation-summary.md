# Validation Summary: How to Configure Redis with Linkerd Service Mesh

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Linkerd (service mesh)
- Kubernetes (StatefulSet, Services, namespaces, annotations)
- mTLS (mutual TLS)
- Prometheus (metrics/monitoring)
- Linkerd Viz extension (tap, stat, dashboard)

## Sources Consulted
- Linkerd official documentation: Getting Started / Install — https://linkerd.io/2/getting-started/
- Linkerd protocol detection and opaque ports documentation — https://linkerd.io/2/features/protocol-detection/
- Linkerd `viz tap` CLI reference — https://linkerd.io/2/reference/cli/viz/tap/
- Linkerd `viz stat` CLI reference — https://linkerd.io/2/reference/cli/viz/stat/
- Linkerd ServiceProfiles documentation — https://linkerd.io/2/features/service-profiles/
- Linkerd TCP metrics and Prometheus integration — https://linkerd.io/2/tasks/exporting-metrics/

## Issues Found

1. **Incorrect protocol detection description (line 86)**: The post said Linkerd attempts "HTTP/2 protocol detection" on non-opaque ports. Linkerd's protocol detection actually attempts to detect both HTTP/1.x and HTTP/2 traffic. Changed "HTTP/2 protocol detection" to "HTTP protocol detection."

2. **Incorrect `tap` command flag for destination namespace (lines 94-95)**: The command used `-n redis-ns` after the `--to` flag to specify the destination namespace. The `-n` flag sets the source resource namespace, and using it again would override the earlier `-n app-ns`. The correct flag for the destination namespace is `--to-namespace`. Changed `-n redis-ns` to `--to-namespace redis-ns`.

3. **Incorrect stat output showing HTTP metrics for opaque TCP traffic (lines 107-114)**: The example output showed HTTP-style metrics (SUCCESS, RPS, LATENCY_P50/P95/P99) which are not available for opaque TCP connections like Redis. Since port 6379 is configured as opaque, only TCP metrics (connection counts, bytes read/written) are reported. Replaced the output example with TCP-appropriate metrics and added the `--tcp-stats` flag to the command.

4. **Fundamentally incorrect ServiceProfile section (lines 116-134)**: The section titled "Set Up Linkerd ServiceProfiles for Circuit Breaking" was wrong in multiple ways: (a) Linkerd does not provide circuit breaking for TCP traffic; (b) ServiceProfile route conditions using `method: POST` and `pathRegex` are HTTP-only concepts that have no effect on opaque TCP traffic; (c) the section title implied a capability Linkerd doesn't have for TCP. Replaced the entire section with an accurate explanation of Linkerd's traffic management limitations for TCP/opaque protocols and guidance to implement retry/circuit-breaking logic at the application level.

5. **Inaccurate summary claims (line 150)**: The summary stated Linkerd adds "circuit breaking" and mentioned "latency percentiles and success rates" for Redis connections. Circuit breaking is not a Linkerd feature for TCP traffic, and HTTP-level metrics (latency, success rate) are not available for opaque connections. Updated the summary to accurately describe what Linkerd provides for TCP traffic (mTLS, connection counts, bytes transferred) and noted that HTTP-level features don't apply to opaque TCP.

## Review Notes
- Port 6379 has been included in Linkerd's default opaque ports list since Linkerd 2.10. The explicit annotation shown in the post is therefore redundant in newer versions, but it's still good practice for clarity and is not incorrect.
- The `linkerd.io/inject: enabled` annotation on the StatefulSet metadata (line 46) is redundant — only the pod template annotation (line 59) is used for sidecar injection. This is harmless but unnecessary.
- The Linkerd install commands use the two-step approach (`--crds` then `install`) which is correct for Linkerd 2.12+.
