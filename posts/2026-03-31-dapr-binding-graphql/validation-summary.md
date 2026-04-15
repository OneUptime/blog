# Validation Summary: How to Use Dapr GraphQL Output Binding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr GraphQL output binding (`bindings.graphql`)
- GraphQL (queries and mutations)
- Kubernetes (secrets management)
- TypeScript / Node.js (application code example)
- Python (error handling example)

## Sources Consulted
- Dapr GraphQL binding specification — https://docs.dapr.io/reference/components-reference/supported-bindings/graghql/
- Dapr supported bindings reference — https://docs.dapr.io/reference/components-reference/supported-bindings/
- Dapr bindings API reference — https://docs.dapr.io/reference/api/bindings_api/
- Dapr components-contrib GraphQL source code — https://github.com/dapr/components-contrib/tree/master/bindings/graphql
- Go package documentation — https://pkg.go.dev/github.com/dapr/components-contrib/bindings/graphql

## Issues Found

### Issue 1: Query and variables placed in `data` instead of `metadata`
- **What was wrong:** All invocation examples (curl commands, TypeScript code, Python code) placed the GraphQL query and variables inside a `data` field in the request body. The Dapr GraphQL binding actually reads the query and variables from the `metadata` field.
- **What was changed:** Updated all examples to use `"metadata"` instead of `"data"` for the query and variable fields.
- **Why:** The Dapr bindings API uses the `metadata` field for binding-specific parameters. The GraphQL binding reads `query` and `variable:*` keys from metadata, not from the data payload.

### Issue 2: Variables format used nested JSON object instead of `variable:` prefix
- **What was wrong:** Variables were passed as a nested `"variables": { "key": "value" }` JSON object, mimicking the standard GraphQL HTTP convention. The Dapr GraphQL binding uses a flat key format with a `variable:` prefix (e.g., `"variable:id": "user-123"`).
- **What was changed:** Updated all examples to use the `variable:` prefix format in the metadata object.
- **Why:** The Dapr GraphQL binding parses variable keys by looking for the `variable:` prefix in the metadata map, not by deserializing a nested variables object.

### Issue 3: Summary text was slightly misleading
- **What was wrong:** The closing summary said to "invoke it with the operation type and query string" without mentioning the `metadata` field.
- **What was changed:** Updated to clarify that the query and variables go in the `metadata` field.
- **Why:** Accuracy in the summary helps readers form the correct mental model.

## Review Notes
- The `bindings.graphql` component is currently in **alpha** status in Dapr. The post does not mention this, which could be noted in a future update to set reader expectations about stability.
- The component YAML configuration (endpoint, header:Authorization with secretKeyRef, header:Content-Type) is correct.
- The Dapr docs URL contains a typo ("graghql" instead of "graphql") — this is an issue on the Dapr docs site itself, not in this blog post.
- For complex variable values (like the OrderInput object in the mutation example), the variable value is passed as a JSON string. This is a limitation of the flat metadata key format.
