# Validation Summary: How to Manage TLS Certificates with cert-manager in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- cert-manager
- TLS certificates
- Let's Encrypt ACME
- Helm
- AWS Route53 DNS-01
- Cloudflare DNS-01
- HashiCorp Vault PKI
- Prometheus Operator monitoring
- OpenSSL

## Sources Consulted
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager ACME HTTP-01 documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Route53 DNS-01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/route53/
- cert-manager Cloudflare DNS-01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/cloudflare/
- cert-manager Vault issuer documentation: https://cert-manager.io/docs/configuration/vault/
- cert-manager CA issuer documentation: https://cert-manager.io/docs/configuration/ca/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- cert-manager cmctl documentation: https://cert-manager.io/docs/reference/cmctl/

## Issues Found
- The static manifest install command used cert-manager v1.13.0, which is outdated. Updated it to v1.20.2 to match the current official installation documentation.
- The Helm install command used the older `installCRDs=true` value and did not pin a version. Updated it to `--version v1.20.2` and `--set crds.enabled=true`, which is the current chart value.
- The HTTP-01 solver examples used `ingress.class`. Updated them to `ingress.ingressClassName`, the currently recommended field for most ingress controllers.
- The Route53 DNS-01 example placed the AWS access key ID directly in the issuer. Updated it to use `accessKeyIDSecretRef` and added the corresponding key to the credentials Secret.
- The Vault issuer example mixed Kubernetes auth shape with a static token Secret. Updated it to use `tokenSecretRef`, matching the shown token Secret.
- The log commands used older `app=` label selectors. Updated them to current `app.kubernetes.io/name` selectors.
- The Prometheus Operator example used a ServiceMonitor shape and labels that do not match the current official cert-manager metrics example. Updated it to a PodMonitor using current cert-manager labels and `http-metrics` port.
- The manual renewal command used `cert-manager.io/issue-temporary-certificate`, which creates a temporary certificate during issuance and is not the documented manual renewal mechanism. Replaced it with `cmctl renew`.
- The production certificate snippet claimed key rotation was enabled via `secretTemplate`. Added `privateKey.rotationPolicy: Always`.
- The metric comments described a renewal timestamp as renewal attempts and an ACME request count as errors. Updated the comments to match the metric meanings.

## Review Notes
- Some examples still use placeholder credentials, domains, services, PVCs, and Vault paths. These are acceptable for a tutorial, but users must replace them with real environment-specific values and supporting RBAC/storage resources where applicable.
- The post now targets cert-manager v1.20.2. Future cert-manager releases may require another pass over installation commands and Helm values.
