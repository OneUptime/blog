# Validation Summary: Secrets Management with Helm and Sealed Secrets

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Helm
- Kubernetes Secrets
- Bitnami Sealed Secrets
- kubeseal CLI
- GitOps
- Argo CD
- Flux / Kustomize
- GitHub Actions
- Prometheus Operator ServiceMonitor and PrometheusRule

## Sources Consulted
- Bitnami Sealed Secrets README: https://github.com/bitnami/sealed-secrets/blob/main/README.md
- Bitnami Sealed Secrets Helm chart values: https://github.com/bitnami/sealed-secrets/blob/main/helm/sealed-secrets/values.yaml
- Bitnami Sealed Secrets Helm repository index: https://bitnami.github.io/sealed-secrets/index.yaml
- Bitnami Sealed Secrets Prometheus mixin docs: https://github.com/bitnami/sealed-secrets/blob/main/contrib/prometheus-mixin/README.md
- Flux Sealed Secrets guide: https://fluxcd.io/flux/guides/sealed-secrets/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Helm install documentation: https://helm.sh/docs/helm/helm_install/
- Argo CD automated sync documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Helm repository URL used the old `bitnami-labs.github.io` location, which now returns a GitHub Pages error. Updated it to the current official `https://bitnami.github.io/sealed-secrets` URL.
- The Linux and GitHub Actions install snippets referenced the old `bitnami-labs/sealed-secrets` release path and pinned an outdated kubeseal version in CI. Updated both to use the current `bitnami/sealed-secrets` repository and fetch the latest release dynamically.
- The Helm production values used non-current or incorrect chart keys such as `securityContext` and `commandArgs`. Updated them to current chart values including `containerSecurityContext`, `podSecurityContext.enabled`, `keyrenewperiod`, and `updateStatus`.
- The production metrics pod annotation used port `8080`, but Sealed Secrets exposes Prometheus metrics on `8081`. Updated the annotation to `8081`.
- The raw kubeseal example included `--from-file=/dev/stdin`, which is not part of the documented raw-mode example. Removed that flag.
- The cluster-wide scope example sealed `sealed-secret.yaml` into the same file path, which would use the wrong input and risks shell truncation. Updated it to seal from `secret.yaml` into `cluster-wide-sealed-secret.yaml`.
- The key rotation section treated `--key-cutoff-time` like a duration and showed a `sealedsecrets.bitnami.com/managed` annotation as manual key rotation. Updated the section to use Helm chart values `keyrenewperiod` and `keycutofftime`, with `keycutofftime` shown as an RFC1123 timestamp and a Helm upgrade example using `date -R`.
- The ServiceMonitor example selected the chart's normal service port `http`; the chart creates a separate metrics service and ServiceMonitor endpoint named `metrics`. Updated the selector and endpoint port accordingly.

## Review Notes
The guide is technically relevant and remains valid after the targeted corrections. Sealed Secrets key renewal adds new active sealing keys; it does not delete old keys or rotate user secret values automatically, so future edits should keep that distinction explicit.
