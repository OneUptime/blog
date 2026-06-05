# Validation Summary: How to Use the Target Allocator for Prometheus Scraping at Scale

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Operator
- OpenTelemetry Collector Prometheus receiver
- OpenTelemetry Target Allocator
- Kubernetes
- Helm
- Prometheus Operator ServiceMonitor and PodMonitor resources
- Kubernetes RBAC

## Sources Consulted
- OpenTelemetry Operator Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/operator/
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Operator README and Target Allocator examples: https://github.com/open-telemetry/opentelemetry-operator
- OpenTelemetry Target Allocator README: https://github.com/open-telemetry/opentelemetry-operator/blob/main/cmd/otel-allocator/README.md
- OpenTelemetry Operator v1beta1 API source for Target Allocator fields: https://github.com/open-telemetry/opentelemetry-operator/blob/main/apis/v1beta1/opentelemetrycollector_types.go
- OpenTelemetry Operator TargetAllocator API source: https://github.com/open-telemetry/opentelemetry-operator/blob/main/apis/v1beta1/targetallocator_types.go
- OpenTelemetry Collector Contrib Prometheus receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- Prometheus Operator API reference for ServiceMonitor and PodMonitor selectors: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post said the Target Allocator integration requires the OpenTelemetry Collector Contrib image. The Prometheus receiver is available in the current core, contrib, and Kubernetes collector distributions, and the official Operator Helm example uses the Kubernetes collector image. Updated the Helm command and explanatory text to use an image that includes the Prometheus receiver without claiming Contrib is required.
- The Target Allocator example set `image: ghcr.io/open-telemetry/opentelemetry-operator/target-allocator:latest`. Official examples omit this field and let the operator choose the matching Target Allocator image; published package examples use versioned or `main` tags rather than relying on `latest`. Removed the explicit image override.
- The `filterStrategy` comment incorrectly described a timing interval. The field controls target filtering before allocation, currently via Prometheus `relabel_config`. Updated the comment.
- The Prometheus receiver scrape config comments described the job as a required placeholder that the Target Allocator overrides. Current Operator behavior moves Prometheus scrape configs to the Target Allocator and rewrites the receiver to use `target_allocator`; for Prometheus CR discovery, the receiver can also use an empty `config`. Updated the comment to describe this accurately.
- The Target Allocator endpoint omitted the service port. Official examples use `http://<collector-name>-targetallocator:80`. Added `:80`.
- The allocation strategy section said there were two strategies and that `least-weighted` was the default. Current OpenTelemetry Operator APIs list `consistent-hashing`, `least-weighted`, and `per-node`, with `consistent-hashing` as the default. Updated the descriptions accordingly.
- The RBAC example was missing permissions included in the official minimum cluster-scoped Target Allocator RBAC, including `nodes/metrics`, `configmaps`, `ingresses`, and non-resource `/metrics`. Added those permissions.

## Review Notes
The post is technically relevant and the corrected examples are aligned with the current `opentelemetry.io/v1beta1` Operator API. Local `helm` and `kubectl` binaries were not installed in the review environment, so CLI verification was performed against official Helm chart documentation and upstream source examples rather than local `--help` output.
