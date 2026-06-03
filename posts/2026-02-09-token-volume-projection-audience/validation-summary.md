# Validation Summary: How to Configure Token Volume Projection with Audience and Expiration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes projected volumes
- Kubernetes ServiceAccounts
- Kubernetes TokenReview API
- Kubernetes ServiceAccount token issuer discovery
- Go client-go
- kubectl
- JWT inspection with shell tools

## Sources Consulted
- Kubernetes documentation: Projected Volumes - https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Kubernetes documentation: Service Accounts - https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes API reference: TokenReview - https://kubernetes.io/docs/reference/kubernetes-api/authentication-resources/token-review-v1/
- Kubernetes task documentation: Configure Service Accounts for Pods - https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Go package documentation: io/ioutil - https://pkg.go.dev/io/ioutil

## Issues Found
- The introduction described traditional ServiceAccount token mounting as if the kubelet always mounts a default token with only legacy static-token behavior. Updated the wording to distinguish default API credential mounting from explicit projected token configuration.
- The post said projected tokens "can't be used outside their intended context." Because these are bearer tokens, the stronger guarantee is that TokenRequest-issued tokens expire, are bound to the pod lifecycle, and can be audience-scoped. Updated the sentence to avoid overstating the protection.
- The Go example imported `io/ioutil` and used `ioutil.ReadFile`, which is deprecated as of Go 1.16. Replaced it with `os.ReadFile`.
- The section "Working with External OIDC Providers" incorrectly implied that Kubernetes API server OIDC settings are how projected ServiceAccount tokens integrate with external services. Updated it to describe external services trusting the cluster's ServiceAccount token issuer and validating signature, expiration, object binding, and audience.

## Review Notes
- The YAML examples use valid `projected.sources.serviceAccountToken` fields: `path`, `expirationSeconds`, and `audience`.
- `expirationSeconds: 600` is the documented minimum, and `3600` is the documented default lifetime.
- The TokenReview example correctly sets `spec.audiences` and checks `status.audiences`, which Kubernetes recommends for audience-aware validation.
