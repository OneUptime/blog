# Validation Summary: How to Handle DNS Migration for Flux Managed Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD HelmRelease
- Kubernetes Ingress and Deployment resources
- ExternalDNS
- cert-manager ingress-shim
- DNS TTL and migration practices
- Route53/AWS ExternalDNS configuration
- Command-line tools: dig, curl, jq, openssl, kubectl, grep

## Sources Consulted
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- ExternalDNS Helm chart documentation: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- ExternalDNS TTL documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/advanced/ttl/
- ExternalDNS annotations documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ExternalDNS AWS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- RFC 1035 DNS TTL definition: https://www.rfc-editor.org/rfc/rfc1035
- Local CLI help/version checks for dig and openssl.

## Issues Found
- The ExternalDNS HelmRelease used the legacy `provider: aws` chart value and placed AWS settings under `aws.region` and `aws.zoneType`, which is not the current chart structure. Updated it to `provider.name: aws`, `env` for `AWS_DEFAULT_REGION`, and `extraArgs.aws-zone-type`.
- The comment above `domainFilters` said ExternalDNS would only manage records with an annotation. `domainFilters` filters by domain suffix, not by annotation. Updated the comment.
- The TTL inspection command used `dig ... | grep TTL`, but normal `dig` answer output does not include the literal string `TTL`. Replaced it with `dig +nocmd ... +noall +answer`, which displays the answer section including the TTL column.
- The TTL examples did not include `external-dns.alpha.kubernetes.io/hostname`. ExternalDNS supports TTL on Ingress resources, and adding the hostname annotation makes the intended records explicit. Added the hostname annotation to each Ingress snippet.
- The best-practice note for `external-dns.alpha.kubernetes.io/alias: "true"` incorrectly framed it as a general CNAME migration technique to reduce propagation delay. Updated it to describe its actual provider-specific alias-record behavior.
- The 301 redirect recommendation implied DNS could be removed while the redirect still helped users. Updated it to say the old DNS name should remain in place while serving the redirect.

## Review Notes
- The Ingress examples use `networking.k8s.io/v1`, `ingressClassName`, `pathType: Prefix`, and `service.port.number`, which are current and valid.
- cert-manager issuing from an annotated Ingress is correct when ingress-shim is installed and a matching `ClusterIssuer` exists.
- ExternalDNS cleanup depends on `policy: sync`, which the post sets explicitly.
- Kubernetes documents Ingress as stable but frozen and recommends Gateway API for new feature development. The post remains valid because Ingress is still supported and common for this workflow.
