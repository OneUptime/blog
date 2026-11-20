# Validation Summary: Why `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` Overrides the Base OTLP Endpoint

## Status
validated

## Post Type
Technical troubleshooting guide with shell configuration examples and Kubernetes inspection commands.

## Technologies Covered
- OpenTelemetry SDK and OTLP exporter configuration
- OTLP over HTTP/protobuf and gRPC
- Signal-specific endpoints, protocols, and authentication headers
- OpenTelemetry Collector configuration
- Kubernetes Deployments, Pods, ConfigMaps, and instrumentation injection
- Bash environment-variable commands

## Sources Consulted
- [OpenTelemetry Protocol Exporter specification](https://opentelemetry.io/docs/specs/otel/protocol/exporter/) — endpoint precedence, HTTP URL construction, protocol settings, and headers.
- [OpenTelemetry SDK OTLP exporter configuration](https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/) — supported environment-variable names and language-dependent support.
- [OpenTelemetry Python HTTP trace exporter source documentation](https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/exporter/otlp/proto/http/trace_exporter.html) — explicit endpoint arguments and fixed HTTP exporter implementation.
- [OpenTelemetry Collector configuration](https://opentelemetry.io/docs/collector/configuration/) — exporter components and explicit environment-variable expansion.
- [OpenTelemetry Kubernetes automatic instrumentation](https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/) — injection of SDK environment variables into workloads.
- [Kubernetes kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) — resource selection, namespace flag, and YAML output.
- [Kubernetes ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/) — environment-variable configuration and restart requirements.
- [Author GitHub profile](https://github.com/nawazdhandala) — verified the author link redirects to the intended profile.

## Issues Found
No technical issues found.

## Review Notes
- Verified all four HTTP destination table entries. Signal-specific endpoints override the generic endpoint and retain their supplied path; an omitted path becomes `/`. Generic HTTP endpoints gain the appropriate signal suffix, including when a base path lacks a trailing slash.
- Confirmed the old-host example can isolate trace failures while metrics and logs use the new base URL. This assumes no additional settings override the illustrated configuration, as discussed in the post.
- Confirmed the protocol values and per-signal override behavior, the separate-destination example, and the caution against applying HTTP signal suffixes to gRPC endpoints.
- Confirmed signal-specific headers are a plausible cause of signal-specific authentication failures. HTTP 404/405 responses are diagnostic clues, not conclusive proof of a path error; the post appropriately says “suggests.”
- SDK support varies by language and exporter package. The post correctly qualifies its claims and notes that constructor configuration can take precedence. Python's documented HTTP exporter provides a concrete example of an explicit endpoint taking precedence and a manually selected exporter retaining its HTTP transport.
- Both Kubernetes commands use documented resource, namespace, and output syntax. Pod inspection can reveal injected settings, while referenced configuration and image defaults may require separate inspection. ConfigMap changes do not automatically update environment variables in running containers.
- Confirmed the distinction between SDK environment variables and Collector exporter configuration, including explicit environment expansion in Collector configuration.
- All four Bash code blocks passed `bash -n` syntax validation. No live Kubernetes requests or telemetry exports were performed: the names and endpoint hosts are illustrative and no target deployment was supplied.
- Both linked OpenTelemetry documentation pages resolved successfully. No specific SDK or Kubernetes version is asserted, and no deprecated options were identified in the examples.
- README.md was left unchanged because no technical corrections were necessary.
