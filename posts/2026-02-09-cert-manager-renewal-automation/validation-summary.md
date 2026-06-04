# Validation Summary: How to Implement cert-manager Certificate Renewal Automation and Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- cert-manager
- ACME / Let's Encrypt
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule
- Grafana
- Alertmanager
- kubectl
- jq

## Sources Consulted
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/v1.15-docs/devops-tips/prometheus-metrics/
- cert-manager Helm chart values for v1.20.2: https://raw.githubusercontent.com/cert-manager/cert-manager/v1.20.2/deploy/charts/cert-manager/values.yaml
- cert-manager v1.20.2 metrics source: https://raw.githubusercontent.com/cert-manager/cert-manager/v1.20.2/pkg/metrics/metrics.go
- cert-manager v1.20.2 certificate collector source: https://raw.githubusercontent.com/cert-manager/cert-manager/v1.20.2/internal/collectors/certificate_collector.go
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Let's Encrypt rate limits: https://letsencrypt.org/docs/rate-limits/
- Let's Encrypt certificate lifetime timeline: https://letsencrypt.org/2025/12/02/from-90-to-45.html
- Let's Encrypt upcoming features: https://letsencrypt.org/ca/upcoming-features/

## Issues Found
- The post described the default `renewBefore` as "2/3 of duration" and said a 90-day certificate renews with 60 days remaining. cert-manager renews by default 2/3 through the certificate lifetime, which is 1/3 of the lifetime before expiry. Updated the wording to say 30 days remaining, or 60 days after issuance, for a 90-day certificate.
- The "Find certificates expiring soon" command did not filter for certificates expiring within 30 days. Updated the `jq` expression to compare `.status.notAfter` with `now + 30*24*60*60`.
- The Prometheus ready-status alert used `certmanager_certificate_ready_status == 0` without filtering the `condition` label. cert-manager emits one-hot values for `True`, `False`, and `Unknown`, so the unfiltered alert would fire for healthy certificates. Updated the alert and Grafana panel to use `{condition="True"}`.
- The renewal-failure alert used `increase()` on `certmanager_certificate_renewal_timestamp_seconds`, which is a gauge timestamp, not a counter. Replaced it with a check for renewal timestamps that are present and already past while the certificate is still within the renewal window.
- The expiration alerts and dashboard count could include unissued certificates with zero expiration timestamps. Added `certmanager_certificate_expiration_timestamp_seconds > time()` filters.
- The metrics list described `certmanager_certificate_renewal_timestamp_seconds` as "time until certificate renewal." Updated it to "certificate renewal time (timestamp)."
- The short-duration renewal test used Let's Encrypt staging with `duration: 24h`. Public ACME issuers such as Let's Encrypt may ignore requested short durations and issue their standard lifetime, so the example would not reliably renew after 12 hours. Updated the example to use a test issuer that honors short durations and added a caveat.
- The renewal test commands omitted the namespace even though the example Certificate is created in `default`. Added `-n default` to the watch, describe, and event commands.
- The "Automatic Secret Cleanup" section claimed cert-manager can clean up old certificate secrets after renewal and used `secretTemplate` as evidence. cert-manager updates the same target secret during renewal, and `secretTemplate` only manages labels and annotations. Updated the section to describe secret metadata and the `--enable-certificate-owner-ref` deletion behavior when a Certificate is deleted.

## Review Notes
Let's Encrypt still uses 90-day certificates for the default classic profile as of June 4, 2026, but it has announced a staged reduction to 64 days on February 10, 2027 and 45 days on February 16, 2028. Future updates should revisit examples that assume a 90-day lifetime.
