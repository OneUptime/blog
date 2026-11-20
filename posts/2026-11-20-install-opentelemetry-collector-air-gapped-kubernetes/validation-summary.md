# Validation Summary

## Result

Passed focused source review and local validation. The article provides a gateway-only installation, explicitly removes unused chart receivers and debug output, keeps all three OTLP pipelines enabled, and separates node registry trust from Collector export trust.

## Checks Performed

- Metadata matches repository format; author and tags exist. Title: 67 characters. Description: 154 characters. Approximately 1271 whitespace-delimited words including configuration and metadata.
- Official chart index and downloaded Chart.yaml confirm chart 0.180.0 pairs with application version 0.163.2. Chart has no dependency charts.
- Chart archive SHA256 matched official index: `943dc6f7683d8f27b29dc2d7dfae9d6061b4532780807de7119765345d25e7d4`.
- Reviewed chart values and Collector Contrib v0.163.2 distribution manifest. Core exporter documentation is pinned to v0.163.0, matching the component generation used by this distribution.
- Rendered the exact article YAML with Helm v3.12.3. Parsed YAML using Ruby Psych. Result: ServiceAccount, ConfigMap, Service, Deployment; no ClusterRole or init containers. Deployment contains exactly `registry.example.internal/observability/otelcol-contrib:0.163.2`. Only OTLP ports 4317 and 4318 are declared for the container. Service-account token automount is disabled.
- Extracted the full ConfigMap data.relay configuration. Asserted only the OTLP receiver and otlp_http/oneuptime exporter remain, with logs, metrics, and traces pipelines wired to the declared processors and exporter.
- Downloaded official otelcol-contrib 0.163.2 Darwin ARM64 binary. Archive checksum matched the published `.sha256`: `ae0dff18926bc3f1e3ef4d1633c4ad4326781f302da2ba5be2ce215ba86e4b9e`. Version command confirmed 0.163.2.
- Ran `otelcol-contrib validate --config=collector.yaml` on the complete extracted configuration with loopback pod/node IPs and non-secret placeholder environment values. Exit code 0. No Collector server was started. Validation did not load the production CA file or test the ingestion key.
- All five Bash blocks passed bash syntax checking. Mermaid structure passed: seven defined nodes, six arrows, balanced quoted node labels, and valid node references. No Mermaid renderer was used.
- Generated social-media.png with the repository npm script. Confirmed 1280x720 dimensions and visually reviewed readable text, logo, margins, and no clipping.

## Limitations

No registry image was pulled or pushed, no Kubernetes deployment was installed, and no cluster API validation, CA handshake, ingestion authentication, clean-node pull, or telemetry delivery test was performed. The validation binary was Darwin ARM64, whereas the example schedules a Linux AMD64 image. Config validation is not platform/runtime testing. The chart renders the export CA path without validating its contents. Real namespace secrets, CA files, network policy, internal DNS, and registry trust remain environment prerequisites. No persistent sending queue is configured; restart and outage loss are explicitly discussed. Shared catalogs and Todo were not modified; full repository integration validation remains with the parent.

## Official Sources Checked

- [chart index](https://open-telemetry.github.io/opentelemetry-helm-charts/index.yaml)
- [Contrib release manifest](https://github.com/open-telemetry/opentelemetry-collector-releases/blob/v0.163.2/distributions/otelcol-contrib/manifest.yaml)
- [Crane pull](https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane_pull.md)
- [Crane push](https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane_push.md)
- [private-registry credentials](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/)
- [chart defaults](https://github.com/open-telemetry/opentelemetry-helm-charts/blob/opentelemetry-collector-0.180.0/charts/opentelemetry-collector/values.yaml)
- [HTTP exporter](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.163.0/exporter/otlphttpexporter/README.md)
- [`/otlp` and `x-oneuptime-token`](https://oneuptime.com/enterprise/air-gapped/observability)
- [Collector resiliency guide](https://opentelemetry.io/docs/collector/resiliency/)
- [Collector configuration guide](https://opentelemetry.io/docs/collector/configuration/)
- [Helm's documented flags](https://helm.sh/docs/v3/helm/helm_install/)
- [general SDK endpoint settings](https://opentelemetry.io/docs/specs/otel/protocol/exporter/)
- [Collector release v0.163.2](https://github.com/open-telemetry/opentelemetry-collector-releases/releases/tag/v0.163.2) — binary and checksum assets.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
