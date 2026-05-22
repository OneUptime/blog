# Validation Summary: How to Configure All AuthorizationPolicy Fields in Istio

## Status
validated

## Post Type
Technical guide / reference

## Technologies Covered
- Istio AuthorizationPolicy
- Istio security APIs
- Kubernetes custom resources
- Envoy external authorization
- JWT-based authorization

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio External Authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/
- Istio Go API metadata for AuthorizationPolicy versions: https://pkg.go.dev/istio.io/api/security/v1

## Issues Found
- Updated AuthorizationPolicy examples from `security.istio.io/v1beta1` to the current documented `security.istio.io/v1` API version.
- Fixed the top-level example so it no longer combines mutually exclusive or action-specific fields incorrectly. `provider` is shown with `action: CUSTOM`, and `targetRefs` is shown separately from `selector`.
- Corrected `targetRef` to `targetRefs`, matching the current Istio field name, and clarified the supported attachment resource types.
- Corrected the empty rules explanation. In Istio, omitted `rules` means no rule can match; an empty rule (`rules: - {}`) matches everything.
- Corrected the AUDIT explanation. AUDIT marks requests for auditing, but a supporting audit plugin must be configured to emit audit logs.
- Added missing current source fields: `serviceAccounts`, `notServiceAccounts`, `trustDomains`, and `notTrustDomains`.
- Added the required `remoteIpBlocks` caveat that Istio must be configured to trust the proxy source for X-Forwarded-For or proxy protocol.
- Updated the external IP deny example to use `notRemoteIpBlocks` instead of `notIpBlocks`, because the example is about original client IPs rather than the immediate source packet IP.

## Review Notes
The post is technically relevant and validated after corrections. A future improvement would be to add a short version note for `targetRefs`, especially for multi-revision upgrades involving control planes older than Istio 1.22.
