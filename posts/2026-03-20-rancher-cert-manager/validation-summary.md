# Validation Summary: How to Configure cert-manager in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- cert-manager
- Helm
- Let's Encrypt / ACME
- AWS Route 53
- HashiCorp Vault
- OpenSSL
- Prometheus Operator / Rancher Monitoring

## Sources Consulted
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- cert-manager HTTP01 solver docs: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Ingress usage docs: https://cert-manager.io/docs/usage/ingress/
- cert-manager Certificate resource docs: https://cert-manager.io/docs/usage/certificate/
- cert-manager CA issuer docs: https://cert-manager.io/docs/configuration/ca/
- cert-manager Vault issuer docs: https://cert-manager.io/v1.14-docs/configuration/vault/
- cert-manager current chart values (official repo): https://raw.githubusercontent.com/cert-manager/cert-manager/master/deploy/charts/cert-manager/values.yaml
- Let's Encrypt FAQ: https://letsencrypt.org/docs/faq/
- Let's Encrypt staging environment docs: https://letsencrypt.org/docs/staging-environment/
- Let's Encrypt certificate profiles: https://letsencrypt.org/docs/profiles/
- RFC 8813, Clarifications for ECC SubjectPublicKeyInfo: https://www.rfc-editor.org/rfc/rfc8813
- Rancher monitoring docs: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring

## Issues Found
- The Helm install command used `--set installCRDs=true`, which is deprecated in the current cert-manager chart. I changed it to `--set crds.enabled=true` to match current chart values and installation docs.
- The ACME HTTP01 solver used `ingress.class: nginx`. Current cert-manager docs recommend `ingress.ingressClassName` for NGINX-style ingress controllers, so I updated both HTTP01 solver examples to `ingressClassName: nginx`.
- The staging issuer comment said Let's Encrypt staging has "no rate limits." Let's Encrypt's staging environment still has rate limits, just much higher ones, so I corrected the comment.
- The Let's Encrypt `Certificate` example requested `subject.organizations` and `client auth`. Let's Encrypt issues DV certificates, not OV/EV certificates, and current default profiles omit TLS Client Auth EKU. I removed those fields from the public ACME example.
- The ECDSA mTLS example included `key encipherment`. RFC 8813 says `keyEncipherment` and `dataEncipherment` must not be present for certificates using `id-ecPublicKey`, so I removed `key encipherment` from that example.
- The manual renewal example used `cert-manager.io/issue-temporary-certificate` as a renewal trigger. That annotation is for temporary certificates, not renewal. I replaced it with the documented `cmctl renew --namespace=production app-certificate`.
- The "Check for failed renewals" command filtered `kubectl get certificaterequests` output with `grep -v Approved`, which does not reliably identify failed or non-ready requests. I changed it to a `jq` filter that lists `CertificateRequest` objects whose `Ready` condition is not `True`.

## Review Notes
- The post uses the legacy Jetstack Helm repository install flow. cert-manager still supports it, but the current docs recommend OCI charts for recent releases.
- The `release: rancher-monitoring` label and `cattle-monitoring-system` namespace assume the default Rancher Monitoring installation names. If the monitoring stack was installed with custom names, those values must be adjusted.
- For `ClusterIssuer` resources, referenced Secrets and ServiceAccounts are resolved from cert-manager's cluster resource namespace, which is usually `cert-manager` unless the controller was installed with a different `clusterResourceNamespace`.
