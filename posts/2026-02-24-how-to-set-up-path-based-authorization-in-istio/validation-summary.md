# Validation Summary: How to Set Up Path-Based Authorization in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Kubernetes
- YAML configuration
- HTTP path matching
- gRPC authorization paths
- JWT request principals

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Normalization reference: https://istio.io/latest/docs/reference/config/security/normalization/
- Istio Security Best Practices: https://istio.io/latest/docs/ops/best-practices/security/
- Istio MeshConfig global options reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/

## Issues Found
- The path matching table incorrectly described `/api/*` as a single-level wildcard. Istio's plain `*` string matching supports prefix, suffix, exact, and presence matching, so `/api/*` is a prefix match that can match nested paths. Updated the table and explanation.
- The post described `*` as a general wildcard that could be used anywhere in a path. Istio supports `{*}` and `{**}` URI template operators for path-segment matching. Added a concise note and example for `{*}`.
- The resource-level authorization example used `/api/orders/*/status`, which is not the correct way to express a wildcard in the middle of a path. Changed it to `/api/orders/{*}/status`.
- The path normalization section said double slashes are collapsed and URL-encoded characters are decoded by default. Istio's default `BASE` normalization resolves dot segments and decodes only specific characters; slash merging requires `MERGE_SLASHES` or `DECODE_AND_MERGE_SLASHES`. Updated the text to match the official normalization behavior.

## Review Notes
The examples use `apiVersion: security.istio.io/v1`, which is current in the official Istio reference. `requestPrincipals: ["*"]` requires JWT request authentication to be configured for the workload, which the post implies but does not fully walk through.
