# Validation Summary: How to Configure Value Matching (Prefix, Suffix, Exact) in Authorization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Kubernetes custom resources
- Istio authorization policy matching
- Envoy RBAC debugging through Istio

## Sources Consulted
- Istio Authorization Policy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio Authorization Policy Normalization reference: https://istio.io/latest/docs/reference/config/security/normalization/
- Istio Authorization Policy dry-run task: https://istio.io/latest/docs/tasks/security/authorization/authz-dry-run/
- Istio Security Best Practices: https://istio.io/latest/docs/ops/best-practices/security/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The post said `request.headers` conditions only support exact matching. Istio condition values are string matches and the official conditions reference shows wildcard examples such as `values: ["Mozilla/*"]`, so the text was corrected to say header conditions support the same exact, prefix, and suffix syntax.
- The combined namespace example did not mention that `source.namespaces` depends on mutual TLS. The text was updated to include that requirement.
- The principals section did not mention that peer identity matching depends on mutual TLS. The text was updated to include that requirement.
- The dry-run tip incorrectly suggested using the `CUSTOM` action with an external authorizer as the dry-run mechanism. Istio documents the `"istio.io/dry-run": "true"` annotation for authorization policy dry-run, so the tip was corrected.

## Review Notes
The examples use `apiVersion: security.istio.io/v1`, valid `AuthorizationPolicy` fields, and documented prefix/suffix wildcard forms. The `istioctl x authz check` command is still documented as an alias for the experimental authorization check command in Istio 1.30.
