# Validation Summary: How to Use Dapr with AWS CloudMap for Service Discovery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation, name resolution)
- AWS CloudMap (service discovery)
- AWS ECS (task definitions, service registries)
- AWS CLI (servicediscovery commands)
- Python (requests library for HTTP invocation)

## Sources Consulted
- Dapr Name Resolution component reference for AWS CloudMap: https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-awscloudmap/
- Dapr Configuration spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- AWS CLI servicediscovery reference: https://docs.aws.amazon.com/cli/latest/reference/servicediscovery/
- AWS ECS task definition serviceRegistries: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-discovery.html

## Issues Found
1. **Wrong component name in Dapr configuration**: The post used `"aws-cloudmap"` (hyphen) but the correct Dapr name resolution component name is `"aws.cloudmap"` (dot notation). Fixed in the YAML configuration block.
2. **Invalid configuration field `addressType`**: The `addressType: "ipv4"` field is not a valid configuration option for the Dapr CloudMap name resolution component. Removed it.
3. **Wrong configuration field `namespace`**: The post used `namespace: "dapr.local"` but the correct field name is `namespaceName: "dapr.local"` per the Dapr CloudMap component spec. Fixed.
4. **Missing `version` field**: The name resolution configuration should include `version: "v1"`. Added it.
5. **Unused `method` parameter in Python function**: The `invoke_order_service` function accepted a `method` parameter that was never used in the function body (GET/POST was determined by presence of `body` instead). Removed the unused parameter and updated the call site accordingly.

## Review Notes
- The `DAPR_PORT` custom attribute in the CloudMap instance registration is not a standard AWS CloudMap attribute. Dapr's CloudMap component uses the `defaultDaprPort` configuration field as a fallback; verify that the component actually reads a `DAPR_PORT` instance attribute for per-instance port resolution.
- The `--dns-config` shorthand syntax in the `create-service` command includes `NamespaceId` which is redundant with the top-level `--namespace-id` parameter. This is not an error but could be simplified.
- The ECS task definition is missing `networkMode`, `requiresCompatibilities`, `cpu`, and `memory` fields that would be required for a real Fargate deployment. This is acceptable for a tutorial snippet but readers should be aware it's not a complete task definition.
