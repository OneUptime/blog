# Validation Summary: How to Configure Authorization Based on HTTP Headers in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio RequestAuthentication and JWT claim matching
- Kubernetes custom resources
- HTTP headers and HTTP methods
- mTLS workload identity
- istioctl debugging

## Sources Consulted
- Istio Authorization Policy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio Authorization Policy Normalization reference: https://istio.io/latest/docs/reference/config/security/normalization/
- Istio Security concepts: https://istio.io/latest/docs/concepts/security/
- Istio Explicit Deny task: https://istio.io/latest/docs/tasks/security/authorization/authz-deny/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The Content-Type DENY example only allowed two exact `application/json` strings, but the prose said it denied requests that do not have a JSON content type. Changed the match to `application/json*` so common JSON content types with parameters are covered by Istio's supported prefix matching.
- The debugging section said to verify that the header name is lowercase in the policy. Istio authorization policy header-name matching is case-insensitive, so this was too strict. Updated the wording to describe lowercase as a convention while noting Istio's case-insensitive matching behavior.

## Review Notes
- Istio documentation confirms `request.headers[...]` and nested `request.auth.claims[...]` are valid `when` condition keys for HTTP traffic.
- Istio documentation confirms rule matching uses OR across values in the same field and requires all `when` conditions in a rule to match.
- Istio documentation confirms source principals require mutual TLS, matching the post's recommendation to combine trusted headers with source identity.
- Istio documentation confirms `notValues` is valid and the explicit DENY pattern shown in the post is consistent with current examples.
