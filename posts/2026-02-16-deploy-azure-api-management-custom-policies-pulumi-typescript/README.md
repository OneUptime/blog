# How to Deploy Azure API Management with Custom Policies Using Pulumi TypeScript

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Pulumi, TypeScript, API Management, Infrastructure as Code, API Gateway, DevOps

Description: Deploy Azure API Management with custom inbound and outbound policies using Pulumi TypeScript for type-safe API infrastructure.

---

Azure API Management (APIM) is the standard choice for managing APIs on Azure. It handles authentication, rate limiting, caching, transformation, and a whole lot more. The catch is that APIM configuration is notoriously complex, especially the XML-based policy system. Pulumi with TypeScript brings type safety and programmatic control to this, making it much more manageable than clicking through the portal or writing raw ARM templates.

This post walks through deploying a full APIM instance with custom policies using Pulumi and TypeScript.

## Project Setup

Start by creating a new Pulumi project for your APIM infrastructure.

```bash
# Create a new Pulumi project with TypeScript
mkdir apim-infrastructure && cd apim-infrastructure
pulumi new azure-typescript
```

Install the Azure Native package if it was not included automatically.

```bash
# Install the Azure Native provider for Pulumi
npm install @pulumi/azure-native
```

## Creating the APIM Instance

The APIM service itself is the most expensive part of this stack, so choose your tier carefully. Developer tier works for testing, but production workloads need Standard or Premium.

```typescript
// index.ts
// Main Pulumi program that deploys Azure API Management with custom policies

import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";

// Configuration
const config = new pulumi.Config();
const environment = config.get("environment") || "dev";
const publisherEmail = config.require("publisherEmail");
const publisherName = config.require("publisherName");

// Resource group for all APIM resources
const resourceGroup = new azure.resources.ResourceGroup("apim-rg", {
    resourceGroupName: `rg-apim-${environment}`,
    location: "eastus",
    tags: {
        environment: environment,
        service: "api-management",
    },
});

// API Management service instance
const apimService = new azure.apimanagement.ApiManagementService("apim", {
    serviceName: `apim-myorg-${environment}`,
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    // Publisher info is required
    publisherEmail: publisherEmail,
    publisherName: publisherName,
    // Developer tier for non-production, Standard for production
    sku: {
        name: environment === "production" ? "Standard" : "Developer",
        capacity: 1,
    },
    tags: {
        environment: environment,
    },
});
```

## Defining APIs and Operations

Once the APIM service exists, you can add APIs. Each API represents a backend service you want to expose through the gateway.

```typescript
// Create an API for the orders service
const ordersApi = new azure.apimanagement.Api("orders-api", {
    apiId: "orders-api",
    resourceGroupName: resourceGroup.name,
    serviceName: apimService.name,
    displayName: "Orders API",
    description: "API for managing customer orders",
    // The path prefix for this API
    path: "orders",
    // Supported protocols
    protocols: ["https"],
    // Backend service URL
    serviceUrl: "https://orders-backend.azurewebsites.net/api",
    // API version
    apiRevision: "1",
    // Require subscription key
    subscriptionRequired: true,
    subscriptionKeyParameterNames: {
        header: "X-API-Key",
        query: "api-key",
    },
});

// Define operations (endpoints) on the API
const listOrdersOperation = new azure.apimanagement.ApiOperation("list-orders", {
    operationId: "list-orders",
    resourceGroupName: resourceGroup.name,
    serviceName: apimService.name,
    apiId: ordersApi.apiId!,
    displayName: "List Orders",
    method: "GET",
    urlTemplate: "/",
    description: "Retrieves a list of all orders",
    responses: [
        {
            statusCode: 200,
            description: "Successful response with order list",
        },
    ],
});

const getOrderOperation = new azure.apimanagement.ApiOperation("get-order", {
    operationId: "get-order",
    resourceGroupName: resourceGroup.name,
    serviceName: apimService.name,
    apiId: ordersApi.apiId!,
    displayName: "Get Order by ID",
    method: "GET",
    urlTemplate: "/{orderId}",
    description: "Retrieves a specific order by its ID",
    templateParameters: [
        {
            name: "orderId",
            type: "string",
            required: true,
            description: "The unique order identifier",
        },
    ],
    responses: [
        {
            statusCode: 200,
            description: "Order found",
        },
        {
            statusCode: 404,
            description: "Order not found",
        },
    ],
});
```

## Adding Custom Policies

Policies are where APIM really shines. They let you modify request and response behavior without changing your backend code. Policies are defined in XML and can be applied at different scopes: global, product, API, or operation level.

Here is how to apply a comprehensive policy to the orders API.

```typescript
// Helper function to build policy XML
// Keeps the XML readable and allows dynamic values from Pulumi config
function buildOrdersApiPolicy(rateLimitCalls: number, cacheDuration: number): string {
    return `
<policies>
    <inbound>
        <base />

        <!-- Rate limiting: restrict calls per subscription -->
        <rate-limit-by-key
            calls="${rateLimitCalls}"
            renewal-period="60"
            counter-key="@(context.Subscription.Id)"
            increment-condition="@(context.Response.StatusCode >= 200 && context.Response.StatusCode < 400)" />

        <!-- Validate JWT token from Azure AD -->
        <validate-jwt
            header-name="Authorization"
            failed-validation-httpcode="401"
            failed-validation-error-message="Unauthorized. Access token is missing or invalid.">
            <openid-config url="https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid-configuration" />
            <required-claims>
                <claim name="aud" match="all">
                    <value>{api-audience}</value>
                </claim>
            </required-claims>
        </validate-jwt>

        <!-- Add correlation ID for request tracing -->
        <set-header name="X-Correlation-Id" exists-action="skip">
            <value>@(Guid.NewGuid().ToString())</value>
        </set-header>

        <!-- Set backend URL based on environment header -->
        <set-backend-service base-url="https://orders-backend.azurewebsites.net/api" />

        <!-- IP filtering for additional security -->
        <ip-filter action="allow">
            <address-range from="10.0.0.0" to="10.0.255.255" />
        </ip-filter>
    </inbound>

    <backend>
        <base />
    </backend>

    <outbound>
        <base />

        <!-- Remove internal headers from response -->
        <set-header name="X-Powered-By" exists-action="delete" />
        <set-header name="X-AspNet-Version" exists-action="delete" />

        <!-- Add security headers -->
        <set-header name="X-Content-Type-Options" exists-action="override">
            <value>nosniff</value>
        </set-header>
        <set-header name="X-Frame-Options" exists-action="override">
            <value>DENY</value>
        </set-header>

        <!-- Cache successful GET responses -->
        <cache-store duration="${cacheDuration}" />
    </outbound>

    <on-error>
        <base />

        <!-- Return a consistent error format -->
        <set-body>@{
            var message = context.LastError.Message;
            return new JObject(
                new JProperty("error", new JObject(
                    new JProperty("code", context.Response.StatusCode),
                    new JProperty("message", message),
                    new JProperty("correlationId", context.RequestId)
                ))
            ).ToString();
        }</set-body>

        <set-header name="Content-Type" exists-action="override">
            <value>application/json</value>
        </set-header>
    </on-error>
</policies>`;
}

// Apply the policy to the orders API
const ordersApiPolicy = new azure.apimanagement.ApiPolicy("orders-api-policy", {
    policyId: "policy",
    resourceGroupName: resourceGroup.name,
    serviceName: apimService.name,
    apiId: ordersApi.apiId!,
    // Use the helper function to generate policy XML
    value: buildOrdersApiPolicy(100, 300),
    format: "xml",
});
```

## Operation-Level Policies

Sometimes you need different policies for different endpoints. For example, the list endpoint might benefit from caching while the create endpoint should not be cached.

```typescript
// Operation-level policy for the list endpoint with caching
const listOrdersPolicy = new azure.apimanagement.ApiOperationPolicy("list-orders-policy", {
    policyId: "policy",
    resourceGroupName: resourceGroup.name,
    serviceName: apimService.name,
    apiId: ordersApi.apiId!,
    operationId: listOrdersOperation.operationId!,
    value: `
<policies>
    <inbound>
        <base />
        <!-- Cache lookup for GET requests -->
        <cache-lookup vary-by-developer="false"
                      vary-by-developer-groups="false"
                      downstream-caching-type="none">
            <vary-by-query-parameter>page</vary-by-query-parameter>
            <vary-by-query-parameter>limit</vary-by-query-parameter>
        </cache-lookup>
    </inbound>
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
        <cache-store duration="600" />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>`,
    format: "xml",
});
```

## Products and Subscriptions

APIM uses products to group APIs and manage access. Create products with different access levels.

```typescript
// Free tier product with limited rate
const freeProduct = new azure.apimanagement.Product("free-product", {
    productId: "free-tier",
    resourceGroupName: resourceGroup.name,
    serviceName: apimService.name,
    displayName: "Free Tier",
    description: "Free access with limited rate",
    state: "published",
    subscriptionRequired: true,
    approvalRequired: false,
    subscriptionsLimit: 1,
});

// Associate the orders API with the free product
const freeProductApi = new azure.apimanagement.ProductApi("free-product-orders", {
    resourceGroupName: resourceGroup.name,
    serviceName: apimService.name,
    productId: freeProduct.productId!,
    apiId: ordersApi.apiId!,
});

// Product-level policy for the free tier
const freeProductPolicy = new azure.apimanagement.ProductPolicy("free-product-policy", {
    policyId: "policy",
    resourceGroupName: resourceGroup.name,
    serviceName: apimService.name,
    productId: freeProduct.productId!,
    value: `
<policies>
    <inbound>
        <base />
        <rate-limit calls="10" renewal-period="60" />
        <quota calls="1000" renewal-period="604800" />
    </inbound>
    <backend><base /></backend>
    <outbound><base /></outbound>
    <on-error><base /></on-error>
</policies>`,
    format: "xml",
});
```

## Exporting Outputs

Export the important values so other stacks or CI/CD pipelines can reference them.

```typescript
// Export key outputs for other stacks or CI/CD
export const apimGatewayUrl = apimService.gatewayUrl;
export const apimManagementUrl = apimService.managementApiUrl;
export const resourceGroupName = resourceGroup.name;
export const apimServiceName = apimService.name;
```

## Deploying

Run `pulumi up` to deploy everything.

```bash
# Preview changes first
pulumi preview

# Deploy the stack
pulumi up

# Check outputs
pulumi stack output apimGatewayUrl
```

## Summary

Using Pulumi with TypeScript for APIM gives you real programming language features for managing complex policy configurations. You can use functions to generate policy XML, conditionals for environment-specific settings, and loops for repetitive API definitions. The type safety catches configuration errors at compile time rather than during deployment. This approach scales much better than managing APIM through the portal, and the policies live in version control right next to the infrastructure code.
