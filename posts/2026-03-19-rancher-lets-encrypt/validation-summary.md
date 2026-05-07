# Validation Summary: How to Install Rancher with Let's Encrypt SSL Certificates

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- cert-manager
- Let's Encrypt
- NGINX Ingress Controller
- Cloudflare DNS

## Sources Consulted
- Rancher installation requirements: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Rancher install/upgrade on a Kubernetes cluster: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Helm chart options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher adding TLS secrets: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/add-tls-secrets
- Rancher chart helper logic (`cert-manager >= 1.15.0` check): https://github.com/rancher/rancher/blob/main/chart/templates/_helpers.tpl
- Rancher built-in Let's Encrypt issuer template: https://github.com/rancher/rancher/blob/main/chart/templates/ingate/issuer-letsEncrypt.yaml
- Rancher ingress template annotations/issuer wiring: https://github.com/rancher/rancher/blob/main/chart/templates/ingate/ingress.yaml
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- cert-manager HTTP-01 solver docs: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager certificate renewal behavior: https://cert-manager.io/v1.14-docs/usage/certificate/
- Let's Encrypt staging environment docs: https://letsencrypt.org/docs/staging-environment/
- Let's Encrypt documentation overview / chains of trust: https://letsencrypt.org/docs/

## Issues Found
- The post pinned cert-manager `v1.14.4`, which is too old for the current Rancher chart. Rancher's chart now checks for cert-manager `>= 1.15.0`, so I updated the install instructions to use a current cert-manager release and the current Helm-based CRD installation method.
- The post instructed readers to create `ClusterIssuer` resources manually, but Rancher's built-in `ingress.tls.source=letsEncrypt` flow creates its own namespaced `Issuer`. I removed the manual `ClusterIssuer` workflow and replaced it with the correct Rancher behavior.
- The verification step incorrectly said the certificate issuer should be `letsencrypt-production`. In Rancher's built-in flow, the relevant issuer is the namespaced `Issuer` created by the chart (named `rancher` when the release name is `rancher`). I corrected the verification commands and expectation.
- The install and upgrade commands omitted Rancher's documented `privateCA=true` / `tls-ca` requirement for new installs that use the default strict agent TLS mode starting in Rancher v2.9.0. I added the missing note, secret creation command, and Helm value.
- The DNS-01 section implied it was a drop-in replacement for Rancher's built-in Let's Encrypt mode. That was misleading because Rancher's built-in `letsEncrypt` integration uses HTTP-01. I corrected the section to explain that DNS-01 requires cert-manager to issue the certificate separately and Rancher to consume it via `ingress.tls.source=secret`.
- The troubleshooting section used a fake ACME challenge URL (`/.well-known/acme-challenge/test`), which would not validate anything useful. I replaced it with issuer/challenge inspection commands that match cert-manager's actual resources.
- The prerequisites claimed a generic Kubernetes `v1.25 or later` requirement. Rancher support is version-matrix based, not a blanket minimum across all supported releases, so I corrected the prerequisite to point to Rancher-supported Kubernetes versions.

## Review Notes
- The post is now technically accurate for the current Rancher/cert-manager flow as of 2026-05-07.
- cert-manager's official docs now recommend OCI charts for the latest releases, but Rancher's own installation docs still document the Jetstack Helm repository flow, so the updated commands remain valid.
- Let's Encrypt staging certificates are intentionally untrusted by browsers; the staging step is appropriate for ACME validation testing only.
- If readers test with Let's Encrypt staging first while using Rancher's strict agent TLS mode, the `tls-ca` secret must be updated to the production CA chain before switching Rancher to production certificates.
