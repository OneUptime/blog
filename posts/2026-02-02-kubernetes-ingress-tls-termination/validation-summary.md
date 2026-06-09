# Validation Summary: How to Configure Kubernetes Ingress TLS Termination

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes (Ingress, Secrets, networking.k8s.io/v1 API)
- ingress-nginx (NGINX Ingress Controller)
- cert-manager (Certificate, ClusterIssuer, HTTP-01 and DNS-01 challenges)
- Let's Encrypt (ACME v2 protocol)
- Cloudflare DNS (for DNS-01 challenge)
- Helm (for installing cert-manager and ingress-nginx)
- Prometheus / Prometheus Operator (ServiceMonitor, PrometheusRule)
- OpenSSL (for diagnostic commands)
- TLS / HTTPS / HSTS

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes TLS Secrets: https://kubernetes.io/docs/concepts/configuration/secret/#tls-secrets
- ingress-nginx annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- cert-manager HTTP-01 challenge docs: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager DNS-01 (Cloudflare) docs: https://cert-manager.io/docs/configuration/acme/dns01/cloudflare/
- cert-manager Prometheus metrics docs: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- Let's Encrypt ACME endpoints: https://letsencrypt.org/docs/acme-protocol-updates/

## Issues Found

1. **Invalid per-Ingress annotation `nginx.ingress.kubernetes.io/ssl-protocols`** — This annotation is not part of ingress-nginx's documented Ingress annotation set; `ssl-protocols` is only configurable via the controller ConfigMap (which the post already shows correctly in the hardening section). Removed the annotation from both the "Configuring Ingress with TLS" example and the "ingress-hardened.yaml" example to prevent readers from applying a no-op configuration believing they have hardened TLS at the Ingress level.

2. **Outdated cert-manager Helm flag `--set installCRDs=true`** — Current cert-manager Helm charts (v1.15+) use `--set crds.enabled=true`. Updated the install command. Also removed `--set global.leaderElection.namespace=cert-manager` since cert-manager's leader-election namespace defaults to its own install namespace and the explicit flag was redundant.

3. **Deprecated `class` field in cert-manager HTTP-01 solver** — cert-manager 1.12+ recommends `ingressClassName` over the legacy `class` field (which sets the older `kubernetes.io/ingress.class` annotation). Updated both ClusterIssuer examples (production and staging) to use `ingressClassName: nginx`.

4. **Incorrect ServiceMonitor port name** — The post used `tcp-prometheus-servicemonitor`, but the current cert-manager Helm chart exposes the metrics port under the name `http-metrics` (matching the official cert-manager Prometheus metrics docs). Updated the ServiceMonitor `endpoints[0].port` accordingly.

## Review Notes

- The `nginx.ingress.kubernetes.io/configuration-snippet` annotation used in the hardened example is valid but is **disabled by default** in ingress-nginx v1.9+ (controller flag `--enable-annotation-validation` and `allow-snippet-annotations: false` due to CVE-2021-25742). Readers may need to explicitly enable snippet annotations on their controller, or alternatively configure HSTS globally via the ConfigMap example shown earlier in the post (`hsts`, `hsts-max-age`, etc.). The post already demonstrates the ConfigMap approach so this is not a strict error.
- The deployment/configmap name `nginx-ingress-controller` used in the troubleshooting and Helm upgrade sections depends on installation method. The official `ingress-nginx/ingress-nginx` Helm chart installs resources named `<release>-ingress-nginx-controller` (e.g., `ingress-nginx-controller` for release name `ingress-nginx`). The author's chosen name works if the user installed with release name `nginx-ingress`, but it is presented generically here — readers should substitute the actual name in their cluster. Left as-is.
- The cipher list (`ECDHE-ECDSA-AES128-GCM-SHA256:...`) covers only TLSv1.2 ciphers; TLSv1.3 ciphers are negotiated separately and do not need to be listed via `ssl-ciphers`. This is correct behavior in NGINX.
- The ACME v2 endpoints (`https://acme-v02.api.letsencrypt.org/directory` and `https://acme-staging-v02.api.letsencrypt.org/directory`) are correct and current.
- The `certmanager_certificate_expiration_timestamp_seconds` metric name is correct.
- The Cloudflare DNS-01 solver configuration with `apiTokenSecretRef` and the `Zone:DNS:Edit` permission note is accurate.
