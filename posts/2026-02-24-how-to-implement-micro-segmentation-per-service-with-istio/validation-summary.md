# Validation Summary: How to Implement Micro-Segmentation per Service with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio Sidecar resource
- Istio telemetry metrics and Prometheus queries
- Istio CLI (`istioctl`)
- Kubernetes Deployments and ServiceAccounts
- Kubernetes service-to-service security
- JWT-based request authentication

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes ServiceAccounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/

## Issues Found
- The Kubernetes Deployment example omitted the required `spec.selector` and matching pod template labels for `apps/v1`. Added `selector.matchLabels` and `template.metadata.labels` so the manifest is valid and still demonstrates `serviceAccountName`.
- The JWT claim condition example did not mention that `request.auth.claims[...]` requires a RequestAuthentication policy. Added a sentence clarifying that the JWT must be validated by RequestAuthentication.
- The Sidecar egress section stated that calls to services outside the `hosts` list would fail. Istio documents Sidecar egress hosts as configuration scoping, not an outbound security policy. Updated the wording to explain that unmatched traffic may still be allowed depending on outbound traffic policy and that enforced controls require AuthorizationPolicy, ServiceEntry, or an egress gateway.
- The maintenance example used `istioctl proxy-config cluster deploy/order-service`. Updated it to the documented resource form `deployment/order-service` and changed the comment so it accurately describes inspecting configured outbound clusters rather than recent traffic.

## Review Notes
The AuthorizationPolicy examples use source principals, which require mTLS-derived peer identity. This is consistent with Istio service mesh behavior when mTLS is enabled or auto mTLS is in use, but future revisions could explicitly mention the mTLS prerequisite for readers deploying stricter or non-default mesh authentication settings.
