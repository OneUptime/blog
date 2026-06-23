# Validation Summary: How to Set Up NGINX Ingress Controller with SSL/TLS Termination

## Status
validated

## Post Type
Tutorial / Guide (step-by-step deployment walkthrough)

## Technologies Covered
- NGINX Ingress Controller (ingress-nginx)
- Kubernetes (Ingress, Deployment, Service, ConfigMap, NetworkPolicy)
- Helm 3
- cert-manager (ClusterIssuer, Issuer, Certificate)
- Let's Encrypt (ACME HTTP-01 and DNS-01 challenges)
- Cloudflare DNS-01 solver
- TLS/SSL, HSTS, and HTTP security headers
- Prometheus / PrometheusRule (alerting)

## Sources Consulted
- cert-manager Helm installation docs — https://cert-manager.io/docs/installation/helm/
- cert-manager Helm chart on Artifact Hub — https://artifacthub.io/packages/helm/cert-manager/cert-manager
- cert-manager HTTP01 solver configuration — https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager ACME / DNS01 (Cloudflare) configuration — https://cert-manager.io/docs/configuration/acme/
- cert-manager annotated Ingress usage — https://cert-manager.io/docs/usage/ingress/
- ingress-nginx Helm chart and ConfigMap documentation — https://kubernetes.github.io/ingress-nginx/

## Issues Found
1. **cert-manager CRD installation flag mismatch with the pinned version.** The install command used `--version v1.14.0` together with `--set crds.enabled=true`. The `crds.enabled` parameter was only introduced in the cert-manager Helm chart in **v1.15**; versions prior to that (including v1.14.0) use `installCRDs=true`. As written, the `crds.enabled` flag would be silently ignored on v1.14.0, the CRDs would not be installed, and the rest of the tutorial (Issuers, Certificates, etc.) would fail because the custom resources would not exist.
   - **Fix:** Changed `--set crds.enabled=true` to `--set installCRDs=true` to match the pinned v1.14.0 chart.

## Review Notes
- **Deprecated `kubernetes.io/ingress.class` annotation (not changed):** The Ingress examples use the `kubernetes.io/ingress.class: nginx` annotation. This annotation has been deprecated since Kubernetes 1.18 in favor of the `spec.ingressClassName` field, but it is still honored by the NGINX Ingress Controller, so the examples remain functional. A future revision could migrate to `spec.ingressClassName: nginx`.
- **cert-manager version is older but valid:** v1.14.0 is an older release. If the post is updated to a newer cert-manager version (v1.15+), the install command should switch back to `--set crds.enabled=true`, since `installCRDs` is deprecated in those newer charts.
- **http01 solver `ingress.class` field:** The `class: nginx` field under the http01 solver is still valid in cert-manager, though `ingressClassName` is the newer recommended field. Left as-is since it remains correct.
- **`X-XSS-Protection` header:** Still syntactically correct, but the header is considered legacy/non-effective in modern browsers; a strong Content-Security-Policy (already included) is the recommended replacement. Not a technical error, so left unchanged.
- The remaining commands, manifests, ConfigMap keys, annotations (`ssl-redirect`, `permanent-redirect`, `permanent-redirect-code`, `configuration-snippet`), metric name (`certmanager_certificate_expiration_timestamp_seconds`), default ConfigMap name (`ingress-nginx-controller`), and the ~30-day default renewal behavior all verified as accurate.
