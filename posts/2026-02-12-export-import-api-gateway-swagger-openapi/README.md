# How to Export and Import API Gateway Swagger/OpenAPI Definitions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, API Gateway, OpenAPI, DevOps

Description: Learn how to export your API Gateway APIs as OpenAPI/Swagger definitions and import them back to replicate APIs across stages and accounts.

---

Managing API Gateway configurations through the console gets tedious fast, especially when you need to replicate APIs across environments or share definitions with other teams. The better approach is treating your API definition as code using OpenAPI (formerly Swagger) specifications. API Gateway can both export existing APIs to OpenAPI format and import OpenAPI files to create or update APIs.

## Exporting an API to OpenAPI

You can export any REST API to OpenAPI 3.0 or Swagger 2.0 format. The export includes all your resources, methods, integrations, models, and authorizers.

Export your API to OpenAPI 3.0:

```bash
# Export as OpenAPI 3.0 JSON
aws apigateway get-export \
  --rest-api-id abc123api \
  --stage-name prod \
  --export-type oas30 \
  --accepts application/json \
  openapi-export.json

# Export as OpenAPI 3.0 YAML
aws apigateway get-export \
  --rest-api-id abc123api \
  --stage-name prod \
  --export-type oas30 \
  --accepts application/yaml \
  openapi-export.yaml

# Export as Swagger 2.0
aws apigateway get-export \
  --rest-api-id abc123api \
  --stage-name prod \
  --export-type swagger \
  --accepts application/json \
  swagger-export.json
```

## Including API Gateway Extensions

By default, the export only includes the standard OpenAPI definition. To capture API Gateway-specific settings like integrations, authorizers, and CORS configuration, include the extensions.

Export with API Gateway extensions:

```bash
# Export with all API Gateway extensions
aws apigateway get-export \
  --rest-api-id abc123api \
  --stage-name prod \
  --export-type oas30 \
  --parameters extensions=apigateway \
  --accepts application/json \
  openapi-with-extensions.json

# Export with integrations only
aws apigateway get-export \
  --rest-api-id abc123api \
  --stage-name prod \
  --export-type oas30 \
  --parameters extensions=integrations \
  --accepts application/json \
  openapi-integrations.json

# Export with authorizers only
aws apigateway get-export \
  --rest-api-id abc123api \
  --stage-name prod \
  --export-type oas30 \
  --parameters extensions=authorizers \
  --accepts application/json \
  openapi-authorizers.json
```

The `extensions=apigateway` parameter adds `x-amazon-apigateway-*` extensions to the OpenAPI file. These extensions contain the Lambda integrations, request/response mappings, and other AWS-specific configurations.

## Anatomy of an Exported File

Here's what a typical exported OpenAPI file with extensions looks like:

```yaml
openapi: "3.0.1"
info:
  title: "My API"
  version: "2026-02-12"
servers:
  - url: "https://abc123.execute-api.us-east-1.amazonaws.com/{basePath}"
    variables:
      basePath:
        default: "prod"
paths:
  /orders:
    post:
      summary: "Create an order"
      requestBody:
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateOrderRequest"
        required: true
      responses:
        "200":
          description: "Success"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OrderResponse"
      # API Gateway extension - Lambda integration
      x-amazon-apigateway-integration:
        type: "aws_proxy"
        httpMethod: "POST"
        uri: "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789012:function:CreateOrder/invocations"
        passthroughBehavior: "when_no_match"
    get:
      summary: "List orders"
      parameters:
        - name: "status"
          in: "query"
          schema:
            type: "string"
      responses:
        "200":
          description: "Success"
      x-amazon-apigateway-integration:
        type: "aws_proxy"
        httpMethod: "POST"
        uri: "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789012:function:ListOrders/invocations"
        passthroughBehavior: "when_no_match"
components:
  schemas:
    CreateOrderRequest:
      type: "object"
      properties:
        customer_id:
          type: "string"
        items:
          type: "array"
          items:
            type: "object"
            properties:
              product_id:
                type: "string"
              quantity:
                type: "integer"
      required:
        - customer_id
        - items
```

## Importing an OpenAPI Definition

You can create a new API from an OpenAPI file or update an existing one.

Create a new API from an OpenAPI file:

```bash
# Import to create a new REST API
aws apigateway import-rest-api \
  --body fileb://openapi-definition.json \
  --fail-on-warnings

# Import with endpoint type override
aws apigateway import-rest-api \
  --parameters endpointConfigurationTypes=REGIONAL \
  --body fileb://openapi-definition.json
```

Update an existing API:

```bash
# Overwrite the entire API definition
aws apigateway put-rest-api \
  --rest-api-id abc123api \
  --mode overwrite \
  --body fileb://openapi-definition.json

# Merge changes into the existing API (adds new resources, keeps existing)
aws apigateway put-rest-api \
  --rest-api-id abc123api \
  --mode merge \
  --body fileb://openapi-definition.json

# Deploy after import
aws apigateway create-deployment \
  --rest-api-id abc123api \
  --stage-name prod
```

The `overwrite` mode replaces everything. The `merge` mode is safer for incremental changes - it adds new resources and methods without deleting existing ones.

## Building an OpenAPI Definition from Scratch

Instead of exporting and modifying, you can write your OpenAPI file from scratch with API Gateway extensions.

Here's a complete definition you can import directly:

```json
{
  "openapi": "3.0.1",
  "info": {
    "title": "User Management API",
    "version": "1.0.0"
  },
  "paths": {
    "/users": {
      "get": {
        "summary": "List users",
        "operationId": "listUsers",
        "parameters": [
          {
            "name": "limit",
            "in": "query",
            "schema": { "type": "integer", "default": 20 }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": { "$ref": "#/components/schemas/User" }
                }
              }
            }
          }
        },
        "x-amazon-apigateway-integration": {
          "type": "aws_proxy",
          "httpMethod": "POST",
          "uri": {
            "Fn::Sub": "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${ListUsersFunction.Arn}/invocations"
          }
        }
      },
      "post": {
        "summary": "Create user",
        "operationId": "createUser",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/CreateUserRequest" }
            }
          }
        },
        "responses": {
          "201": { "description": "Created" }
        },
        "x-amazon-apigateway-integration": {
          "type": "aws_proxy",
          "httpMethod": "POST",
          "uri": {
            "Fn::Sub": "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${CreateUserFunction.Arn}/invocations"
          }
        },
        "x-amazon-apigateway-request-validator": "ValidateBody"
      }
    }
  },
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "email": { "type": "string" }
        }
      },
      "CreateUserRequest": {
        "type": "object",
        "required": ["name", "email"],
        "properties": {
          "name": { "type": "string", "minLength": 1 },
          "email": { "type": "string", "format": "email" }
        }
      }
    }
  },
  "x-amazon-apigateway-request-validators": {
    "ValidateBody": {
      "validateRequestBody": true,
      "validateRequestParameters": false
    }
  }
}
```

## Automating Cross-Account Replication

A common use case is replicating an API across AWS accounts (dev, staging, prod). Here's a script that exports from one account and imports to another.

This script handles the full cross-account replication workflow:

```python
import boto3
import json
import re

def replicate_api(
    source_api_id,
    source_region,
    source_profile,
    target_region,
    target_profile,
    target_account_id,
):
    """Export an API from one account and import it to another."""

    # Export from source
    source = boto3.Session(profile_name=source_profile)
    source_client = source.client("apigateway", region_name=source_region)

    export = source_client.get_export(
        restApiId=source_api_id,
        stageName="prod",
        exportType="oas30",
        parameters={"extensions": "apigateway"},
        accepts="application/json",
    )

    api_def = json.loads(export["body"].read())

    # Update Lambda ARNs to point to the target account
    api_json = json.dumps(api_def)
    api_json = re.sub(
        r"arn:aws:lambda:[^:]+:\d+:",
        f"arn:aws:lambda:{target_region}:{target_account_id}:",
        api_json,
    )
    api_def = json.loads(api_json)

    # Import to target
    target = boto3.Session(profile_name=target_profile)
    target_client = target.client("apigateway", region_name=target_region)

    result = target_client.import_rest_api(
        body=json.dumps(api_def).encode(),
        failOnWarnings=False,
    )

    print(f"Created API: {result['id']} in {target_region}")
    return result["id"]
```

## CI/CD Integration

Integrate OpenAPI imports into your deployment pipeline. Here's a GitHub Actions example:

```yaml
# .github/workflows/deploy-api.yml
name: Deploy API

on:
  push:
    branches: [main]
    paths:
      - "api/openapi.yaml"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/deploy-role
          aws-region: us-east-1

      - name: Validate OpenAPI spec
        run: npx @apidevtools/swagger-cli validate api/openapi.yaml

      - name: Import API definition
        run: |
          aws apigateway put-rest-api \
            --rest-api-id ${{ vars.API_ID }} \
            --mode overwrite \
            --body fileb://api/openapi.yaml

      - name: Deploy to stage
        run: |
          aws apigateway create-deployment \
            --rest-api-id ${{ vars.API_ID }} \
            --stage-name prod \
            --description "Deployed from commit ${{ github.sha }}"
```

For tracking your API deployments and monitoring for issues after importing new definitions, see our post on [deployment monitoring best practices](https://oneuptime.com/blog/post/2026-02-06-canary-deployment-monitoring-opentelemetry/view).

## Wrapping Up

Treating your API as an OpenAPI definition file brings all the benefits of infrastructure as code - version control, code review, repeatable deployments, and easy replication across environments. Export your existing APIs to get started, then switch to maintaining the OpenAPI file as the source of truth. The import/export workflow makes it easy to keep APIs consistent across stages and accounts.
