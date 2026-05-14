# Validation Summary: How to Manage mTLS Configuration with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- cert-manager
- Helm / Flux Helm Controller
- Istio
- Linkerd
- TLS / mTLS

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- cert-manager Helm installation documentation: https://cert-manager.io/v1.15-docs/installation/helm/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Linkerd automatic mTLS documentation: https://linkerd.io/2.19/features/automatic-mtls/
- Linkerd automatic control plane TLS credential rotation documentation: https://linkerd.io/2.19/tasks/automatically-rotating-control-plane-tls-credentials/
- Linkerd check CLI reference: https://linkerd.io/2.19/reference/cli/check/

## Issues Found
- The cert-manager HelmRelease placed the resource in the `cert-manager` namespace without creating that namespace first. I moved the HelmRelease to `flux-system`, added `targetNamespace: cert-manager`, and enabled `install.createNamespace`.
- The cert-manager chart version was written as `1.16.x` and used the older `installCRDs` value. I updated it to `v1.16.x` and `crds.enabled: true`, matching the cert-manager Helm chart options introduced before the stated version.
- The Istio DestinationRule used `host: "*.local"`, which was broader and less precise than the Kubernetes service FQDN pattern recommended by Istio. I changed it to `*.svc.cluster.local`.
- The Linkerd identity issuer Certificate referenced `linkerd-trust-anchor-issuer`, but that Issuer was not defined. I added the missing namespaced cert-manager `Issuer`.
- The Linkerd CA certificates included `server auth` and `client auth` extended usages. I removed those from CA certificates and kept `cert sign` / `crl sign`, which matches their CA role.
- The Linkerd certificates did not explicitly set `privateKey.rotationPolicy`. I added `rotationPolicy: Always` to avoid cert-manager v1.16 reusing private keys during renewal.
- The Flux notification examples used `notification.toolkit.fluxcd.io/v1` for Alert and Provider, but current Flux documents Alert and Provider as `v1beta3`. I updated both API versions.
- The monitoring section claimed Flux notifications monitor certificate expiry. Flux notifications report Flux reconciliation events, not certificate expiry. I corrected the section to describe reconciliation failure alerts and noted that certificate expiry should be monitored with cert-manager metrics.
- The Alert used `eventSeverity: warning`, but Flux documents `info` and `error` severity filtering. I changed it to `error`.
- The Istio validation command `istioctl authn tls-check` is no longer present in the current official istioctl command reference. I replaced it with `istioctl proxy-config clusters ... --fqdn ... -o json`.

## Review Notes
The post is technically relevant and salvageable. The examples are still high-level and assume the referenced Flux Kustomizations for `cert-manager` and `istio` exist elsewhere, but the corrected snippets now use current APIs and avoid the major broken references.
