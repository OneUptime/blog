# Validation Summary: How to Configure Dapr with HuaweiCloud CSMS Secret Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (secret store component)
- HuaweiCloud Cloud Secret Management Service (CSMS)
- HuaweiCloud KooCLI (hcloud)
- HuaweiCloud IAM policies
- Kubernetes secrets
- Java Dapr SDK

## Sources Consulted
- Dapr HuaweiCloud CSMS component documentation: https://docs.dapr.io/reference/components-reference/supported-secret-stores/huaweicloud-csms/
- Dapr components-contrib source code (secretstores/huaweicloud/csms/csms.go) for metadata field verification
- HuaweiCloud CSMS API Reference (CreateSecret): https://support.huaweicloud.com/intl/en-us/api-dew/CreateSecret.html
- HuaweiCloud KooCLI documentation: https://support.huaweicloud.com/intl/en-us/productdesc-hcli/hcli_01_002.html
- HuaweiCloud KooCLI Getting Started: https://support.huaweicloud.com/intl/en-us/qs-hcli/hcli_02_005.html
- HuaweiCloud DEW Permission Management: https://support.huaweicloud.com/intl/en-us/productdesc-dew/dew_01_0018.html
- HuaweiCloud IAM Roles/Policies for DEW: https://support.huaweicloud.com/intl/en-us/usermanual-dew/dew_01_0161.html
- HuaweiCloud ShowSecretVersion API (confirms csms:secret:getVersion action): https://support.huaweicloud.com/intl/en-us/api-dew/ShowSecretVersion.html
- Dapr component scoping documentation: https://docs.dapr.io/operations/components/component-scopes/
- Java Dapr SDK DaprClient interface for getSecret method signature

## Issues Found

### 1. CLI command syntax incorrect (lines 17-24)
**What was wrong:** The blog used `hcloud kms create-secret` with kebab-case flags (`--name`, `--kms-key-id`, `--secret-string`, `--region`). KooCLI uses PascalCase operations, underscore-delimited parameter names, equals-sign syntax, and `--cli-region` for the region flag.
**What was changed:** Updated to `hcloud KMS CreateSecret` with `--name=`, `--kms_key_id=`, `--secret_string=`, and `--cli-region=` syntax.

### 2. IAM policy actions incorrect (lines 34-36)
**What was wrong:** The policy used `kms:cmk:list`, `kms:cmk:get`, and `kms:dek:decrypt` actions. CSMS has its own action prefix (`csms:`) separate from KMS, and `kms:dek:decrypt` is not a valid action.
**What was changed:** Replaced with `csms:secret:get`, `csms:secret:getVersion`, and `kms:cmk:decryptDataKey` which are the correct actions for reading CSMS secrets per the official DEW permission documentation.

### 3. Dapr component metadata field `secretKey` incorrect (line 63)
**What was wrong:** The blog used `secretKey` as the metadata field name for the secret access key. The Dapr HuaweiCloud CSMS component source code defines the field as `secretAccessKey`.
**What was changed:** Renamed from `secretKey` to `secretAccessKey`.

### 4. Dapr component metadata field `projectID` does not exist (lines 67-68)
**What was wrong:** The blog included a `projectID` metadata field. The Dapr HuaweiCloud CSMS component only accepts three metadata fields: `region`, `accessKey`, and `secretAccessKey`. There is no `projectID` field in the component struct or initialization code.
**What was changed:** Removed the `projectID` metadata entry entirely. Updated the summary paragraph to remove the mention of "project ID".

### 5. Component scoping `scopes` field incorrectly nested (lines 133-142)
**What was wrong:** The `scopes` field was placed inside `spec:`, but Dapr component scoping requires `scopes` to be a top-level field at the same level as `spec:`, not nested within it.
**What was changed:** Moved `scopes` to the top level and added the full component structure (apiVersion, kind, metadata) to make the example complete and unambiguous.

## Review Notes
- The Dapr HuaweiCloud CSMS component is listed as Alpha status. This should be noted if the post is updated in the future, as the API surface could change.
- The `metadata.version_id` query parameter for secret versioning is correctly documented and confirmed in the component source code.
- The Java SDK usage is correct: `DaprClient.getSecret()` returns `Mono<Map<String, String>>` and `.block()` is the appropriate way to get the synchronous result.
- The `@Service` annotation in the Java example implies Spring Framework but the import is missing; however, this is acceptable as it's a code snippet, not a complete class.
