# Validation Summary: How to Configure the Observer Extension for Dynamic Service Discovery

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib observer extensions
- Receiver Creator
- Kubernetes Observer
- Docker Observer
- Host Observer
- Prometheus Receiver
- Docker Stats Receiver
- Host Metrics Receiver
- Kubernetes RBAC

## Sources Consulted
- OpenTelemetry Collector Contrib Kubernetes Observer documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/observer/k8sobserver
- OpenTelemetry Collector Contrib Receiver Creator documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/receivercreator
- OpenTelemetry Collector Contrib Docker Observer documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/observer/dockerobserver
- OpenTelemetry Collector Contrib Host Observer documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/observer/hostobserver
- OpenTelemetry Collector Contrib Docker Stats Receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/dockerstatsreceiver/README.md
- OpenTelemetry Collector Contrib Docker Stats metric documentation: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/receiver/dockerstatsreceiver/documentation.md
- OpenTelemetry Collector Contrib Host Metrics Receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Collector Debug Exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector Memory Limiter Processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector Contrib release notes: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases

## Issues Found
- The Docker observer Prometheus example targeted a custom `prometheus.port` label instead of the discovered container port. Changed the rule to require `port != 0` and the target to `` `host`:`port` `` so it uses the documented Docker observer endpoint variables.
- The host observer example matched `type == "hostport"`, but the current host observer and receiver creator examples use `type == "port"` for host-observed ports. Updated the rule accordingly.
- The host metrics example used the deprecated `hostmetrics` component ID. Updated it to the current `host_metrics` receiver name and pipeline reference.
- The Kubernetes RBAC example granted access to core `endpoints`, which is not the resource required by the Kubernetes observer documentation. Replaced it with `networking.k8s.io` `ingresses` for configurations that enable ingress observation.
- The DaemonSet example pinned `otel/opentelemetry-collector-contrib:0.93.0`, which is outdated. Updated it to `0.153.0`, the current Contrib release observed during review.
- The summary referred to "tiered observation intervals" and polling interval tuning, but the examples use scrape intervals and Kubernetes API QPS/burst controls. Updated that language to match the actual configuration fields.

## Review Notes
The Kubernetes observer is still documented as alpha and the Docker Stats receiver as alpha for metrics, so production users should pin and test a known Collector Contrib version before rollout. All YAML code blocks in the post were parsed successfully after the fixes.
