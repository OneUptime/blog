# Validation Summary: How to Implement Security Benchmarking with Kubescape

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Kubescape CLI
- Kubescape Operator
- Kubernetes
- Helm
- GitHub Actions
- Prometheus / PrometheusRule
- JSON, YAML, Bash, Python

## Sources Consulted
- Kubescape getting started and installation docs: https://kubescape.io/docs/getting-started/
- Kubescape scanning docs and CLI examples: https://kubescape.io/docs/scanning/
- Kubescape CLI v4.0.9 local `scan --help`, `scan framework --help`, and `scan control --help`
- Kubescape Operator installation docs: https://kubescape.io/docs/install-operator/
- Kubescape Operator Helm chart values: https://github.com/kubescape/helm-charts/blob/main/charts/kubescape-operator/values.yaml
- Kubescape accepting risk / exceptions docs: https://kubescape.io/docs/accepting-risk/
- Kubescape exceptions examples: https://github.com/kubescape/kubescape/blob/master/examples/exceptions/README.md
- Kubescape continuous scanning docs: https://kubescape.io/docs/operator/continuous-scanning/
- Kubescape Prometheus integration docs: https://kubescape.io/docs/operator/prometheus-integration/
- Kubescape Prometheus exporter repository: https://github.com/kubescape/prometheus-exporter
- GitHub SARIF upload documentation and CodeQL Action v4 deprecation guidance: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file and https://github.blog/changelog/2025-10-28-upcoming-deprecation-of-codeql-action-v3/

## Issues Found
- Replaced `kubescape scan --submit --enable-host-scan` because current Kubescape v4.0.9 does not expose `--enable-host-scan`. Used `kubescape scan framework all --submit --scan-images`, which matches the current CLI flags for all-framework scanning and image scanning.
- Updated JSON result parsing in the Bash and Python examples. Current Kubescape JSON stores control summaries under `.summaryDetails.controls[].ResourceCounters`, not `.results[].resourcesResult`.
- Corrected the Kubescape Operator Helm values. Current chart capabilities use `enable`/`disable` values such as `continuousScan: enable` and `vulnerabilityScan: enable`; the old nested `enabled: true` keys and `scanner.frameworks` block were not valid chart values.
- Corrected persistence and Prometheus exporter values to match the current chart, including `persistence.size.backingStorage`, `persistence.size.kubevuln`, `capabilities.prometheusExporter`, `kubescape.serviceMonitor.enabled`, and `prometheusExporter.serviceMonitor.enabled`.
- Updated scan status commands to query current result resources across namespaces: `vulnerabilitymanifests -A` and `workloadconfigurationscansummaries -A`.
- Updated `github/codeql-action/upload-sarif@v2` to `@v4` and added `security-events: write` permissions for SARIF upload.
- Replaced the invalid exception ConfigMap schema with the current Kubescape exception JSON array format using `policyType`, `actions`, `resources`, and `posturePolicies`.
- Replaced non-existent Prometheus alert metric names with metrics exposed by the Kubescape Prometheus exporter, such as `kubescape_controls_total_cluster_high` and `kubescape_controls_total_cluster_critical`.

## Review Notes
- Helm was not installed in the local environment, so I could not run `helm template`; chart values were checked against the official current `values.yaml`.
- Snippet validation was performed for JSON, YAML, and Python syntax. The updated `jq` query and Python parser were also tested against a real Kubescape v4.0.9 local manifest scan result.
