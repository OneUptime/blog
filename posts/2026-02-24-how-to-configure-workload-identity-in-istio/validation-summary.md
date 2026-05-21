# Validation Summary: How to Configure Workload Identity in Istio

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Istio
- Kubernetes service accounts and deployments
- SPIFFE workload identities
- Mutual TLS
- Istio AuthorizationPolicy
- Istio PeerAuthentication
- Istio RequestAuthentication
- Istio multicluster configuration
- istioctl

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio Security Problems guide, certificate inspection example: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl describe diagnostic guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio multicluster setup guide: https://istio.io/latest/docs/setup/install/multicluster/before-you-begin/

## Issues Found
- The post configured the trust domain as `mycompany.com` but later AuthorizationPolicy examples still used `cluster.local` principals. Updated the principals to `mycompany.com/ns/production/sa/...` so they match the configured trust domain and Istio's documented principal format.
- The certificate inspection command selected `.dynamicActiveSecrets[0]`, which depends on array order. Updated it to select the secret named `default`, matching Istio's documented certificate inspection pattern.
- The text said mTLS certificate exchange happens every time two services communicate. Narrowed this to when mTLS is used, because plaintext can still be allowed depending on PeerAuthentication and traffic configuration.
- The trust domain explanation said it distinguishes identities across clusters, but the later multicluster guidance uses the same trust domain across clusters. Updated the wording to describe a consistent identity root instead.
- The PeerAuthentication explanation described identity verification too broadly. Updated it to state that PeerAuthentication controls inbound mTLS requirements.
- The STRICT mTLS wording implied every namespace request is authenticated in all cases. Updated it to refer to inbound connections accepted by matching workloads.
- The debugging section used `istioctl authn tls-check`, which is not present in the current Istio command reference. Replaced it with `istioctl x describe pod <pod-name> -n production`, which the official diagnostic guide documents for verifying strict mTLS and TLS conflicts.

## Review Notes
The examples use the current `security.istio.io/v1` APIs and valid IstioOperator fields. The `outputClaimToHeaders` RequestAuthentication field is documented as experimental, but the post uses `outputPayloadToHeader`, which is a documented stable field in the current reference.
