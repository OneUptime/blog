# Validation Summary: How to Use Vault Response Wrapping for Secure Secret Distribution

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HashiCorp Vault response wrapping
- Vault CLI
- Vault Go API client
- hvac Python client
- Kubernetes Secrets, Deployments, init containers, and emptyDir volumes
- Vault audit logs
- Prometheus-style alerting rules

## Sources Consulted
- HashiCorp Vault response wrapping concepts: https://developer.hashicorp.com/vault/docs/concepts/response-wrapping
- HashiCorp Vault CLI `unwrap` command: https://developer.hashicorp.com/vault/docs/commands/unwrap
- HashiCorp Vault CLI `-wrap-ttl` global option: https://developer.hashicorp.com/vault/docs/commands
- HashiCorp Vault `/sys/wrapping/lookup` API: https://developer.hashicorp.com/vault/api-docs/system/wrapping-lookup
- HashiCorp Vault `/sys/wrapping/unwrap` API: https://developer.hashicorp.com/vault/api-docs/system/wrapping-unwrap
- HashiCorp Vault `/sys/wrapping/rewrap` API: https://developer.hashicorp.com/vault/api-docs/system/wrapping-rewrap
- HashiCorp Vault audit logging documentation: https://developer.hashicorp.com/vault/docs/audit
- HashiCorp Vault audit telemetry metrics: https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/audit
- Go Vault API package documentation: https://pkg.go.dev/github.com/hashicorp/vault/api
- hvac wrapping documentation: https://python-hvac.org/en/stable/usage/system_backend/wrapping.html
- hvac system backend API documentation: https://python-hvac.org/en/stable/source/hvac_api_system_backend.html
- HashiCorp Vault Docker image listing: https://hub.docker.com/r/hashicorp/vault

## Issues Found
- The original text said the actual secret never appears in logs or transit. Response wrapping prevents the secret from being returned during the wrapped distribution request, but the secret is still returned during unwrap and must be protected in transit and logs. Updated the wording to scope the claim to the distribution step.
- The Go examples set `SetWrappingLookupFunc` on a shared Vault client without restoring it. That could cause later unwrap, lookup, or rewrap calls to be response-wrapped unexpectedly. Added mutex protection and restoration of the original wrapping lookup function.
- The Go unwrap helper changed the shared client token and did not restore it. Added token restoration after unwrap.
- The Go lookup helper set the wrapping token as the client token while also passing it in the request body. The documented lookup API accepts the wrapping token in the `token` parameter, so the example now leaves the client token unchanged.
- The CI/CD example said the wrapped token is safe to store or transmit. A wrapping token is still a sensitive bearer token. Updated the comment to say it is safer than transmitting the secret briefly, but must still be treated as sensitive.
- The Kubernetes Deployment used `replicas: 3` with a single wrapped token. Response wrapping tokens are single-use, so only one pod could unwrap it successfully. Changed the example to one replica and added a note that multiple replicas need separate wrapped tokens.
- The Kubernetes init container used the old `vault:1.15` image. Updated it to a current Vault 1.21-based placeholder image that includes both Vault CLI and `jq`, since the script depends on `jq`.
- The wrapped token distribution service was missing the Go `os` import and used a shared wrapping lookup function without restoring it. Added `os`, `sync`, mutex protection, and wrap function restoration.
- The audit setup used `log_raw=true`, which disables normal HMAC protection for sensitive audit values. Removed `log_raw=true`.
- The alerting example presented non-native metrics as if Vault emits them directly. Updated the surrounding text to make clear those metrics must be exported from audit logs by custom tooling.
- The Python hvac example used `vault_client.sys.rewrap`, but current hvac system wrapping helpers document `wrap` and `unwrap`, not `rewrap`. Changed the example to call `sys/wrapping/rewrap` through the generic `write` API.

## Review Notes
The post is technically relevant and accurate after the fixes. The Kubernetes Secret pattern is viable only for tightly controlled bootstrap flows because both Kubernetes Secrets and wrapping tokens remain sensitive; for future hardening, a per-pod token generation workflow or Vault Agent based pattern would reduce operational risk.
