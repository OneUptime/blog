# Validation Summary: How to Manage TLS Certificates with cert-manager on Talos

## Status
validated

## Post Type
Tutorial / Hands-on guide

## Technologies Covered
- cert-manager (Kubernetes certificate management controller)
- Talos Linux
- Kubernetes (Ingress, ClusterIssuer, Certificate CRDs)
- Helm (for installing cert-manager)
- Let's Encrypt (ACME HTTP-01 and DNS-01 challenges)
- Cloudflare (as DNS-01 provider example)
- NGINX Ingress Controller (as ingress example)
- Prometheus (for cert-manager metrics)

## Sources Consulted
- cert-manager Helm Installation docs: https://cert-manager.io/docs/installation/helm/
- cert-manager v1.15 release notes (CRDs flag rename): https://cert-manager.io/docs/releases/release-notes/release-notes-1.15/
- Cloudflare DNS-01 solver docs: https://cert-manager.io/docs/configuration/acme/dns01/cloudflare/
- HTTP-01 solver docs: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Prometheus metrics: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- cert-manager webhook troubleshooting: https://cert-manager.io/docs/troubleshooting/webhook/
- cert-manager Helm chart values.yaml on GitHub
- Let's Encrypt ACME endpoints documentation

## Issues Found
1. **Cloudflare DNS-01 solver included unnecessary `email` field with `apiTokenSecretRef`.** The `email` field is only required for the legacy API Key authentication (`apiKeySecretRef`), not for API Token authentication. Removed the `email:` line from the Cloudflare solver example to match the official cert-manager recommendation.

2. **HTTP-01 solver used legacy `class` field.** The `class: nginx` syntax under `solvers.http01.ingress` is legacy (mainly retained for `ingress-gce` compatibility). For NGINX Ingress, the modern equivalent is `ingressClassName: nginx`, which matches the Kubernetes `IngressClass` resource model and is recommended by cert-manager. Updated both the staging and production ClusterIssuer examples.

3. **Pod log label selectors used outdated labels.** The `app=cert-manager` and `app=webhook` labels are legacy and not reliably present on current chart versions. Updated to use the standard Kubernetes recommended labels `app.kubernetes.io/name=cert-manager` and `app.kubernetes.io/name=webhook`, which are set by the current Helm chart.

4. **Verification step listed pod names without ReplicaSet suffixes.** Real cert-manager pod names include a ReplicaSet hash and pod hash suffix (e.g., `cert-manager-7d8f9c5b4-abc12`). Adjusted the comment to show the name pattern rather than just the Deployment names, so readers know what to expect from `kubectl get pods`.

## Review Notes
- The `--set crds.enabled=true` flag is correct for cert-manager v1.15+. Earlier versions used `installCRDs=true`. The post does not pin a specific version, so this implicitly targets v1.15 or newer — acceptable for a current guide.
- The `prometheus.servicemonitor.enabled` (all lowercase `servicemonitor`) value in the Helm values snippet is correct as written; the chart key is intentionally lowercase.
- The Let's Encrypt staging and production ACME endpoints are both current and correct.
- The Prometheus metric names (`certmanager_certificate_ready_status`, `certmanager_certificate_expiration_timestamp_seconds`, `certmanager_certificate_renewal_timestamp_seconds`) are all valid in current cert-manager.
- The private CA bootstrap pattern (selfsigned ClusterIssuer → CA Certificate → CA ClusterIssuer) is the standard cert-manager approach and is correctly ordered for reconciliation.
- The Helm install only sets resource requests/limits for the main controller; users wanting to constrain the webhook and cainjector pods would also need `webhook.resources` and `cainjector.resources`. Not an error, just a scoping nuance worth being aware of.
