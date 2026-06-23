# Validation Summary: How to Set Up OpenTelemetry for Multi-Cluster Kubernetes Tracing

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- OpenTelemetry Collector and Collector Contrib
- OpenTelemetry Go SDK and HTTP instrumentation
- Kubernetes DaemonSets, Deployments, Services, RBAC, Jobs, and NetworkPolicies
- Istio Telemetry API and OpenTelemetry tracing provider
- W3C Trace Context
- Jaeger and Grafana Tempo trace querying
- Helm and kubectl deployment workflows
- AWS Security Groups and cert-manager TLS certificates
- telemetrygen

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Contrib v0.92.0 resource detection processor docs: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/v0.92.0/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector Contrib v0.92.0 Kubernetes attributes processor docs: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/v0.92.0/processor/k8sattributesprocessor/README.md
- OpenTelemetry Collector Contrib v0.92.0 spanmetrics connector docs: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/v0.92.0/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector TLS configuration docs for v0.92.0: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector/v0.92.0/config/configtls/README.md
- OpenTelemetry bearer token auth extension docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/bearertokenauthextension/README.md
- OpenTelemetry Go instrumentation documentation: https://opentelemetry.io/docs/languages/go/instrumentation/
- OpenTelemetry Go package documentation: https://pkg.go.dev/go.opentelemetry.io/otel
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Grafana Tempo TraceQL documentation: https://grafana.com/docs/tempo/latest/traceql/
- Grafana Jaeger query editor documentation: https://grafana.com/docs/grafana/latest/datasources/jaeger/query-editor/
- OpenTelemetry telemetrygen package/image documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/telemetrygen/README.md and https://github.com/orgs/open-telemetry/packages/container/package/opentelemetry-collector-contrib%2Ftelemetrygen

## Issues Found
- The agent Collector used `docker` and `kubernetes` resource detection detectors. The pinned Collector version does not use `kubernetes` as the detector name, and the Docker detector requires a Docker socket mount that the DaemonSet did not provide. Changed the detector list to `env`, `system`, and `k8snode`.
- The Kubernetes manifests referenced `serviceAccountName: otel-collector` but did not define the ServiceAccount or RBAC needed by the Kubernetes attributes processor. Added ServiceAccount, ClusterRole, and ClusterRoleBinding resources with the required pods, namespaces, nodes, and replicasets permissions.
- The k8sattributes processor ran in agent mode without a node filter, which is not recommended for large clusters. Added `filter.node_from_env_var: K8S_NODE_NAME` to match the existing downward API environment variable.
- The W3C Trace Context example used invalid placeholder trace/span IDs. Replaced them with valid traceparent values using a 32-hex-character trace ID and 16-hex-character parent IDs.
- The Go example used `trace.SpanFromContext` and `attribute.String` without importing the required packages. Added `go.opentelemetry.io/otel/trace` and `go.opentelemetry.io/otel/attribute`.
- The Istio example used the alpha Telemetry API version and an outdated OpenTelemetry provider shape with `otel_service` plus a list-form `resource_detectors`. Updated the Telemetry resource to `telemetry.istio.io/v1`, enabled tracing through `meshConfig.enableTracing`, and changed `resource_detectors` to the documented map form.
- The federation Collector config defined spanmetrics as both a processor and connector, but the processor settings used connector-only keys. Removed the invalid processor block and wired the spanmetrics connector into the traces exporters and metrics receivers.
- The federation OTLP receiver used `require_client_auth`, which is not a valid TLS key for the pinned Collector version. Removed it; `client_ca_file` is sufficient to require and verify client certificates for mTLS in that version.
- The bearer token auth extension was loaded but not attached to the OTLP receiver, so it would not authenticate incoming telemetry. Added `auth.authenticator: bearertokenauth` to the gRPC and HTTP receiver protocols.
- The spanmetrics connector listed `service.name` as an additional dimension even though it is already a default dimension, causing Collector validation to fail. Replaced it with `service.namespace`.
- The Jaeger query examples used boolean expression syntax that Jaeger search fields do not support. Rewrote them as service and logfmt tag search examples, with separate searches for multiple cluster values.
- The telemetrygen Kubernetes Job used the Collector image with `/bin/sh` and `telemetrygen`, but that image does not provide a shell or telemetrygen binary. Replaced it with the official telemetrygen image and args-based command configuration.
- The tail sampling example attempted to match `span.kind` as a string attribute, but span kind is not a normal span attribute for `string_attribute` policies. Changed the example to match an explicit `cross_cluster=true` attribute set by instrumentation.

## Review Notes
- Collector configuration snippets for the agent and federation collector were validated with `otel/opentelemetry-collector-contrib:0.92.0 validate`.
- The Go example was compiled with current OpenTelemetry Go modules in a Go 1.25 container.
- The telemetrygen flags were checked against `ghcr.io/open-telemetry/opentelemetry-collector-contrib/telemetrygen:v0.154.0 traces --help`.
- The post still uses the older `otel/opentelemetry-collector-contrib:0.92.0` Collector image in several deployment snippets. The examples are now valid for that pinned image, but a future refresh should update the Collector version and then revisit component names, internal telemetry configuration, and spanmetrics naming for the newer release.
