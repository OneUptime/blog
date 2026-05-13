# Validation Summary: How to Configure Gateway API with TLS Termination via Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Gateway API
- Flux CD Kustomization
- cert-manager
- Let's Encrypt ACME HTTP-01 and DNS-01 challenges
- Kubernetes TLS Secrets
- kubectl, curl, and OpenSSL verification commands

## Sources Consulted
- Kubernetes Gateway API specification: https://gateway-api.sigs.k8s.io/reference/spec/
- Kubernetes Gateway API HTTP redirects and rewrites guide: https://gateway-api.sigs.k8s.io/guides/http-redirect-rewrite/
- Kubernetes Gateway API hostnames guide: https://gateway-api.sigs.k8s.io/concepts/hostnames/
- cert-manager ACME HTTP-01 Gateway API solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Gateway resource documentation: https://cert-manager.io/docs/usage/gateway/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Let's Encrypt FAQ: https://letsencrypt.org/docs/faq/

## Issues Found
- The prerequisites did not mention that cert-manager Gateway API support must be enabled for the Gateway API HTTP-01 solver. Updated the prerequisite to state this explicitly.
- The primary HTTPS listener did not specify `hostname: api.example.com`, which made the single-domain certificate/listener relationship ambiguous when combined with a wildcard listener on the same port. Added the hostname to the listener.
- The Gateway manifest included a `cert-manager.io/cluster-issuer` annotation while the guide already creates explicit `Certificate` resources. Removed the annotation to avoid mixing cert-manager Gateway shim behavior with explicit Certificate management.
- The ReferenceGrant example granted `HTTPRoute` access to a TLS Secret, but TLS certificate Secrets for listener termination are referenced by `Gateway` resources, not HTTPRoutes. Updated the text and manifest to grant a Gateway cross-namespace access to a Secret, using `gateway.networking.k8s.io/v1`.

## Review Notes
The remaining YAML examples align with current Gateway API, cert-manager, and Flux documentation. The local environment does not have `kubectl` installed, so `kubectl get` and `kubectl describe` flags were reviewed against Kubernetes CLI conventions and the post's commands could not be executed locally.
