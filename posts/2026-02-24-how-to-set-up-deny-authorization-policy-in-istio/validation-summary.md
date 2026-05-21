# Validation Summary: How to Set Up DENY Authorization Policy in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio DENY and ALLOW authorization actions
- Kubernetes manifests
- kubectl
- istioctl
- Envoy RBAC logging
- JWT claim-based authorization

## Sources Consulted
- Istio Authorization Policy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio security concepts, authorization section: https://istio.io/latest/docs/concepts/security/
- Istio Explicit Deny task: https://istio.io/latest/docs/tasks/security/authorization/authz-deny/
- Istio Ingress Access Control task: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Istio Authorization Policy Normalization reference: https://istio.io/latest/docs/reference/config/security/normalization/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The introduction said everything that does not match a DENY rule passes through. Updated it to account for CUSTOM and ALLOW policies, because Istio evaluates CUSTOM, DENY, and ALLOW decisions together.
- The basic example heading said it blocked POST requests, but the policy also blocked PUT, PATCH, and DELETE. Changed the heading to describe write requests.
- HTTP-based DENY examples used methods or paths without a port. Added `ports: ["8080"]` to representative HTTP DENY rules because Istio treats missing HTTP attributes as matches for DENY rules on TCP traffic, and the official docs recommend scoping DENY policies to ports when using HTTP attributes.
- Namespace-based examples omitted the mTLS requirement. Added notes that namespace identity is derived from the peer certificate and requires mTLS.
- The ingress IP example implied `ipBlocks` always represents real client IPs at ingress. Clarified that `ipBlocks` is appropriate for packet source IP, while `remoteIpBlocks` should be used for `X-Forwarded-For` or PROXY Protocol with trusted proxy configuration.
- The "Using notValues" section did not use the `notValues` condition field. Renamed it to "Using Negative Matches in DENY Policies" to match the actual `notPrincipals` example.
- The safety-net example claimed DENY blocked paths despite a broad `/api/*` ALLOW match, but the DENY paths did not overlap `/api/*`. Changed the ALLOW path to `/*` so the example demonstrates DENY precedence correctly.
- The path debugging note said `/api` does not match `/api/` without explaining the relevant prefix-match option. Updated it to clarify that trailing slashes matter unless a prefix match such as `/api*` is used.

## Review Notes
The post uses current Istio `security.istio.io/v1` AuthorizationPolicy syntax. The `kubectl` and `istioctl` commands shown are valid in current Istio documentation, though actual test results depend on the named deployments, ports, sidecar or waypoint configuration, request authentication policy, and access logging configuration in the reader's cluster.
