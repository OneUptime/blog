# How to Import OpenAPI Specifications into Azure API Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, API Management, OpenAPI, Swagger, API Documentation, REST API

Description: Learn how to import OpenAPI (Swagger) specifications into Azure API Management to automatically create API definitions with operations and schemas.

---

If your APIs already have an OpenAPI specification (formerly known as Swagger), importing them into Azure API Management is the fastest way to get started. Instead of manually defining every operation, request schema, and response format, you hand APIM the spec file and it creates everything for you - operations, parameters, request/response schemas, and even documentation that shows up in the developer portal.

In this post, I will walk through the import process for both OpenAPI 2.0 (Swagger) and OpenAPI 3.0 specs, cover the common issues you will run into, and show you how to keep your APIM definition in sync as your spec evolves.

## What Gets Imported

When you import an OpenAPI specification, APIM creates:

- **API definition**: The top-level API with display name, description, and base URL
- **Operations**: One operation per path/method combination in the spec
- **Request parameters**: Path parameters, query parameters, and header parameters
- **Request body schemas**: JSON schemas for request payloads
- **Response schemas**: JSON schemas for each response status code
- **Tags**: Operation groupings based on OpenAPI tags

What does NOT get imported:

- **Security schemes**: The spec might define OAuth2 flows, but APIM does not automatically configure JWT validation policies. You still need to add those manually.
- **Server URLs**: APIM uses its own gateway URL. The server URLs in the spec are only used to set the initial backend URL.
- **Custom extensions** (x- properties): These are ignored during import.

## Importing from the Azure Portal

The simplest way to import is through the portal. Go to your APIM instance, click "APIs," and select "OpenAPI" from the import options.

You have three ways to provide the spec:

1. **URL**: Point to a publicly accessible URL where your spec is hosted (e.g., `https://myapi.com/swagger.json`)
2. **File**: Upload a JSON or YAML file from your local machine
3. **Paste**: Copy and paste the spec content directly

Fill in the additional fields:

- **Display name**: Auto-populated from the spec's `info.title`, but you can override it
- **Name**: Auto-generated, used in URLs
- **API URL suffix**: The path segment in the APIM gateway URL
- **Products**: Optionally assign to a product immediately
- **Gateways**: Choose managed gateway, self-hosted, or both

Click "Create" and APIM parses the spec and creates everything.

## Importing with the Azure CLI

For automation and CI/CD pipelines, use the Azure CLI:

```bash
# Import an OpenAPI 3.0 spec from a URL
# This creates or updates the API in APIM
az apim api import \
    --resource-group my-rg \
    --service-name my-apim \
    --api-id order-service \
    --path orders \
    --specification-format OpenApi \
    --specification-url "https://myapi.com/openapi.json" \
    --display-name "Order Service API"
```

For a local file:

```bash
# Import an OpenAPI spec from a local file
az apim api import \
    --resource-group my-rg \
    --service-name my-apim \
    --api-id order-service \
    --path orders \
    --specification-format OpenApiJson \
    --specification-path ./openapi.json \
    --display-name "Order Service API"
```

Use `OpenApiJson` for JSON format and `OpenApi` for YAML. For Swagger 2.0 specs, use `Swagger` as the format.

## Importing with ARM Templates or Bicep

For infrastructure-as-code deployments, you can include the API import in your ARM template or Bicep file:

```json
{
    "type": "Microsoft.ApiManagement/service/apis",
    "apiVersion": "2021-08-01",
    "name": "[concat(parameters('apimServiceName'), '/order-service')]",
    "properties": {
        "displayName": "Order Service API",
        "path": "orders",
        "protocols": ["https"],
        "format": "openapi+json",
        "value": "[variables('openapiSpec')]",
        "serviceUrl": "https://my-backend.azurewebsites.net"
    }
}
```

You can either inline the spec content in the template (for small specs) or reference a URL.

## Handling Import Errors

Imports do not always go smoothly. Here are the most common issues and how to fix them.

**"Invalid specification" error**: Your spec has syntax errors. Validate it with the Swagger Editor (editor.swagger.io) before importing. Common issues include missing required fields, invalid $ref pointers, and malformed JSON.

**Operations are missing**: If your spec uses features that APIM does not support, those operations might be skipped. Check the import warnings. Common culprits:
- `anyOf` / `oneOf` in request bodies (limited support in older APIM versions)
- Complex parameter serialization styles
- Callback URLs

**Wrong backend URL**: APIM picks the first server URL from the spec as the backend URL. If your spec lists multiple servers or uses variables in the URL, you might need to manually set the correct backend URL after import.

**Duplicate operation IDs**: If your spec has duplicate operationId values, APIM will fail to import. Each operationId must be unique across all operations.

## Keeping the Spec in Sync

APIs evolve. When your backend team updates the OpenAPI spec, you need to update APIM. There are a few approaches.

**Manual re-import**: Go to the API in APIM, click the three-dot menu, and select "Import." Choose your updated spec. APIM will add new operations, update existing ones, and optionally remove operations that are no longer in the spec.

Be careful with the re-import behavior. By default, APIM merges the new spec with the existing API definition. Operations that exist in APIM but not in the new spec are preserved. If you want a strict sync (removing operations not in the spec), check the "Delete operations not present in the spec" option.

**CI/CD pipeline**: The best approach for teams. Include the APIM import as a step in your deployment pipeline:

```yaml
# Azure DevOps pipeline step to sync OpenAPI spec with APIM
# Runs after the backend service is deployed
- task: AzureCLI@2
  displayName: 'Sync API spec to APIM'
  inputs:
    azureSubscription: 'my-azure-connection'
    scriptType: 'bash'
    scriptLocation: 'inlineScript'
    inlineScript: |
      az apim api import \
        --resource-group $(resourceGroup) \
        --service-name $(apimName) \
        --api-id order-service \
        --path orders \
        --specification-format OpenApiJson \
        --specification-path $(Build.ArtifactStagingDirectory)/openapi.json
```

**Auto-generation from code**: If your backend generates the OpenAPI spec from code annotations (like Swashbuckle for .NET or springdoc for Java), the spec is always in sync with the code. Combine this with a CI/CD import step and you have a fully automated pipeline from code to API gateway.

## OpenAPI 3.0 vs 2.0 Considerations

APIM supports both OpenAPI 2.0 (Swagger) and OpenAPI 3.0, but there are differences in how they are handled.

OpenAPI 3.0 features that APIM supports well:
- Multiple server URLs (first one is used as backend)
- Request body definitions with `content` media types
- Component schemas with `$ref`
- Path and query parameters

OpenAPI 3.0 features with limited support:
- `oneOf` / `anyOf` / `allOf` schema composition (partial support)
- Callbacks and webhooks (not imported)
- Links between operations (not imported)
- Cookie parameters (limited)

If your spec uses advanced OpenAPI 3.0 features, test the import in a development APIM instance first to see what gets created.

## Exporting the Spec from APIM

You can also go the other direction - export your APIM API definition as an OpenAPI spec. This is useful if you built the API definition manually in APIM and want to generate documentation or client SDKs.

```bash
# Export the API definition as an OpenAPI 3.0 JSON spec
az apim api export \
    --resource-group my-rg \
    --service-name my-apim \
    --api-id order-service \
    --export-format openapi+json-link
```

The exported spec includes all operations, schemas, and descriptions. You can then use tools like Swagger Codegen or OpenAPI Generator to create client SDKs in any language.

## Best Practices

A few recommendations from working with OpenAPI imports in APIM:

1. **Always validate your spec before importing.** Use the Swagger Editor or a linting tool like Spectral to catch issues early.

2. **Use operationId consistently.** APIM uses the operationId as the internal name for each operation. If you change it between imports, APIM treats it as a different operation.

3. **Include descriptions everywhere.** The `description` fields in your spec become the documentation in the developer portal. Well-documented specs produce well-documented portals.

4. **Version your specs.** Keep your OpenAPI specs in version control alongside your code. This makes it easy to track changes and roll back if an import breaks something.

5. **Test in a dev instance first.** If you are importing a large or complex spec, try it in a Developer tier APIM instance first. This avoids surprises in production.

## Summary

Importing OpenAPI specifications into Azure API Management is the most efficient way to create API definitions. Whether you import through the portal, the CLI, or a CI/CD pipeline, the process creates operations, schemas, and documentation automatically. Keep your specs validated, version-controlled, and synced through automation, and your APIM definitions will always match your actual backend APIs.
