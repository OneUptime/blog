# Validation Summary: How to Configure Custom JWT Claims Validation in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- JWT claims
- Kubernetes
- Envoy proxy authorization

## Sources Consulted
- Istio Authorization Policy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio JWT Token authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-jwt/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- Corrected the claim support description. Istio AuthorizationPolicy conditions support JWT claims of type string and list of strings, including nested string fields, not arbitrary JWT claim types.
- Corrected the array-claim wording from generic arrays to list-of-string claims to match Istio's documented support.
- Corrected the nested-claim explanation from "dot notation" to bracket notation for AuthorizationPolicy `when` conditions.
- Clarified `notValues` wording so it describes excluding values in an ALLOW rule rather than a standalone deny action.
- Replaced the JWT payload decoding command with a `jq` command that handles JWT base64url payload encoding more reliably than plain `base64 -d`.
- Corrected the debugging guidance around `requestPrincipals`: claims require a RequestAuthentication policy, and `requestPrincipals: ["*"]` is used when the authorization rule should require a validated JWT.

## Review Notes
The YAML snippets use the current `security.istio.io/v1` APIs and match Istio's documented AuthorizationPolicy rule structure. The examples assume a matching RequestAuthentication policy is applied to the relevant workload before claim-based AuthorizationPolicy rules are enforced.
