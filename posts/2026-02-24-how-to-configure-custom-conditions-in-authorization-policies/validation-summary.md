# Validation Summary: How to Configure Custom Conditions in Authorization Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio RequestAuthentication and JWT claim matching
- Kubernetes custom resources
- istioctl proxy debugging
- HTTP headers and TLS SNI matching

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio Authorization Policy Normalization reference: https://istio.io/latest/docs/reference/config/security/normalization/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio security troubleshooting guide: https://istio.io/latest/docs/ops/common-problems/security-issues/
- istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- Corrected the `connection.sni` explanation. The post described it as checking whether the connection uses mTLS, but Istio documents `connection.sni` as the Server Name Indication on a TLS connection.
- Added a JWT claim caveat. Istio raw JWT claim conditions require `RequestAuthentication`, and the documented raw claim matching support is for string or list-of-string claims.
- Adjusted the API key header wording. Matching a request header gates traffic on that header but is not, by itself, full API key authentication unless the header is controlled by a trusted component.
- Clarified the time-based header example. A trusted middleware or gateway should strip/overwrite the header so clients cannot spoof the condition.
- Fixed the `notValues` section introduction. The first example uses `DENY` with `values`, while the second example uses `notValues`.
- Corrected the header-name troubleshooting note. Istio authorization policy compares header names case-insensitively; header values remain string-matched.
- Refined the string matching note to mention Istio's exact, prefix, suffix, and presence matching.

## Review Notes
The Istio API version `security.istio.io/v1`, `AuthorizationPolicy` fields, `when` condition keys, prefix wildcard examples, and `istioctl proxy-config log ... --level rbac:debug` command are consistent with current Istio documentation. Some examples assume supporting resources such as workloads, labels, namespaces, and `RequestAuthentication` policies already exist.
