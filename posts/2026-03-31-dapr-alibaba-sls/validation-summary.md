# Validation Summary: How to Use Dapr with Alibaba Cloud Log Storage (SLS)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (output bindings)
- Alibaba Cloud Simple Log Service (SLS)
- Dapr Java SDK (`io.dapr.client`)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Express.js (middleware pattern)
- Alibaba Cloud CLI (`aliyun`)

## Sources Consulted
- Dapr Alibaba Cloud SLS Binding Spec: https://docs.dapr.io/reference/components-reference/supported-bindings/alicloudsls/
- Dapr Bindings API Reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr Java SDK Client Docs: https://docs.dapr.io/developing-applications/sdks/java/java-client/
- Dapr JavaScript SDK Client Docs: https://docs.dapr.io/developing-applications/sdks/js/js-client/

## Issues Found

### 1. `Project`, `LogStore`, `Topic`, `Source` incorrectly placed as component-level metadata (High severity)
**What was wrong:** The component YAML included `Project`, `LogStore`, `Topic`, and `Source` as component-level metadata fields. According to the official Dapr SLS binding documentation, these are **request-time metadata** that must be provided in the `metadata` object of each invocation request, not in the component YAML spec. Only `AccessKeyID`, `AccessKeySecret`, and `Endpoint` belong in the component YAML.

**What was changed:** Removed `Project`, `LogStore`, `Topic`, and `Source` from the component YAML.

### 2. Missing request metadata in curl example (High severity)
**What was wrong:** The curl example only included `data` and `operation` in the request body, but omitted the required `metadata` object containing `project`, `logstore`, `topic`, and `source`. Without these fields, the SLS binding would not know which project/logstore to write to.

**What was changed:** Added a `metadata` block to the curl example with lowercase field names: `project`, `logstore`, `topic`, `source`.

### 3. Missing request metadata in Java SDK example (High severity)
**What was wrong:** The Java `invokeBinding` call did not pass the required metadata map with `project`, `logstore`, `topic`, and `source`.

**What was changed:** Added a `Map<String, String> metadata` parameter and used the four-argument `invokeBinding(bindingName, operation, data, metadata)` overload.

### 4. Missing request metadata in JavaScript SDK example (High severity)
**What was wrong:** The `daprClient.binding.send()` call did not pass the required metadata object.

**What was changed:** Added a `slsMetadata` object with `project`, `logstore`, `topic`, `source` and passed it as the fourth argument to `binding.send()`.

## Review Notes
- The SLS query syntax example is illustrative and reasonable for the SLS analytics SQL dialect.
- The `aliyun log` CLI commands for creating projects and logstores use plausible flag names, though the exact flag format may vary by CLI version. The commands are presented as illustrative examples.
- The `AliyunLogWriteOnlyAccess` RAM policy name follows Alibaba Cloud naming conventions for managed policies.
- The component `version: v1` is correct per current Dapr documentation.
