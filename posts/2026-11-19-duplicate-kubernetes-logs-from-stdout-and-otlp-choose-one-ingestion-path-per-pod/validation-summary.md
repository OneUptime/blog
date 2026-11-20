# Validation Summary: Deduplicate Kubernetes Logs from stdout and OTLP with One Ingestion Path per Pod

## Status
validated

## Post Type
Technical troubleshooting and configuration guide.

## Technologies Covered
- Kubernetes container logging, pod log paths, and kubectl logs
- OpenTelemetry logging bridges, SDK autoconfiguration, and OTLP
- OpenTelemetry Collector File Log Receiver and container parser
- YAML configuration and Mermaid flowcharts

## Sources Consulted
- OpenTelemetry Kubernetes Collector components: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- File Log Receiver configuration and offset persistence: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/filelogreceiver
- Upstream receiver type and deprecated alias metadata: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/receiver/filelogreceiver/metadata.yaml
- Container operator configuration and Kubernetes path metadata: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/pkg/stanza/docs/operators/container.md
- SDK environment variable specification and exporter selection: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry logging architecture and logging bridges: https://opentelemetry.io/docs/specs/otel/logs/
- OTLP specification, including duplicate data on retries: https://opentelemetry.io/docs/specs/otlp/
- Collector troubleshooting and diagnostic exporters: https://opentelemetry.io/docs/collector/troubleshooting/
- Kubernetes logging architecture: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Author profile link: https://github.com/nawazdhandala

## Issues Found
- The receiver example used the deprecated `filelog` alias. Changed its configuration key to `file_log`, the current upstream component type confirmed in receiver metadata. Retained the existing compatibility guidance for pinned distributions and consistent pipeline receiver IDs. The alias remains supported, so this corrects deprecated usage rather than a universally broken configuration.

## Review Notes
- The two ingestion paths can independently deliver the same event. The diagram accurately represents this, and the warning that matching message text alone does not prove the cause is justified. OTLP retries can also produce duplicate delivery.
- `OTEL_LOGS_EXPORTER: none` is a valid string-valued environment setting for disabling automatically configured log exporters. The post correctly limits this to supporting SDK configurations and does not claim it overrides manually configured providers or disables tracing and metrics. Declarative SDK configuration can also override environment-based configuration.
- The include/exclude fields are file globs. The exclusion targets the `app` container under matching `payments` namespace and `checkout-` pod directories; other container directories, including sidecars and init containers with different names, remain eligible for collection.
- `include_file_path: true` supplies the path metadata needed by the container operator. Its operator type and ID fields are valid, and the operator supports container runtime log formats.
- The snippets are configuration fragments for an existing deployment, not complete runnable manifests. Existing host mounts, service pipelines, storage extensions, and exclusions still need to be retained, as the post explains.
- Startup messages and crash diagnostics that only reach stdout will not be recovered by excluding those files in favor of OTLP. The post correctly calls out this coverage gap.
- Persistent file offsets support recovery across agent restarts. `start_at` governs initial reading when no applicable saved offset is available; changing it does not inherently reset valid persisted offsets. Persistent offsets alone do not guarantee delivery through every downstream component.
- The linked technical references resolve to the intended official resources; the author URL redirects to the expected GitHub profile. No release version is pinned, so component support must be checked against the deployed distribution.
- Reviewed the YAML fragments and Mermaid flowchart statically against the documented fields and syntax. No live Kubernetes workload, Collector restart, or backend delivery test was performed.
