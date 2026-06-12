# Validation Summary: How to Use Trivy for Kubernetes Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Trivy (Aqua Security)
- Trivy Operator
- Kubernetes
- Kyverno
- OPA Gatekeeper
- Helm
- GitHub Actions
- GitLab CI
- Prometheus
- CIS Kubernetes Benchmark
- NSA Kubernetes Hardening Guide
- Pod Security Standards

## Sources Consulted
- aquasecurity/trivy-operator Helm values: https://github.com/aquasecurity/trivy-operator/blob/main/deploy/helm/values.yaml
- aquasecurity/trivy Helm chart values: https://github.com/aquasecurity/trivy/blob/main/helm/trivy/values.yaml
- Trivy Operator docs: https://aquasecurity.github.io/trivy-operator/latest/
- Trivy Operator metrics docs: https://aquasecurity.github.io/trivy-operator/latest/tutorials/metrics/
- GitHub CodeQL Action v2 deprecation changelog (January 2025)
- CIS Kubernetes Benchmarks: https://www.cisecurity.org/benchmark/kubernetes
- NVD CVE-2023-44487 (HTTP/2 Rapid Reset)
- Kyverno policy documentation: https://kyverno.io/docs/
- OPA Gatekeeper docs: https://open-policy-agent.github.io/gatekeeper/

## Issues Found

1. **`github/codeql-action/upload-sarif@v2` is deprecated.** GitHub deprecated CodeQL Action v2 in January 2025; the current major version is `v3`. Updated the GitHub Actions example to use `@v3`.

2. **Option 3 fabricated a "Trivy Admission Webhook" Helm install.** The original section instructed `helm install trivy-admission aqua/trivy --set trivy.mode=admission`, but the `aqua/trivy` Helm chart deploys Trivy server in client-server mode and has no `admission` mode. There is no standalone Trivy admission webhook chart published by Aqua. The accompanying `trivy-admission-config` ConfigMap with `block`/`warn`/`allowlist` structure was also invented. Replaced the entire Option 3 content with an accurate approach: using the operator's real `operator.webhookBroadcastURL` value to broadcast reports to a custom service that backs a `ValidatingWebhookConfiguration`. This preserves the section structure while making it factually correct.

3. **`trivy.metrics.enabled` Helm value does not exist** in the trivy-operator chart. Metrics are exposed by the operator itself (controlled by operator-level settings, not a `trivy.metrics.enabled` flag); enabling scraping is done via `serviceMonitor.enabled`. Removed the bogus flag from the helm upgrade command in the Monitoring section.

4. **Prometheus metric names were incorrect/non-default.**
   - `trivy_vulnerability_id` exists only when `OPERATOR_METRICS_VULN_ID_ENABLED=true` is set (opt-in, high-cardinality). Replaced with the always-on `trivy_image_vulnerabilities`.
   - `trivy_configaudit_info` is not a real metric name. Replaced with `trivy_resource_configaudits`.
   - Also corrected the `resource_name` label to `name`, which is the actual label exposed by the operator's metrics.

## Review Notes

- The Kyverno policy in Option 1 is a simplified illustrative example. In practice, accessing `VulnerabilityReport` data from Kyverno requires defining a `context` block with an `apiCall` to the `aquasecurity.github.io/v1alpha1` API, then JMESPath-querying the returned items. The post's `{{ vulnerabilityreports.report.summary.criticalCount }}` shorthand will not resolve without that wiring. The example is reasonable as a sketch, but readers attempting to copy-paste should be aware that additional `context` configuration is required.
- The OPA Gatekeeper Rego in Option 2 references `critical_count` without defining how it is sourced (it would need to be fetched via Gatekeeper's external data provider or sync). Like the Kyverno example, it is an illustrative sketch rather than a complete working policy.
- CIS Kubernetes Benchmark v1.7.0 is real (released March 2023, targets Kubernetes 1.25). Newer versions (v1.8.0 through v1.10.0) cover later Kubernetes versions; readers running modern clusters should use a more recent benchmark version.
- The `trivy-operator.scanned` label used in the Kyverno precondition is illustrative — the trivy-operator does not automatically apply such a label to scanned pods; readers would need to set this up themselves or use a different mechanism (such as querying the VulnerabilityReport directly via Kyverno context).
