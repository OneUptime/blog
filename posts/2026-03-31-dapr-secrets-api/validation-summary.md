# Validation Summary: How to Retrieve Secrets Using the Dapr Secrets API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Secrets API (HTTP and SDK)
- Dapr secret store components (Kubernetes, HashiCorp Vault, AWS Secrets Manager)
- Go SDK (`github.com/dapr/go-sdk/client`)
- Python SDK (`dapr.clients.DaprClient`)

## Sources Consulted
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr Kubernetes secret store component: https://docs.dapr.io/reference/components-reference/supported-secret-stores/kubernetes-secret-store/
- Dapr HashiCorp Vault secret store component: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Dapr AWS Secrets Manager component: https://docs.dapr.io/reference/components-reference/supported-secret-stores/aws-secret-manager/
- Dapr Go SDK client docs: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Dapr Python SDK docs: https://docs.dapr.io/developing-applications/sdks/python/
- Dapr Secrets overview: https://docs.dapr.io/developing-applications/building-blocks/secrets/secrets-overview/

## Issues Found

1. **HashiCorp Vault component: incorrect metadata field name `vaultMountPath`**
   - **What was wrong:** The Vault component YAML used a metadata field `vaultMountPath` with value `"secret/data"`. This field does not exist in the Dapr Vault component specification.
   - **What was changed:** Replaced `vaultMountPath` with `enginePath` and changed the value from `"secret/data"` to `"secret"`. The `/data` path segment is handled automatically by the KV v2 engine and should not be included.
   - **Why:** The official Dapr docs list `enginePath` as the correct metadata field for specifying the Vault engine mount path. Using `vaultMountPath` would cause a configuration error at runtime.

2. **AWS Secrets Manager metadata: wrong parameter name and semantics**
   - **What was wrong:** The curl example used `?metadata.versionId=AWSPREVIOUS`. Two issues: (a) the parameter name uses camelCase (`versionId`) but Dapr uses snake_case (`version_id`), and (b) `AWSPREVIOUS` is a version *stage* label, not a version *ID* (which is a UUID). The correct parameter for stage labels is `version_stage`.
   - **What was changed:** Replaced `metadata.versionId=AWSPREVIOUS` with `metadata.version_stage=AWSPREVIOUS`.
   - **Why:** Using the wrong parameter name would silently fail or return an error. Using `version_id` when passing a stage label is semantically incorrect and would not retrieve the intended secret version.

3. **Go code: undefined `maskSecret` function**
   - **What was wrong:** The `main()` function called `maskSecret(dbPassword)`, but this function was never defined in the code example. The code would not compile.
   - **What was changed:** Replaced `fmt.Printf("Got secret: %s\n", maskSecret(dbPassword))` with `fmt.Printf("Got secret of length: %d\n", len(dbPassword))`, which compiles and follows the post's own security advice of not logging secret values.
   - **Why:** Blog code examples should be compilable as presented. The replacement also aligns with the "Security Best Practices" section which advises logging only key names and lengths.

## Review Notes
- The Go example ignores the error from `dapr.NewClient()` with `_, _`. This is acceptable for a concise blog example but would not be appropriate in production code.
- The HTTP API endpoint format, Kubernetes component YAML, Go SDK method signature (`GetSecret`), and Python SDK usage (`get_secret` / `.secret`) are all correct per current Dapr documentation.
- The security best practices section is sound and aligns with Dapr's official guidance.
