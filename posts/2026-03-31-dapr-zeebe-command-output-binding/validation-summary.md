# Validation Summary: How to Use Dapr Zeebe Command Output Binding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Zeebe (Camunda Platform 8 workflow engine)
- BPMN (Business Process Model and Notation)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Docker

## Sources Consulted
- Dapr Zeebe Command binding component reference: https://docs.dapr.io/reference/components-reference/supported-bindings/zeebe-command/
- Dapr Bindings HTTP API reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/
- Camunda Zeebe Docker and configuration documentation

## Issues Found
1. **`deploy-process` operation is deprecated**: The blog used `deploy-process` in the curl example and listed it as the primary deploy operation. The official Dapr docs mark `deploy-process` as a deprecated alias for `deploy-resource`. Changed the curl example to use `deploy-resource` and updated the operations list to list `deploy-resource` as the primary operation with `deploy-process` noted as a deprecated alias.

2. **Incomplete operations list**: The original post listed 10 operations but the Dapr Zeebe command binding supports 13. Added the three missing operations: `deploy-resource`, `throw-error` (throws an error on a job), and `topology` (returns broker cluster topology).

## Review Notes
- The JavaScript examples use CommonJS `require()` syntax while official Dapr JS SDK docs show ES module `import` syntax. Both work correctly since the `@dapr/dapr` package supports both. Not changed as this is a style choice, not a technical error.
- Some optional fields for operations are omitted (e.g., `messageId` for publish-message, `withResult`/`fetchVariables` for create-instance). This is acceptable for a tutorial-level post and not an error.
- The component YAML, HTTP API endpoint format, SDK method signatures, Docker image name, and port mappings are all correct.
