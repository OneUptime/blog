# Validation Summary: How to Automate Certificate Rotation in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- cert-manager
- Kubernetes Ingress
- TLS / X.509 certificates
- Let's Encrypt ACME
- Prometheus / Prometheus Operator
- Cloudflare DNS-01 solver example

## Sources Consulted
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- cert-manager Certificate docs: https://cert-manager.io/docs/usage/certificate/
- cert-manager Ingress usage docs: https://cert-manager.io/docs/usage/ingress/
- cert-manager cmctl reference: https://cert-manager.io/docs/reference/cmctl/
- cert-manager DNS-01 configuration docs: https://cert-manager.io/docs/configuration/acme/dns01/
- cert-manager CA issuer docs: https://cert-manager.io/docs/configuration/ca/
- cert-manager issuer configuration docs: https://cert-manager.io/docs/configuration/
- RKE2 certificate management docs: https://docs.rke2.io/security/certificates
- Rancher install/upgrade on a Kubernetes cluster: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher certificate update docs: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/update-rancher-certificate
- Rancher Helm chart options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options

## Issues Found
- The cert-manager install step used an outdated chart version and the older `installCRDs` Helm value. I updated it to the current `crds.enabled=true` installation pattern from the official cert-manager and Rancher docs.
- The HTTP-01 solver used `ingress.class`. I updated it to `ingressClassName`, which is the current field shown in cert-manager's HTTP-01 documentation.
- The post showed an explicit `Certificate` resource and an annotated Ingress that would trigger ingress-shim for the same TLS secret. I removed the Ingress annotation so the Ingress cleanly consumes the secret issued by the explicit `Certificate`.
- The Rancher rotation section incorrectly implied that annotating a `Certificate` with `cert-manager.io/issue-temporary-certificate="true"` forces renewal. That annotation is for temporary certificates, not manual renewal. I replaced it with the documented `cmctl renew` flow.
- The Rancher rotation section also incorrectly implied that deleting `tls-rancher-ingress` causes cert-manager to recreate it automatically in all cases. I corrected this to distinguish cert-manager-managed Rancher TLS from `ingress.tls.source=secret`, and I updated the secret rotation example accordingly.
- The RKE2 section checked a CA file directly with `openssl` and described manual rotation as requiring temporary cluster downtime. I replaced the expiry check with the documented `rke2 certificate check --output table` command and clarified the current documented behavior: RKE2 auto-renews client/server certificates on startup when expired or within 120 days of expiry, and HA clusters should rotate one control-plane node at a time.
- The wildcard certificate example referenced the HTTP-01 issuer from the earlier step, which would not work because wildcard certificates require DNS-01 validation. I added a separate DNS-01-capable `ClusterIssuer` example and pointed the wildcard `Certificate` at it.
- The `ClusterIssuer` examples did not mention that referenced secrets are read from cert-manager's cluster resource namespace by default. I added inline clarification because this is a common cert-manager gotcha and is explicitly called out in the docs.
- The Prometheus alert example assumed `PrometheusRule` CRDs existed. I added a prerequisite note that this step requires Prometheus Operator or `kube-prometheus-stack`.

## Review Notes
- Rancher only uses cert-manager for its own ingress certificate when `ingress.tls.source` is `rancher` or `letsEncrypt`. If Rancher is configured with `ingress.tls.source=secret`, rotation is still performed by updating Kubernetes secrets, though teams can automate that separately.
- The DNS-01 issuer example uses Cloudflare because cert-manager requires a provider-specific DNS solver configuration. Teams using Route53, Azure DNS, Google Cloud DNS, or another supported provider need to swap that solver block for the one matching their environment.
