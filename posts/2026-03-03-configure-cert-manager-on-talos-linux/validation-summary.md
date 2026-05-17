# Validation Summary: How to Configure cert-manager on Talos Linux

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- cert-manager (v1.14.0)
- Talos Linux
- Kubernetes (CRDs, Ingress, Secrets)
- Helm 3
- Let's Encrypt / ACME (HTTP-01 and DNS-01 solvers)
- HashiCorp Vault (PKI secrets engine)
- Cloudflare DNS-01 provider
- Prometheus (cert-manager metrics)

## Sources Consulted
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- cert-manager v1.14.0 chart values.yaml: https://github.com/cert-manager/cert-manager/blob/v1.14.0/deploy/charts/cert-manager/values.yaml
- cert-manager Vault issuer docs: https://cert-manager.io/v1.14-docs/configuration/vault/
- cert-manager Prometheus metrics docs: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- cert-manager releases: https://github.com/cert-manager/cert-manager/releases
- cert-manager Helm service template (v1.14.0)

## Issues Found
1. **Incorrect Helm flag for CRD installation** — The original post used `--set crds.enabled=true` together with `--version v1.14.0`. The `crds.enabled` value was introduced in cert-manager v1.15.0; for v1.14.0 the correct value is `installCRDs=true`. Changed `--set crds.enabled=true` → `--set installCRDs=true` to match the specified chart version.

## Review Notes
- cert-manager v1.14.0 (released January 2024) is quite old for a post dated March 2026; in 2026, cert-manager v1.17–v1.19 series are current. The post would benefit from a version bump in the future, but I kept v1.14.0 intact and only corrected the flag to match that version rather than introduce new content.
- The `selfSigned: {}`, `isCA: true`, `privateKey.algorithm: ECDSA`, `size: 256`, `issuerRef.group: cert-manager.io`, and Certificate/ClusterIssuer field names all match the `cert-manager.io/v1` schema.
- The Vault issuer example using `auth.kubernetes.serviceAccountRef` with `mountPath: /v1/auth/kubernetes` is the recommended secretless approach (supported since cert-manager v1.12.0) and matches official docs.
- The Cloudflare DNS-01 solver fields (`apiTokenSecretRef.name` / `key`) and the HTTP-01 `ingress.ingressClassName` syntax are correct.
- The ingress annotations (`cert-manager.io/cluster-issuer`, `cert-manager.io/common-name`, `cert-manager.io/duration`, `cert-manager.io/renew-before`) are all valid cert-manager-supported annotations.
- The Prometheus metric names (`certmanager_certificate_ready_status`, `certmanager_certificate_expiration_timestamp_seconds`, `certmanager_certificate_renewal_timestamp_seconds`) are correct.
- The `svc/cert-manager` port-forward to port 9402 works when `prometheus.enabled=true` is set (which the install command does); otherwise readers may need to port-forward the controller pod directly.
- Best-practice note "at least 30 days for `renewBefore`" is slightly more conservative than cert-manager's default (which renews at 2/3 of the certificate's lifetime, ~30 days for a 90-day Let's Encrypt cert), but this is reasonable guidance rather than an error.
