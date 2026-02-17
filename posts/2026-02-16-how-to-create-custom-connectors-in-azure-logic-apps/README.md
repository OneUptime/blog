# How to Create Custom Connectors in Azure Logic Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Logic Apps, Custom Connectors, API Integration, OpenAPI, Workflow Automation, REST API

Description: Build custom connectors for Azure Logic Apps to integrate any REST API into your workflow automations using OpenAPI specifications.

---

Azure Logic Apps comes with hundreds of built-in connectors for services like Office 365, Salesforce, SQL Server, and more. But when you need to connect to your own APIs or a third-party service that does not have an official connector, you build a custom connector. A custom connector wraps any REST API and makes it available as drag-and-drop actions in the Logic Apps designer.

## What Is a Custom Connector?

A custom connector is an OpenAPI (Swagger) definition of your REST API, packaged with authentication configuration and optional custom code (using C# scripts). Once created, it appears in the Logic Apps connector gallery alongside the built-in connectors. Anyone in your organization can use it in their workflows without knowing the underlying API details.

## Prerequisites

Before creating a custom connector, you need:

- A REST API with documented endpoints (ideally with an OpenAPI/Swagger spec)
- The API must be accessible over HTTPS
- Authentication mechanism (API key, OAuth 2.0, or Basic auth)

## Step 1: Create or Obtain the OpenAPI Specification

If your API already has a Swagger/OpenAPI spec, you are ahead of the game. If not, create one. Here is a minimal OpenAPI 2.0 spec for a hypothetical inventory API.

```json
{
  "swagger": "2.0",
  "info": {
    "title": "Inventory API",
    "description": "Manage product inventory levels",
    "version": "1.0"
  },
  "host": "api.mycompany.com",
  "basePath": "/v1",
  "schemes": ["https"],
  "consumes": ["application/json"],
  "produces": ["application/json"],
  "paths": {
    "/products": {
      "get": {
        "operationId": "ListProducts",
        "summary": "List all products",
        "description": "Returns a list of all products in inventory",
        "parameters": [
          {
            "name": "category",
            "in": "query",
            "type": "string",
            "description": "Filter by product category",
            "required": false
          }
        ],
        "responses": {
          "200": {
            "description": "Successful response",
            "schema": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/Product"
              }
            }
          }
        }
      },
      "post": {
        "operationId": "CreateProduct",
        "summary": "Create a new product",
        "description": "Adds a new product to the inventory",
        "parameters": [
          {
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "$ref": "#/definitions/CreateProductRequest"
            }
          }
        ],
        "responses": {
          "201": {
            "description": "Product created",
            "schema": {
              "$ref": "#/definitions/Product"
            }
          }
        }
      }
    },
    "/products/{productId}": {
      "get": {
        "operationId": "GetProduct",
        "summary": "Get a product by ID",
        "parameters": [
          {
            "name": "productId",
            "in": "path",
            "type": "string",
            "required": true
          }
        ],
        "responses": {
          "200": {
            "description": "Product found",
            "schema": {
              "$ref": "#/definitions/Product"
            }
          }
        }
      },
      "put": {
        "operationId": "UpdateStock",
        "summary": "Update product stock level",
        "parameters": [
          {
            "name": "productId",
            "in": "path",
            "type": "string",
            "required": true
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "$ref": "#/definitions/StockUpdate"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Stock updated",
            "schema": {
              "$ref": "#/definitions/Product"
            }
          }
        }
      }
    }
  },
  "definitions": {
    "Product": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "category": { "type": "string" },
        "stock": { "type": "integer" },
        "price": { "type": "number" },
        "lastUpdated": { "type": "string", "format": "date-time" }
      }
    },
    "CreateProductRequest": {
      "type": "object",
      "required": ["name", "category", "stock", "price"],
      "properties": {
        "name": { "type": "string" },
        "category": { "type": "string" },
        "stock": { "type": "integer" },
        "price": { "type": "number" }
      }
    },
    "StockUpdate": {
      "type": "object",
      "required": ["stock"],
      "properties": {
        "stock": { "type": "integer" },
        "reason": { "type": "string" }
      }
    }
  },
  "securityDefinitions": {
    "apiKey": {
      "type": "apiKey",
      "name": "X-API-Key",
      "in": "header"
    }
  },
  "security": [
    {
      "apiKey": []
    }
  ]
}
```

## Step 2: Create the Custom Connector

You can create the connector through the Azure Portal or through the CLI/PowerShell.

### Using the Azure Portal

1. Navigate to your Logic Apps resource or go to the Custom Connectors blade
2. Click "New custom connector"
3. Choose "Import an OpenAPI file" and upload your spec
4. Configure the general settings (icon, color, description)
5. Set up authentication
6. Review and create

### Using PowerShell

```powershell
# Install the required module
Install-Module -Name Microsoft.PowerApps.Administration.PowerShell

# Create the connector from an OpenAPI file
New-CustomConnector `
  -EnvironmentName "Default-{tenant-id}" `
  -ConnectorName "InventoryAPI" `
  -OpenApiDefinitionFile "./inventory-api-swagger.json" `
  -Description "Custom connector for the Inventory API"
```

## Step 3: Configure Authentication

In the connector configuration, set up the authentication method your API uses.

**API Key authentication:**
- Parameter label: "API Key"
- Parameter name: "X-API-Key"
- Parameter location: Header

**OAuth 2.0 authentication** (for Azure AD protected APIs):
- Identity provider: Azure Active Directory
- Client ID: Your app registration's client ID
- Client secret: Your app registration's secret
- Authorization URL: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize`
- Token URL: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`
- Scope: `api://{app-id}/.default`

## Step 4: Test the Connector

Before using the connector in workflows, test each operation.

```bash
# Test the connector using the Logic Apps REST API
# First, create a connection using the connector
az rest --method POST \
  --uri "https://management.azure.com/subscriptions/{sub-id}/resourceGroups/rg-workflows/providers/Microsoft.Web/connections/conn-inventory?api-version=2016-06-01" \
  --body '{
    "properties": {
      "api": {
        "id": "/subscriptions/{sub-id}/providers/Microsoft.Web/customApis/InventoryAPI"
      },
      "parameterValues": {
        "api_key": "your-api-key"
      }
    },
    "location": "eastus2"
  }'
```

## Step 5: Use the Connector in a Workflow

Once the connector is created and a connection is established, use it in your workflow definitions.

```json
{
  "definition": {
    "actions": {
      "Get_Product": {
        "type": "ApiConnection",
        "inputs": {
          "host": {
            "connection": {
              "name": "@parameters('$connections')['inventoryapi']['connectionId']"
            }
          },
          "method": "get",
          "path": "/products/@{triggerBody()?['productId']}"
        },
        "runAfter": {}
      },
      "Check_Stock_Level": {
        "type": "If",
        "expression": {
          "less": ["@body('Get_Product')?['stock']", 10]
        },
        "actions": {
          "Send_Low_Stock_Alert": {
            "type": "ApiConnection",
            "inputs": {
              "host": {
                "connection": {
                  "name": "@parameters('$connections')['office365']['connectionId']"
                }
              },
              "method": "post",
              "path": "/v2/Mail",
              "body": {
                "To": "inventory@mycompany.com",
                "Subject": "Low Stock Alert: @{body('Get_Product')?['name']}",
                "Body": "Product @{body('Get_Product')?['name']} has only @{body('Get_Product')?['stock']} units remaining."
              }
            },
            "runAfter": {}
          }
        },
        "runAfter": {
          "Get_Product": ["Succeeded"]
        }
      }
    },
    "triggers": {
      "Recurrence": {
        "type": "Recurrence",
        "recurrence": {
          "frequency": "Hour",
          "interval": 1
        }
      }
    }
  }
}
```

## Adding Custom Code (Code Transformations)

Custom connectors support C# script for transforming requests and responses. This is useful when your API returns data in a format that does not map well to the connector schema.

```csharp
// Custom code to transform the API response
public class Script : ScriptBase
{
    public override async Task<HttpResponseMessage> ExecuteAsync()
    {
        // Forward the request to the API
        var response = await this.Context.SendAsync(
            this.Context.Request,
            this.CancellationToken
        );

        // If the operation is ListProducts, transform the response
        if (this.Context.OperationId == "ListProducts")
        {
            var content = await response.Content.ReadAsStringAsync();
            var products = JArray.Parse(content);

            // Add a computed field to each product
            foreach (var product in products)
            {
                var stock = product["stock"].Value<int>();
                product["stockStatus"] = stock > 10 ? "In Stock"
                    : stock > 0 ? "Low Stock"
                    : "Out of Stock";
            }

            response.Content = CreateJsonContent(products.ToString());
        }

        return response;
    }
}
```

## Sharing Connectors Across Your Organization

Custom connectors can be shared within your Azure tenant. Other teams can use your connector in their Logic Apps without rebuilding it.

To share, navigate to the connector in the Azure Portal and use the "Share" option to grant access to specific users or groups. Each user creates their own connection (with their own credentials), but they all use the same connector definition.

## Connector Design Best Practices

Keep your operation IDs descriptive and unique. They become the action names in the workflow designer.

Provide detailed descriptions for every parameter. These show up as help text in the designer.

Use meaningful response schemas. The designer uses the schema to generate dynamic content tokens that workflow authors pick from dropdown menus.

Version your connector. When your API changes, create a new version of the connector rather than modifying the existing one to avoid breaking existing workflows.

Test with real-world data before publishing. Edge cases in your API (null fields, empty arrays, large responses) can cause issues in workflows.

## Summary

Custom connectors extend Logic Apps to work with any REST API. Start with a solid OpenAPI specification, configure authentication properly, add custom code if you need response transformations, and share the connector with your team. Once built, your custom API becomes a first-class citizen in the Logic Apps designer, just as easy to use as any built-in connector.
