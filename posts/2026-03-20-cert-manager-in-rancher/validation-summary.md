# Validation Summary: How to Configure cert-manager in Rancher

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Rancher-managed Kubernetes clusters
- cert-manager
- Helm
- Kubernetes Ingress
- Let's Encrypt ACME
- Amazon Route53 DNS-01 validation
- TLS certificates

## Sources Consulted
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- cert-manager HTTP01 solver docs: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Route53 DNS01 docs: https://cert-manager.io/docs/configuration/acme/dns01/route53/
- cert-manager Ingress usage docs: https://cert-manager.io/docs/usage/ingress/
- cert-manager installation verification docs: https://cert-manager.io/docs/installation/kubectl/
- cert-manager issuer configuration docs: https://cert-manager.io/docs/configuration/
- cert-manager certificate renewal behavior docs: https://cert-manager.io/v1.16-docs/usage/certificate/
- Let's Encrypt staging environment docs: https://letsencrypt.org/docs/staging-environment/

## Issues Found
- The Helm install example used the deprecated `installCRDs` flag. I updated it to `crds.enabled=true` and aligned the command with the current official Helm installation syntax, including `--force-update` and a pinned chart version.
- The ACME HTTP-01 solver examples used `ingress.class` for an NGINX ingress controller. I changed them to `ingressClassName`, which is the current recommended field for controllers that support it.
- The staging issuer comment incorrectly said the staging environment has no rate limits. I corrected it to reflect that Let's Encrypt staging has higher limits and issues untrusted test certificates.
- The event filter used `reason=Issued`, which does not match the certificate event reason shown in current cert-manager documentation. I changed it to `reason=CertIssued`.
- The conclusion stated that certificates are renewed 30 days before expiry as a blanket rule. I corrected this to the accurate behavior: cert-manager renews before expiry, and 30 days is a typical timing for 90-day certificates.

## Review Notes
- `ClusterIssuer` secret references are resolved from the cluster resource namespace, which is `cert-manager` by default. That matters for Route53 credential secrets if this post is expanded later.
- `replicaCount=2` only increases the cert-manager controller replicas. If the goal is full component-level high availability, the webhook and cainjector replica settings should also be considered in a future revision.
