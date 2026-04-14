# Validation Summary: How to Use Dapr Zeebe Command Output Binding for Workflow Orchestration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar runtime, output bindings)
- Camunda Zeebe (workflow engine, BPMN process orchestration)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Docker / Docker Compose
- Node.js

## Sources Consulted
- Dapr Zeebe Command Binding Spec: https://docs.dapr.io/reference/components-reference/supported-bindings/zeebe-command/
- Dapr Bindings API Reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr JavaScript Client SDK: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr Output Bindings How-To: https://docs.dapr.io/developing-applications/building-blocks/bindings/howto-bindings/

## Issues Found

1. **Deprecated operation name `deploy-process`**: The deploy curl example and operations list used `deploy-process`, which is deprecated. Changed to `deploy-resource`, which is the current operation name in the Dapr Zeebe command binding.

2. **Incorrect metadata field `bpmnFilePath`**: The deploy example used `bpmnFilePath` as the metadata field for specifying the file to deploy. The correct field name per official documentation is `fileName`. Fixed in the curl example.

3. **Redundant `operation` field inside `metadata`**: The deploy curl example included `"operation": "deploy-process"` inside the `metadata` object in addition to the top-level `"operation"` field. The operation should only be specified at the top level of the request body, not inside metadata. Removed the redundant field from metadata.

4. **Missing operations in supported operations list**: The operations list was missing `topology` (get cluster topology) and `resolve-incident` (resolve an incident by key). Added both to the supported operations table.

## Review Notes
- The component definition (type, metadata fields like `gatewayAddr`, `gatewayKeepAlive`, `usePlainTextConnection`, `caCertificatePath`) is accurate.
- The `create-instance`, `publish-message`, `set-variables`, and `cancel-instance` curl examples use correct metadata field names and request structure.
- The Node.js SDK usage with `client.binding.send(bindingName, operation, data, metadata)` is correct for the `@dapr/dapr` package.
- The Docker Compose configuration for Zeebe is functional, though the Elasticsearch exporter environment variable is optional and only needed if Elasticsearch is also running.
- The `deploy-resource` operation description was updated to note it supports both BPMN and DMN resources, not just BPMN files.
