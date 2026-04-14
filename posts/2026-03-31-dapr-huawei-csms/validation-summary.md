# Validation Summary: How to Use Dapr with Huawei Cloud CSMS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (secrets building block)
- Huawei Cloud CSMS (Cloud Secret Management Service)
- Huawei Cloud KooCLI (hcloud)
- Huawei Cloud IAM
- Python (Dapr SDK)
- Kubernetes
- Redis (as example state store)

## Sources Consulted
- Dapr secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr Huawei Cloud CSMS secret store component spec: https://docs.dapr.io/reference/components-reference/supported-secret-stores/huaweicloud-csms/
- Dapr component schema (auth and secretKeyRef): https://docs.dapr.io/operations/components/component-secrets/
- Dapr Python SDK documentation: https://docs.dapr.io/developing-applications/sdks/python/
- Huawei Cloud CSMS API reference (KMS service group): https://support.huaweicloud.com/intl/en-us/api-dew/dew_02_0037.html
- Huawei Cloud KooCLI documentation: https://support.huaweicloud.com/intl/en-us/usermanual-hcli/hcli_02_003.html
- Cross-referenced with sibling blog post: posts/2026-03-31-dapr-secrets-huaweicloud-csms/README.md

## Issues Found

1. **Incorrect IAM policy name (line 19)**: The post referenced `SMN ReadOnlyAccess` as the required IAM policy. SMN is Huawei's Simple Message Notification service, completely unrelated to CSMS. Changed to list the correct CSMS permissions: `csms:secret:get`, `csms:secret:getVersion`, and `kms:cmk:decryptDataKey`.

2. **Incorrect KooCLI command format (lines 28-37)**: The CLI commands used `hcloud csms create-secret` with kebab-case subcommands and parameters. Huawei KooCLI uses the format `hcloud <ServiceName> <OperationName>` with PascalCase operation names and underscore-separated parameters. Changed to `hcloud KMS CreateSecret` with `--secret_string`, `--secret_binary`, and added the required `--cli-region` flag.

3. **Wrong component metadata field name (line 58)**: The Dapr component configuration used `secretKey` as the metadata field name for the Huawei secret access key. The correct field name for the `secretstores.huaweicloud.csms` component is `secretAccessKey`. Changed accordingly.

4. **Incorrect KooCLI commands for secret rotation (lines 117-123)**: Same CLI format issues as #2. Changed `hcloud csms create-secret-version` to `hcloud KMS CreateSecretVersion` and `hcloud csms list-secret-versions` to `hcloud KMS ListSecretVersions`, with corrected parameter names and added `--cli-region` flag.

## Review Notes
- The Dapr secrets API endpoint format, Python SDK usage pattern, and component YAML structure (including `auth.secretStore` placement) are all correct.
- The post correctly notes that Dapr fetches the latest active secret version automatically, which is consistent with CSMS behavior.
- The `auth` block in the Redis state store component example is correctly placed at the top level of the Component resource, matching the Dapr component schema.
