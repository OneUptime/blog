# Validation Summary: How to Configure cert-manager in Kubernetes with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- cert-manager
- ACME / Let's Encrypt
- Helm
- IPv6 / dual-stack networking
- Kubernetes Ingress
- Cloudflare DNS API

## Sources Consulted
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- cert-manager supported releases: https://cert-manager.io/docs/releases/
- cert-manager HTTP-01 solver docs: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager DNS-01 docs: https://cert-manager.io/docs/configuration/acme/dns01/
- cert-manager Cloudflare DNS01 docs: https://cert-manager.io/docs/configuration/acme/dns01/cloudflare/
- cert-manager issuer configuration docs: https://cert-manager.io/docs/configuration/
- cert-manager Certificate resource docs: https://cert-manager.io/docs/usage/certificate/
- Kubernetes dual-stack validation docs: https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- Let's Encrypt challenge types: https://letsencrypt.org/docs/challenge-types/

## Issues Found
- The Helm install example pinned cert-manager `v1.14.0`, which is EOL and no longer a supported release as of May 6, 2026. I updated the example to `v1.20.2`, the current supported patch release, and changed the CRD setting to `crds.enabled=true` to match current cert-manager Helm documentation.
- The prerequisite IPv6 verification commands were not aligned with Kubernetes' documented validation flow and included a `kube-proxy-config` lookup that is not a reliable or portable IPv6 check. I replaced them with node and pod address/CIDR checks based on the Kubernetes dual-stack validation docs.
- The DNS-01 section implied DNS-01 was specifically about missing inbound IPv4 to pods. I clarified that DNS-01 is useful because it avoids public HTTP reachability requirements and is required for wildcard certificates, which matches Let's Encrypt behavior.
- The Cloudflare DNS-01 example used `apiTokenSecretRef` together with a provider `email` field. Current cert-manager Cloudflare token examples do not use the provider email field with API tokens, so I removed it.
- The HTTP-01 example used `class: nginx` and a `podTemplate` label block in a way that suggested it controlled IPv6 exposure. That is misleading. I updated the example to use `ingressClassName: nginx`, which is the current recommended solver field for most ingress controllers, and removed the unrelated `podTemplate` block.
- The troubleshooting log command selected pods by `app=cert-manager`, which is less reliable with current chart labels. I changed it to read logs from `deploy/cert-manager` directly.
- The intro and closing explanation overstated IPv6-specific cert-manager component binding behavior. I adjusted the wording so it accurately focuses on ACME challenge reachability.

## Review Notes
- The post still uses the legacy Jetstack Helm repository. cert-manager still documents it, but the OCI chart is the recommended installation path for recent releases.
- Creating the Cloudflare API token secret in the `cert-manager` namespace is correct for a `ClusterIssuer`, because cluster-scoped issuers read referenced secrets from the cluster resource namespace by default.
- The `Certificate` example is technically valid. Using a wildcard SAN means DNS-01 is the correct validation method for that certificate request.
