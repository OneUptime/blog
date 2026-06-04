# Validation Summary: How to Set Up Kubernetes Gateway API TLSRoute for Passthrough TLS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Gateway API
- Gateway
- TLSRoute
- ReferenceGrant
- Kubernetes Services and Deployments
- NGINX TLS backend configuration
- cert-manager
- kubectl
- OpenSSL
- curl

## Sources Consulted
- Gateway API TLSRoute documentation: https://gateway-api.sigs.k8s.io/reference/api-types/tlsroute/
- Gateway API v1.5 Kubernetes release blog: https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/
- Gateway API Standard API reference: https://gateway-api.sigs.k8s.io/reference/spec/
- Gateway API hostnames documentation: https://gateway-api.sigs.k8s.io/docs/concepts/hostnames/
- Gateway API TLS configuration terminology: https://gateway-api.sigs.k8s.io/geps/gep-2907/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- Kong Ingress Controller TLS termination/passthrough documentation: https://docs.konghq.com/kubernetes-ingress-controller/latest/guides/services/tls/

## Issues Found
- Updated all TLSRoute examples from `gateway.networking.k8s.io/v1alpha2` to `gateway.networking.k8s.io/v1` because TLSRoute is GA and part of the Gateway API Standard channel as of v1.5.0; older alpha-stored TLSRoutes are not included in the v1.5 Standard YAMLs.
- Updated the ReferenceGrant example from `gateway.networking.k8s.io/v1beta1` to `gateway.networking.k8s.io/v1` to match the current Gateway API Standard reference.
- Corrected the TLS termination explanation. Gateway termination does not necessarily re-encrypt traffic to backends; Gateway API TLSRoute terminate mode forwards an unencrypted TCP stream unless backend TLS is configured separately.
- Added a Subject Alternative Name to the OpenSSL self-signed certificate command so the generated test certificate matches modern hostname validation expectations.
- Changed the cert-manager HTTP-01 solver example from `class: nginx` to `ingressClassName: nginx`, which is the recommended field for most Ingress controllers.
- Reworded weighted TLS traffic splitting to avoid claiming it is "purely random"; Gateway implementations distribute traffic according to configured weights, but the exact algorithm is implementation-specific.
- Replaced the fixed "10-30%" passthrough performance claim with implementation-dependent wording because the official specifications do not guarantee a specific latency or throughput improvement.

## Review Notes
- The GatewayClass name `kong` is implementation-specific and assumes a Kong GatewayClass exists with TLSRoute support enabled.
- Gateway API feature support can vary by controller; users should confirm their implementation supports TLSRoute, weighted backendRefs, and mixed listener modes before relying on those examples in production.
