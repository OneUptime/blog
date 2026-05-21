# Validation Summary: How to Configure Per-Path Security Policies in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio RequestAuthentication
- Kubernetes
- kubectl
- istioctl
- JWT authentication and claims-based authorization

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio AuthorizationPolicy normalization reference: https://istio.io/latest/docs/reference/config/security/normalization/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/#exec

## Issues Found
- The path matching section incorrectly described `/api/*` as a single-level wildcard while later saying it matched all subpaths. Updated the section to state that `/api/*` is prefix-style matching in Istio AuthorizationPolicy, and added the current URI template forms `/api/{*}` and `/api/{**}` for single-segment and multi-segment matching.
- The path matching section claimed `/api/**` was a multi-level wildcard pattern to avoid. Updated this to use Istio's documented `{**}` path template operator instead of the unsupported `**` wildcard form.
- The DENY policy example was technically valid for HTTP traffic but omitted Istio's documented caveat that missing HTTP attributes on TCP traffic are treated as matches for DENY rules. Added a short note recommending scoping such DENY policies to the relevant HTTP port when the workload can also receive TCP traffic.

## Review Notes
The AuthorizationPolicy and RequestAuthentication API versions, field names, request principal checks, JWT claim conditions, implicit deny behavior for ALLOW policies, DENY precedence, kubectl examples, and istioctl debugging commands are consistent with current official documentation.
