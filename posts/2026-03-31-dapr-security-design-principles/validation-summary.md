# Validation Summary: How to Understand Dapr Security Design Principles

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Mutual TLS (mTLS) / SPIFFE SVIDs
- Dapr Sentry CA (certificate authority)
- Dapr Access Control Policies
- Dapr API Token Authentication
- Dapr Secrets Management
- Kubernetes NetworkPolicies
- Kubernetes Namespaces
- OpenSSL (certificate generation)

## Sources Consulted
- Dapr official documentation on security concepts: https://docs.dapr.io/concepts/security-concept/
- Dapr mTLS documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr access control documentation: https://docs.dapr.io/operations/configuration/invoke-allowlisting/
- Dapr API token authentication: https://docs.dapr.io/operations/security/api-token/
- Dapr secrets management: https://docs.dapr.io/operations/components/component-secrets/
- Dapr sidecar injector annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Kubernetes NetworkPolicy specification: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- SPIFFE/SPIRE standards: https://spiffe.io/

## Issues Found

### Issue 1: NetworkPolicy YAML had `from` and `ports` as separate ingress rules
- **What was wrong:** In Section 7 (Network Policy Integration), the `from` and `ports` fields were defined as separate elements in the `ingress` array. In Kubernetes NetworkPolicy semantics, separate array elements under `ingress` are OR'd together, meaning: Rule 1 would allow ALL traffic from `dapr-system` namespace on any port, and Rule 2 would allow traffic on ports 3500/50001 from ANY source. This effectively makes the policy far more permissive than intended.
- **What was changed:** Moved `ports` into the same ingress rule as `from`, so the conditions are AND'd — traffic must come from `dapr-system` namespace AND target ports 3500 or 50001.
- **Why:** This is a well-known Kubernetes NetworkPolicy gotcha. The original YAML would have allowed any pod in the cluster to reach ports 3500/50001, defeating the purpose of the policy.

### Issue 2: Incorrect pod annotation for Dapr API token authentication
- **What was wrong:** In Section 4 (App API Token Authentication), the annotation `dapr.io/app-token-secret` was used. However, the section describes the Dapr API token flow (app authenticating to the sidecar via the `dapr-api-token` header). The annotation `dapr.io/app-token-secret` is for the reverse direction — the token the sidecar sends when calling the app.
- **What was changed:** Changed the annotation from `dapr.io/app-token-secret` to `dapr.io/api-token-secret`.
- **Why:** `dapr.io/api-token-secret` is the correct annotation for configuring the token that the app must include when calling the Dapr sidecar's API.

## Review Notes
- The section titled "App API Token Authentication" describes the Dapr API token flow (app-to-sidecar authentication). Dapr's documentation distinguishes between "Dapr API token" (app authenticates to sidecar) and "App API token" (sidecar authenticates to app). The section title uses "App API Token" but the content correctly describes the "Dapr API token" flow. This is a minor terminology inconsistency but the practical instructions are correct after the annotation fix.
- The `dapr mtls` CLI command shown for self-hosted mode may need additional flags depending on the Dapr CLI version. In some versions, `dapr mtls -k` is used for Kubernetes and the bare `dapr mtls` command primarily shows subcommand help.
- mTLS is enabled by default on Kubernetes but requires explicit configuration in self-hosted mode. The post doesn't make this distinction, which could confuse readers running Dapr outside of Kubernetes.
- The component scoping YAML snippet in Section 6 is shown as a partial fragment without `apiVersion`/`kind` headers. While acceptable as a snippet, readers might need to reference the full component schema.
