# Validation Summary: How to Scan Running Kubernetes Workloads for CVEs with Kubescape

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubescape CLI
- Kubescape Operator
- Helm
- GitHub Actions
- Prometheus / Alertmanager
- jq

## Sources Consulted
- Kubescape Operator install documentation: https://kubescape.io/docs/install-operator/
- Kubescape Operator overview: https://kubescape.io/docs/operator/
- Kubescape vulnerability scanning documentation: https://kubescape.io/docs/operator/vulnerabilities/
- Kubescape continuous scanning documentation: https://kubescape.io/docs/operator/continuous-scanning/
- Kubescape scanning documentation: https://kubescape.io/docs/scanning/
- Kubescape accepting risk documentation: https://kubescape.io/docs/accepting-risk/
- Kubescape Prometheus integration documentation: https://kubescape.io/docs/operator/prometheus-integration/
- Kubescape / ARMO Prometheus exporter metric reference: https://hub.armosec.io/docs/prometheus-exporter
- Kubescape CLI v4.0.9 `scan --help`, `scan workload --help`, and `scan image --help`
- GitHub Actions checkout repository: https://github.com/actions/checkout
- GitHub Actions upload-artifact repository: https://github.com/actions/upload-artifact

## Issues Found
- The operator component description mentioned `gateway`, which is deprecated in current Kubescape operator charts. Updated it to reference the current `synchronizer`, `storage`, `kubescape`, and `kubevuln` components.
- Namespace scan examples implied image vulnerability scanning without enabling it. Added `--scan-images` to CLI namespace scan examples.
- JSON parsing examples assumed a generic `.results[]` vulnerability shape. Replaced the operator-oriented example with `VulnerabilityManifestSummary` CRD queries, and made CLI `jq` examples less dependent on a top-level `results` array.
- The continuous scanning section used an unsupported scheduler ConfigMap and an invalid `kubectl exec ... kubescape scan --enable-host-scan` command. Replaced these with documented Helm settings for `kubevulnScheduler.scanSchedule` and `capabilities.continuousScan`.
- Specific workload examples used unsupported `--include-labels` and `--include-image-registry` flags. Replaced them with supported namespace, workload, and image scan commands.
- The exceptions section used an unsupported ConfigMap format and described Kubescape CLI risk acceptance as CVE false-positive handling. Replaced it with the documented `--exceptions` file format for posture exceptions.
- The GitHub Actions workflow used deprecated action versions and a deprecated `--fail-threshold` gate. Updated to current action versions and supported Kubescape CLI output flags.
- The alerting section used an unsupported Kubescape alerts ConfigMap. Replaced it with a PrometheusRule-style example based on documented Kubescape exporter vulnerability metrics.
- The scan history section queried an undocumented storage HTTP endpoint and listed unverified metric names. Replaced it with documented CRD access and documented Prometheus integration guidance.
- The node host scanning section claimed node OS/kernel package CVE scanning and used the removed `--enable-host-scan` flag. Reframed it as host-scanner-backed node/kubelet configuration controls.
- The performance section used unsupported Helm values for scanner concurrency and cache sizing. Replaced them with supported scheduling and CLI timeout controls.

## Review Notes
Kubescape's operator vulnerability results are exposed as Kubernetes custom resources and are regularly regenerated. Long-term trend history should be handled by exporting results to a provider or metrics pipeline rather than relying on in-cluster storage as a durable history database. A local smoke test of `kubescape scan image nginx:latest --format json --output ...` on Kubescape CLI v4.0.9 completed the scan but then hit a nil-pointer panic while handling the JSON output, so the post avoids depending on that command path for its core workflow.
