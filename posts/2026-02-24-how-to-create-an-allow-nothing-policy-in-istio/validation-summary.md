# Validation Summary: How to Create an Allow-Nothing Policy in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio authorization dry-run
- Kubernetes
- kubectl
- istioctl
- Envoy RBAC logging

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio HTTP authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-http/
- Istio authorization dry-run task: https://istio.io/latest/docs/tasks/security/authorization/authz-dry-run/
- Istio explicit deny task: https://istio.io/latest/docs/tasks/security/authorization/authz-deny/
- Istio ingress access control task: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Istio health checking documentation: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The dry-run log command searched for `shadow_denied`, but Istio's dry-run documentation shows the Envoy RBAC log text as `shadow denied`. Updated the grep pattern.
- The `istioctl experimental describe pod` example used `deploy/api-service`, but the command expects a pod name. Updated the example to resolve a pod by label before calling `istioctl experimental describe pod`.
- The health-check section claimed Kubernetes probes get blocked by allow-nothing policies. Istio rewrites HTTP, TCP, and gRPC probes by default so they are handled through the sidecar agent. Updated the text to clarify that health-check allow rules are needed when probe rewriting is disabled or health checks come through the mesh.
- The ingress gateway pitfall assumed traffic always comes from the `istio-system` namespace. Updated it to refer to the gateway's actual namespace or service account, with `istio-system` as the default ingress gateway example.

## Review Notes
- The core allow-nothing pattern is correct. Istio's official HTTP authorization task uses an AuthorizationPolicy with an empty `spec` as an allow-nothing policy, and the API reference confirms that absent rules never match for ALLOW policies while an empty rule matches everything.
- The examples that match `source.principals` or `source.namespaces` require mutual TLS identity information, consistent with Istio's authorization task guidance.
