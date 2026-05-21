# Validation Summary: How to Use cert-manager with Istio for Certificate Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- cert-manager
- Istio
- istio-csr
- Kubernetes
- Helm
- Let's Encrypt ACME
- HashiCorp Vault issuer configuration
- Prometheus metrics

## Sources Consulted
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager supported releases documentation: https://cert-manager.io/docs/releases/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager istio-csr installation documentation: https://cert-manager.io/docs/usage/istio-csr/installation/
- cert-manager istio-csr usage documentation: https://cert-manager.io/docs/usage/istio-csr/
- cert-manager Vault issuer documentation: https://cert-manager.io/docs/configuration/vault/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- cert-manager-istio-csr Helm chart values on Artifact Hub: https://artifacthub.io/packages/helm/cert-manager/cert-manager-istio-csr
- Istio Gateway credential analysis documentation: https://istio.io/latest/docs/reference/config/analysis/ist0161/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The cert-manager install command used v1.14.0, which is no longer a currently supported release. Updated it to v1.20.2, matching the current cert-manager install documentation.
- The ACME HTTP-01 examples used `ingress.class: istio`. Updated them to `ingress.ingressClassName: istio`, which is the recommended field for cert-manager 1.12 and newer.
- The gateway Certificate used `commonName` for a DNS name. Removed it and left the DNS identities in `dnsNames`, matching current cert-manager guidance to avoid `commonName` for leaf certificate DNS names.
- The Istio Gateway only listed `*.example.com` even though the Certificate also requested `example.com`. Added `example.com` to the HTTP and HTTPS Gateway hosts so the Gateway can serve all requested names.
- The istio-csr installation flow installed istio-csr before defining the issuer it referenced, used a release name that did not match the later `caAddress`, used older `app.certmanager.issuerRef.*` values, and omitted the root CA volume mount required by the configured `app.tls.rootCAFile`. Reordered the section, aligned the release/service name, updated the Helm values to `app.certmanager.issuer.*`, and added the root CA secret mount.
- The overview did not mention that istio-csr must be planned before installing Istio. Added the official caveat that installing istio-csr after Istio is unsupported.
- The IstioOperator example included an undefined root CA ConfigMap overlay. Replaced it with the documented core settings: `caAddress`, `ENABLE_CA_SERVER=false`, and the matching trust domain.
- The verification command checked `CertificateRequest` resources in `cert-manager`, but istio-csr creates workload CertificateRequests in `istio-system` by default. Updated the namespace.
- The Vault-backed issuer example omitted `serviceAccountRef` for Kubernetes auth. Added it to match the current cert-manager Vault issuer configuration.
- The Prometheus metric comment described `certmanager_certificate_renewal_timestamp_seconds` as tracking renewal failures. Changed the comment to say it monitors the next renewal time.

## Review Notes
The post is technically relevant and salvageable. The examples are still abbreviated and require users to provide real CA material, DNS, RBAC, Vault roles, and Istio installation commands for their environment. `kubectl` and `helm` were not installed in the local workspace, so CLI behavior was verified against official documentation rather than local command help.
