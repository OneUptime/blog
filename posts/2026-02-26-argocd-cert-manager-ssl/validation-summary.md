# Validation Summary: How to Configure ArgoCD with cert-manager for Auto SSL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- cert-manager
- Kubernetes Ingress
- Helm
- Let's Encrypt ACME HTTP01 and DNS01 challenges
- AWS Route53
- Google Cloud DNS
- Cloudflare DNS
- Prometheus metrics

## Sources Consulted
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager ACME issuer documentation: https://cert-manager.io/docs/configuration/acme/
- cert-manager HTTP01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager DNS01 solver documentation: https://cert-manager.io/docs/configuration/acme/dns01/
- cert-manager Route53 DNS01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/route53/
- cert-manager Google CloudDNS DNS01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/google/
- cert-manager Cloudflare DNS01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/cloudflare/
- cert-manager Ingress annotations documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- Argo CD Ingress configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/

## Issues Found
- The Helm install command used the legacy Jetstack chart repository without a chart version. Current cert-manager documentation recommends the OCI chart as the source of truth for recent cert-manager versions, so the install command was updated to use `oci://quay.io/jetstack/charts/cert-manager` with version `v1.20.2`.
- The Let's Encrypt staging comment said there are "no rate limits." Let's Encrypt staging has higher limits intended for testing, not unlimited issuance, so the comment was corrected.
- The Argo CD ingress example routes traffic to service port 80 with `nginx.ingress.kubernetes.io/backend-protocol: "HTTP"`. Argo CD's documentation states that TLS-terminating ingress setups that proxy HTTP to Argo CD should run `argocd-server` with TLS disabled, so a sentence was added to make that required assumption explicit.
- The Cloudflare DNS01 example included `email` with `apiTokenSecretRef`. cert-manager's Cloudflare API token example only uses `apiTokenSecretRef`; `email` is for the global API key flow. The unnecessary `email` field was removed.
- The troubleshooting section recommended deleting the managed TLS secret to refresh a wrong certificate. cert-manager documentation recommends triggering renewal with `cmctl renew` rather than deleting the Secret, so the command was updated.

## Review Notes
- The NGINX ingress example covers HTTP/UI access through ingress TLS termination. Full Argo CD CLI gRPC support with NGINX usually needs either TLS passthrough on one hostname or a separate gRPC ingress/hostname, as described in the Argo CD ingress documentation.
- The DNS01 provider snippets are intentionally minimal and assume the appropriate cloud identity or secret setup is completed outside the shown ClusterIssuer snippets.
