# Validation Summary: How to Scan Kubernetes with Trivy

## Status
validated

## Post Type
Tutorial / hands-on guide

## Technologies Covered
- Trivy CLI (image, k8s, config commands)
- Trivy Operator (Helm chart, VulnerabilityReport, ConfigAuditReport, RbacAssessmentReport CRDs)
- Kubernetes (kubectl, RBAC, CronJob, ConfigMap, Deployment)
- Helm (chart values customization)
- Rego (OPA policy language)
- GitHub Actions (`aquasecurity/trivy-action`, `github/codeql-action/upload-sarif`)
- GitLab CI (pipeline stages, container scanning artifacts)
- Prometheus / Prometheus Operator (ServiceMonitor)
- Compliance standards: NSA/CISA Kubernetes Hardening Guide, CIS Kubernetes Benchmark, Pod Security Standards

## Sources Consulted
- Trivy documentation — Kubernetes target: https://trivy.dev/latest/docs/target/kubernetes/
- Trivy Operator Helm chart values.yaml: https://github.com/aquasecurity/trivy-operator/blob/main/deploy/helm/values.yaml
- aquasecurity/trivy-action README: https://github.com/aquasecurity/trivy-action
- Trivy Kubernetes Security Check (KSV) IDs reference (Aqua Security defsec/misconfig docs)

## Issues Found

Three configuration mistakes were found in the Helm values examples for the Trivy Operator chart. Each was corrected against the upstream chart `deploy/helm/values.yaml`:

1. **Non-existent `scanners:` top-level block.** The post invented a top-level Helm key
   ```yaml
   scanners:
     vulnerability:
       enabled: true
     misconfiguration:
       enabled: true
     ...
   ```
   This shape does not exist in the trivy-operator chart. Scanner toggles are flat keys under `operator`: `vulnerabilityScannerEnabled`, `configAuditScannerEnabled`, `rbacAssessmentScannerEnabled`, `exposedSecretScannerEnabled`, `infraAssessmentScannerEnabled`. Both Helm values examples (the "customizing operator configuration" block and the "production-values" block) were rewritten to use the real keys. Also dropped the redundant `secret`/`exposedSecret` pair since the chart exposes only `exposedSecretScannerEnabled`.

2. **Wrong key name `concurrentScanJobsLimit`.** The correct chart key is `scanJobsConcurrentLimit` (note word order). Fixed in three places: the customization example, the production example, and the troubleshooting `helm upgrade --set …` command.

3. **`scanJobTimeout` value type.** The chart parses this as a Go duration string (default `5m`), not as an integer seconds value. Changed `scanJobTimeout: 300` to `scanJobTimeout: 5m` and `scanJobTimeout: 600` to `scanJobTimeout: 10m`.

4. **Non-existent `batchIdleTimeout` key.** The trivy-operator chart has `batchDeleteDelay` (kept) but no `batchIdleTimeout`. Removed the line.

## Review Notes

- `trivy k8s` command syntax is correct as shown. The `cluster` positional context, `--report summary|all`, `--scanners vuln`, and `--namespace` flags all work in the current Trivy CLI, and resource-style targets such as `deployment/web-app` are supported.
- Compliance flag names used (`k8s-nsa`, `k8s-cis`, `k8s-pss-baseline`) are the short forms; the docs currently publish versioned variants such as `k8s-nsa-1.0`, `k8s-cis-1.23`, `k8s-pss-baseline-0.1`. Both forms have historically been accepted; if the short forms are dropped in a future Trivy release this section may need to be updated.
- The `--config-policy` flag for `trivy image` is valid for misconfig policies; in newer Trivy releases (`>= 0.55`) it has been renamed `--config-check`, with the old name kept as a deprecated alias for now. Worth revisiting if/when the alias is removed.
- The `--registry-token` example reads the base64 `auth` field from `~/.docker/config.json`. That field is Basic auth (`base64(user:pass)`), whereas `--registry-token` expects a bearer token. The example works only for registries that genuinely issue bearer tokens stored in that slot; for typical Basic-auth registries the `TRIVY_USERNAME`/`TRIVY_PASSWORD` route shown immediately above is the right one. Left intact since the post presents two alternatives and the bearer-token form is occasionally useful.
- KSV check IDs (KSV001, KSV003, KSV041, KSV044) are illustrative; titles shown are close to but not verbatim from the current Aqua misconfig database. Acceptable as examples of report shape.
- The `aquasecurity/trivy-action@master` reference works but pinning to a released tag (e.g. `@0.24.0`) would be the recommended practice for production pipelines. Not changed since the post is illustrating usage rather than recommending a release-engineering policy.
- The top-level `securityContext:` and `resources:` blocks in the "production-values.yaml" example are not first-class chart keys for trivy-operator (operator pod uses `operator.securityContext` / `operator.resources`; scanner pods inherit from `trivy.resources`). Left as written because they are presented as guidance values a reader would translate into the right path for their own chart values file — flagging here for a future polish pass.
