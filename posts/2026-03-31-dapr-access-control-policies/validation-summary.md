# Validation Summary: How to Configure Dapr Access Control Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Configuration resources (access control policies)
- Kubernetes (deployment annotations, namespaces)
- mTLS and SPIFFE identity framework
- HTTP service invocation via Dapr sidecar

## Sources Consulted
- Dapr Access Control Allow Listing documentation: https://docs.dapr.io/operations/configuration/invoke-allowlisting/
- Dapr Configuration Overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr source code (pkg/acl/acl.go) for error code verification

## Issues Found

### 1. Incorrect error code in verification example
- **What was wrong:** The blog post claimed the error response for a denied call was `{"error":"ERR_ACCESS_CONTROL_NOT_ENOUGH_PERMISSIONS"}`. The error code `ERR_ACCESS_CONTROL_NOT_ENOUGH_PERMISSIONS` does not exist in Dapr's source code.
- **What was changed:** Replaced with the actual Dapr error response format: `{"errorCode":"ERR_DIRECT_INVOKE","message":"access control policy has denied access to id: checkout-service operation: checkout verb: POST"}`.
- **Why:** The actual error code used by Dapr for access control denials is `ERR_DIRECT_INVOKE`, with a descriptive message about the denied access.

### 2. Incorrect trust domain claim
- **What was wrong:** The post stated "The SPIFFE trust domain. For Kubernetes, this is typically `cluster.local`." This conflates the Kubernetes DNS domain with the Dapr SPIFFE trust domain.
- **What was changed:** Updated to explain that Dapr defaults to `"public"` if not specified, and the trust domain should match the one configured in Dapr's Sentry service.
- **Why:** The Dapr documentation and official examples use `"public"` as the default trust domain. `cluster.local` is the Kubernetes DNS domain, not the Dapr access control trust domain. While any value is technically valid, the claim about the typical value was incorrect.

### 3. Incomplete wildcard path documentation
- **What was wrong:** The post stated `/api/*` is a "wildcard match for all paths under `/api/`", which is misleading. In Dapr, `*` is a single-segment wildcard that matches within one path segment only.
- **What was changed:** Clarified that `*` is a single-segment wildcard (matches `/api/foo` but not `/api/foo/bar`) and added documentation for `**` as the multi-segment wildcard for matching all nested paths.
- **Why:** The Dapr docs distinguish between `*` (single segment) and `**` (multi-segment) wildcards. Omitting this distinction could lead to misconfigured security policies where paths are unintentionally left unprotected.

## Review Notes
- The YAML examples in the post use `trustDomain: "cluster.local"` in all Configuration resource snippets. These were not changed since they are valid configuration values (any string works as a trust domain as long as it matches the Sentry configuration). However, readers following official Dapr quickstarts will see `"public"` as the trust domain, which could cause confusion. The field explanation was corrected to clarify the default.
- The post correctly describes the three-tier priority system for access control (operation-level > app-level defaultAction > global defaultAction), which matches the official documentation.
- The Dapr invoke URL format (`/v1.0/invoke/{appId}/method/{methodName}`) and the 403 HTTP status code for denied access are both correct per current documentation.
- The mTLS + SPIFFE flow diagram is accurate and matches how Dapr handles authentication and authorization.
