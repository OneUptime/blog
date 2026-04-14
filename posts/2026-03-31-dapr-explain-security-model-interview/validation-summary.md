# Validation Summary: How to Explain Dapr Security Model in an Interview

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Sentry service (Certificate Authority)
- Mutual TLS (mTLS)
- SPIFFE identity framework
- Dapr API token authentication
- Dapr access control policies
- Dapr secret management API
- HashiCorp Vault (as a secret store component)
- Kubernetes
- Helm

## Sources Consulted
- Dapr mTLS setup and configuration: https://docs.dapr.io/operations/security/mtls/
- Dapr security concepts: https://docs.dapr.io/concepts/security-concept/
- Dapr Sentry service overview: https://docs.dapr.io/concepts/dapr-services/sentry/
- Dapr API token authentication (client-to-Dapr): https://docs.dapr.io/operations/security/api-token/
- Dapr app API token authentication (Dapr-to-app): https://docs.dapr.io/operations/security/app-api-token/
- Dapr access control list configuration: https://docs.dapr.io/operations/configuration/invoke-allowlist/
- Dapr secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- HashiCorp Vault secret store component: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Dapr CLI mtls command reference: https://docs.dapr.io/reference/cli/dapr-mtls/

## Issues Found

1. **Wrong environment variable for API token authentication (line 49)**
   - **What was wrong:** The post used `APP_API_TOKEN` with a comment "Set the app API token" in the context of protecting the Dapr sidecar API from unauthorized callers. `APP_API_TOKEN` is actually for Dapr-to-application authentication (so your app can verify requests came from its Dapr sidecar). The correct variable for client-to-Dapr API protection is `DAPR_API_TOKEN`.
   - **What was changed:** Replaced `export APP_API_TOKEN="my-secret-token"` with `export DAPR_API_TOKEN="my-secret-token"` and updated the comment to "Set the Dapr API token".
   - **Why:** These are two distinct authentication mechanisms in Dapr. Using the wrong one would confuse readers and lead to misconfigured security.

2. **Incorrect secret API response format (line 94)**
   - **What was wrong:** The post showed the response as `{"db-password": {"db-password": "supersecretvalue"}}` (nested object). This nested format is only used in the bulk secrets endpoint (`/v1.0/secrets/<store>/bulk`). A single secret GET returns a flat key-value map.
   - **What was changed:** Corrected the response to `{"db-password": "supersecretvalue"}`.
   - **Why:** The incorrect response format would mislead readers into writing incorrect JSON parsing code.

3. **Non-existent Dapr CLI command (lines 123-126)**
   - **What was wrong:** The post showed `kubectl exec -it my-pod -c daprd -- dapr mtls check --app-id my-app --namespace default`. The `dapr mtls check` subcommand does not exist, and the `--app-id` and `--namespace` flags are not valid for any `dapr mtls` subcommand. The valid subcommands are `dapr mtls -k` (check status), `dapr mtls expiry`, `dapr mtls export`, and `dapr mtls renew-certificate`.
   - **What was changed:** Replaced with `dapr mtls -k` which checks if mTLS is enabled in the Kubernetes cluster.
   - **Why:** Running the original command would produce an error. The corrected command is the standard way to verify mTLS status.

## Review Notes
- The `kubectl get configurations/daprsystem` command is correct but would benefit from including the `--namespace dapr-system` flag to be explicit, though it works without it if the user's context is already set to that namespace.
- The access control policy YAML is correct and follows the documented schema, including the use of `trustDomain` at both the top level and per-policy level.
- The HashiCorp Vault secret store component configuration is accurate with correct field names (`vaultAddr`, `skipVerify`).
- The SPIFFE identity claim is correct — Dapr issues certificates with SPIFFE IDs in the format `spiffe://<trustdomain>/ns/<namespace>/<appid>`.
