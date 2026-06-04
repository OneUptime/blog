# Validation Summary: How to Identify Deprecated APIs Before Kubernetes Version Upgrades

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API deprecation policy
- Kubernetes API server audit logging
- Kubernetes API server Prometheus metrics
- Pluto
- kube-no-trouble / kubent
- Helm
- GitHub Actions
- jq
- PrometheusRule

## Sources Consulted
- Kubernetes Deprecation Policy: https://kubernetes.io/docs/reference/using-api/deprecation-policy/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes kube-apiserver Audit Configuration reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Fairwinds Pluto documentation: https://pluto.docs.fairwinds.com/
- Pluto v5.19.0 CLI help output from the official GitHub release binary
- kube-no-trouble / kubent README: https://github.com/doitintl/kube-no-trouble
- Helm get manifest documentation: https://helm.sh/docs/v3/helm/helm_get_manifest/

## Issues Found
- The Kubernetes deprecation policy description incorrectly stated a blanket 12-month or three-release removal rule and said beta APIs must exist at least 9 months before deprecation. Updated it to match the current policy: beta API versions are no longer served until at least 9 months or three minor releases after deprecation, and GA API versions are not removed within a major Kubernetes version.
- The Pluto install snippet used `chmod` without `sudo` after moving the binary into `/usr/local/bin`. Updated it to `sudo chmod`.
- Pluto JSON examples omitted `--no-footer`, which makes redirected output invalid JSON because Pluto prints a footer by default. Added `--no-footer` to JSON/report examples.
- The audit policy placed `verbs` under a `resources` entry instead of at the audit rule level. Moved `verbs` to the valid `PolicyRule` level and removed empty fields.
- The Helm release scan loop emitted `name -n namespace` and read it into two variables, causing the namespace variable to include `-n namespace`. Changed the loop to emit tab-separated release name and namespace, then call `helm get manifest "$name" -n "$ns"`.
- The GitHub Actions Pluto report step would fail before commenting when deprecated or removed APIs were found because Pluto exits non-zero by default. Added Pluto ignore flags for the reporting step and kept the explicit fail step.
- The migration report treated Pluto JSON as a top-level array and used incorrect field names. Updated the `jq` expressions to read `.items`, use `.api.kind`, `.api["replacement-api"]`, and `.api["removed-in"]`.
- The Prometheus examples used a nonexistent `deprecated="true"` label on `apiserver_request_total` and a nonexistent `client` label. Replaced them with the documented join between `apiserver_requested_deprecated_apis` and `apiserver_request_total`, and changed the dashboard panel to group by `verb`.

## Review Notes
The guide is technically relevant and useful. The examples are version-specific around Kubernetes v1.28 and Pluto v5.19.0; future refreshes should check the latest Pluto release and Kubernetes deprecation guide for newer removed API versions.
