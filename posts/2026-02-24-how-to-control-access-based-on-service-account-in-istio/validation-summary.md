# Validation Summary: How to Control Access Based on Service Account in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio PeerAuthentication and mTLS
- Kubernetes ServiceAccount
- Kubernetes Deployment manifests
- istioctl proxy-config
- kubectl

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio HTTP authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-http/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Service Accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes Configure Service Accounts for Pods task: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/

## Issues Found
- The post said `principals` takes the full SPIFFE identity, but Istio AuthorizationPolicy uses the principal format without the `spiffe://` scheme. Updated the wording to distinguish the certificate URI SAN from the policy value format.
- The command for checking the SPIFFE identity only printed the raw certificate chain field and did not actually inspect the certificate identity. Updated it to select the default workload certificate, decode it, and inspect the Subject Alternative Name with `openssl`.
- The mTLS PERMISSIVE wording implied principal-based AuthorizationPolicies do not protect non-mesh traffic. Updated it to clarify that plaintext requests have no verified peer identity, so `source.principal` matches do not match them, and `STRICT` is the right mode to reject non-mTLS traffic at authentication.

## Review Notes
The YAML examples use the current `security.istio.io/v1` Istio APIs and valid AuthorizationPolicy and PeerAuthentication fields. Istio also supports the `serviceAccounts` source field as a simpler alternative to `principals` for exact Kubernetes service account matches, but the post's use of `principals` is valid and supports prefix/suffix wildcard matching under Istio's string matching rules.
