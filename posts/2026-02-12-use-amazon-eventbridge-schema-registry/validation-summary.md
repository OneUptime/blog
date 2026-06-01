# Validation Summary: How to Use Amazon EventBridge Schema Registry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EventBridge Schema Registry
- EventBridge Schemas API
- AWS CLI v2
- AWS IAM policies
- AWS CloudFormation
- OpenAPI 3
- JSON Schema Draft 4
- EventBridge schema code bindings for TypeScript, Python, Java, and Go

## Sources Consulted
- Amazon EventBridge schemas user guide: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-schema.html
- Creating an event schema in Amazon EventBridge: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-schema-create.html
- Creating a schema by using a template in Amazon EventBridge: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-schema-template.html
- Generating code bindings for event schemas in Amazon EventBridge: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-schema-code-bindings.html
- AWS CLI create-schema reference: https://docs.aws.amazon.com/cli/latest/reference/schemas/create-schema.html
- AWS CLI update-schema reference: https://docs.aws.amazon.com/cli/latest/reference/schemas/update-schema.html
- AWS CLI search-schemas reference: https://docs.aws.amazon.com/cli/latest/reference/schemas/search-schemas.html
- AWS CLI put-code-binding reference: https://docs.aws.amazon.com/cli/latest/reference/schemas/put-code-binding.html
- AWS CLI describe-code-binding reference: https://docs.aws.amazon.com/cli/latest/reference/schemas/describe-code-binding.html
- AWS CLI get-code-binding-source reference: https://docs.aws.amazon.com/cli/latest/reference/schemas/get-code-binding-source.html
- EventBridge Schemas code binding API reference: https://docs.aws.amazon.com/eventbridge/latest/schema-reference/v1-registries-name-registryname-schemas-name-schemaname-language-language.html
- AWS CloudFormation AWS::EventSchemas::Schema reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-eventschemas-schema.html
- Amazon EventBridge Schemas endpoints and quotas: https://docs.aws.amazon.com/general/latest/gr/eventbridgeschemas.html
- Amazon EventBridge Schemas service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoneventbridgeschemas.html

## Issues Found
- The post described the registry as storing only JSON Schema definitions. EventBridge supports both OpenAPI 3 and JSON Schema Draft 4, so the wording was corrected.
- The `create-schema`, `update-schema`, and CloudFormation examples used OpenAPI 3 documents but set the schema type to `JSONSchemaDraft4`. Changed those examples to `OpenApi3`.
- The post said users can create as many registries as needed. AWS applies EventBridge Schemas service quotas, so this was changed to say multiple registries can be created within account quotas.
- The `search-schemas` CLI example claimed to search across all registries and omitted the required `--registry-name` option. Updated it to search within the `order-processing` registry.
- The export section said the exported schema can be used with any JSON Schema-compatible validation library. That is only directly true for JSON Schema Draft 4 exports, not OpenAPI 3 documents. Added a short caveat for OpenAPI 3 schemas.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI validation was performed against the official AWS CLI command reference and EventBridge Schemas API documentation rather than local `aws --help` output.
