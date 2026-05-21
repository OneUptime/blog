# Validation Summary: How to Create Service Dependency Maps from Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh telemetry
- Prometheus and PromQL
- Kiali graph visualization and API
- Kubernetes CronJob manifests
- Graphviz DOT
- Mermaid diagrams
- Bash, jq, and Python

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Getting Started dashboard and addons: https://istio.io/latest/docs/setup/getting-started/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio 1.20 end-of-life announcement: https://istio.io/latest/news/support/announcing-1.20-eol-final/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Prometheus promtool command-line reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Kiali topology/graph documentation: https://kiali.io/docs/features/topology/
- Kiali graph FAQ: https://kiali.io/docs/faq/graph/
- Kiali GraphNamespaces route and query parameter comments in the official Kiali repository: https://github.com/kiali/kiali
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The post said Istio provides dependency information from "two places" but listed three sources. Changed this to "three places."
- The Bash dependency-map script parsed `promtool` output as JSON-like label text even though `promtool query` defaults to PromQL text output. Changed it to request JSON with `-o json` and parse `.data.result[]` with `jq`.
- The Python Mermaid generator parsed PromQL text output manually, which was brittle and inconsistent with `promtool`'s JSON support. Changed it to request JSON output, parse labels from the JSON response, preserve destination namespaces, and sanitize Mermaid node IDs more generally.
- The Kiali install command pinned the addon manifest to Istio `release-1.20`, which is outdated. Changed it to use the `samples/addons/kiali.yaml` file from the user's installed Istio release.
- The Kiali graph API export omitted the `namespaces` query parameter even though Kiali's namespace graph endpoint is intended to graph one or more requested namespaces. Added `namespaces=default` to the example URL.
- The Graphviz generator parsed PromQL text output with regexes. Changed it to use `promtool -o json` and `jq`, matching the corrected dependency-map script.
- The CronJob example used the deprecated `sidecar.istio.io/inject` pod annotation. Changed it to the supported pod label form.

## Review Notes
The remaining examples are version-sensitive because Istio, Kiali, and their sample addons move quickly. The post now avoids pinning the Kiali addon to an old Istio branch, but production installations should still use the Kiali installation method and Istio version policy appropriate for the target cluster.
