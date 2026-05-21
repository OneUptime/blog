# Validation Summary: How to Configure JWT Authentication per Route in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- JSON Web Tokens (JWT)
- Kubernetes manifests
- istioctl
- kubectl

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The basic per-route setup combined public-route ALLOW policies with DENY policies for unauthenticated `/api/*` and non-admin `/admin/*` requests, but did not include matching ALLOW policies for valid JWT-bearing API or admin requests. Since Istio denies requests that do not match any ALLOW policy when ALLOW policies exist for a workload, valid authenticated requests would still be denied. Added explicit ALLOW policies for authenticated API requests and admin-role requests.
- The path matching table initially described `/api/*` as a single-segment match, then corrected itself later. Updated the table to accurately describe Istio's string prefix matching and added the segment-aware `{*}` and `{**}` path-template operators.
- The method-specific example had the same ALLOW/DENY composition issue: JWT-bearing write requests would not match the public-read ALLOW policy and would be denied. Added an explicit ALLOW policy for authenticated write methods.
- The host-based example allowed `internal.example.com` but did not allow authenticated `api.example.com/api/*` traffic after the DENY check. Added an ALLOW rule for authenticated API-host traffic.
- The policy evaluation order omitted CUSTOM policies and slightly misstated the no-ALLOW default. Updated the list to match Istio's documented order: CUSTOM, DENY, no ALLOW means allow, matching ALLOW means allow, otherwise deny.

## Review Notes
The snippets use current `security.istio.io/v1` APIs and current field names for Istio 1.30 documentation. `istioctl` was not installed locally, so CLI syntax was checked against the official Istio command reference rather than local `--help` output.
