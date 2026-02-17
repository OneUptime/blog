# How to Create and Publish APIs in Azure API Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, API Management, REST API, Cloud, Azure Portal

Description: Learn how to create, configure, and publish APIs in Azure API Management so your consumers can start integrating with your services.

---

Azure API Management (APIM) sits between your backend services and the developers who want to consume them. It gives you a single place to define how your APIs behave, who can access them, and what policies apply to each request. If you have been running APIs without a gateway in front of them, you already know the pain of handling authentication, rate limiting, and documentation separately for every service. APIM consolidates all of that.

In this post, I will walk through the full process of creating an API in Azure API Management, attaching it to a backend, and publishing it so that external or internal developers can subscribe and start making calls.

## Prerequisites

Before you start, you need an Azure subscription and an API Management instance. If you do not have one yet, you can create one through the Azure Portal. The Developer tier works fine for testing and development, though it does not come with an SLA. For production workloads, the Standard or Premium tiers are what you want.

You also need a backend API that APIM will proxy requests to. This can be an Azure App Service, an Azure Function, a container running in AKS, or even an on-premises API exposed through a VPN or ExpressRoute.

## Creating an API Management Instance

If you already have an APIM instance, skip ahead. Otherwise, here is how to set one up.

Navigate to the Azure Portal, search for "API Management services," and click Create. Fill in the basics:

- **Resource Group**: Pick an existing one or create a new one.
- **Region**: Choose the region closest to your backend services.
- **Resource Name**: This becomes part of your gateway URL (e.g., `mycompany.azure-api.net`).
- **Organization Name**: Shows up in the developer portal.
- **Pricing Tier**: Developer for testing, Standard or Premium for production.

Provisioning takes a while, sometimes up to 30-45 minutes for the Developer tier. Go grab a coffee.

## Adding Your First API

Once your APIM instance is ready, go to the APIs blade in the left navigation. You will see several options for how to add an API:

- **OpenAPI** - Import from a Swagger/OpenAPI specification
- **WADL** - For older SOAP-style definitions
- **Manually defined** - Build the API definition by hand
- **Azure Resources** - Import directly from Azure Functions, App Services, Logic Apps, etc.

For this walkthrough, let us create one manually so you understand every piece.

Click "Add API" and select "Blank API." Fill in the form:

- **Display name**: Something human-readable, like "Order Service API"
- **Name**: Auto-generated from the display name, used internally
- **Web service URL**: The base URL of your backend, e.g., `https://my-order-service.azurewebsites.net`
- **API URL suffix**: The path segment in the APIM gateway URL, e.g., `orders`
- **Products**: Leave blank for now; we will handle this when publishing

After saving, your API exists in APIM but has no operations yet.

## Defining Operations

An operation maps to a specific endpoint on your backend. For a typical REST API, you will have operations like GET /items, POST /items, GET /items/{id}, and so on.

Click "Add operation" and fill in:

- **Display name**: "Get All Orders"
- **HTTP verb**: GET
- **URL template**: `/` (relative to the API URL suffix)

Save it. Now add another:

- **Display name**: "Get Order By ID"
- **HTTP verb**: GET
- **URL template**: `/{orderId}`

And one more for creating orders:

- **Display name**: "Create Order"
- **HTTP verb**: POST
- **URL template**: `/`

For the POST operation, you should also define the request body schema. Go to the Request tab, add a representation with content type `application/json`, and paste in a sample schema. This is not strictly required for APIM to proxy the request, but it makes the developer portal documentation much more useful.

## Testing Your API in the Portal

Before publishing to anyone, test that things work. Go to the Test tab for any operation. APIM provides a built-in test console where you can set headers, query parameters, and request bodies, then send the request through the gateway to your backend.

If you see a 200 response with the expected payload, your wiring is correct. If you get a 500 or a connection error, double-check the Web service URL and make sure your backend is reachable from APIM. Common issues include NSG rules blocking traffic or the backend requiring authentication that you have not configured in APIM yet.

## Configuring Backend Authentication

Most backends are not wide open. If your backend expects an API key or a bearer token, you need to configure APIM to send those credentials.

The cleanest way to handle this is with a Named Value and an inbound policy. First, create a Named Value (under the Named values blade) with your backend API key. Mark it as Secret so it is encrypted at rest.

Then add an inbound policy to your API that attaches the key to every outbound request:

```xml
<!-- This policy adds a custom header with the backend API key to every request -->
<inbound>
    <base />
    <set-header name="x-api-key" exists-action="override">
        <value>{{backend-api-key}}</value>
    </set-header>
</inbound>
```

The double curly braces reference the Named Value by name. This way, the actual secret never appears in your policy definitions.

## Creating a Product

In APIM, a Product is the container that you publish to developers. Think of it as a package that bundles one or more APIs together with usage terms, rate limits, and subscription requirements.

Go to the Products blade and click "Add." Fill in:

- **Display name**: "Order Service - Standard"
- **Description**: Explain what the product includes
- **State**: Not published (for now)
- **Requires subscription**: Yes (so developers need a key)
- **Requires approval**: Up to you. If yes, admins must approve each subscription request.

After creating the product, go to its APIs tab and add the Order Service API you created earlier.

## Publishing the API

Publishing means making the product (and its APIs) visible in the developer portal and available for subscription.

Go back to the product, change the State to "Published," and save. That is it. The API is now live.

Developers visiting your developer portal at `https://yourinstance.developer.azure-api.net` will see the product listed. They can subscribe, get a subscription key, and start making API calls.

## Subscription Keys and How They Work

When a developer subscribes to a product, they get a primary and secondary key. They must include one of these keys in their API requests, either as a query parameter (`subscription-key`) or as a header (`Ocp-Apim-Subscription-Key`).

Here is an example curl call using the header approach:

```bash
# Call the Get All Orders endpoint through the APIM gateway
# The Ocp-Apim-Subscription-Key header authenticates the consumer
curl -H "Ocp-Apim-Subscription-Key: abc123def456" \
     https://mycompany.azure-api.net/orders/
```

If the key is missing or invalid, APIM returns a 401 before the request ever reaches your backend. This is your first line of defense.

## Setting Up the Developer Portal

The developer portal is a customizable website that APIM generates for you. It includes interactive API documentation (generated from your operation definitions), subscription management, and code samples in multiple languages.

To customize it, go to the Developer Portal blade and click "Developer portal" to open the visual editor. You can change the layout, add pages, update branding, and configure authentication providers (Azure AD, B2C, basic username/password).

Once you are happy with the customizations, click "Publish" inside the portal editor. This pushes your changes live.

## Monitoring API Usage

After publishing, you will want to keep an eye on how your APIs are being used. The Analytics blade in APIM gives you dashboards showing request counts, response times, failure rates, and bandwidth consumption, broken down by API, operation, product, or subscription.

For deeper monitoring, integrate with Application Insights. This gives you end-to-end request tracing, custom alerts, and the ability to query raw telemetry with KQL.

## Common Mistakes to Avoid

A few things I have seen trip people up:

1. **Forgetting to publish the product.** The API exists in APIM, but nobody can see or subscribe to it until the product is published.

2. **Not setting CORS policies.** If your API is called from a browser-based SPA, you need CORS headers. APIM does not add them by default.

3. **Using the Consumption tier for everything.** The Consumption tier is cheap and serverless, but it has limitations - no built-in developer portal, no VNet integration, and cold start latency.

4. **Ignoring API versioning from the start.** It is much easier to set up versioning before you have consumers than to retrofit it later.

## Wrapping Up

Creating and publishing APIs in Azure API Management is straightforward once you understand the hierarchy: APIs contain operations, products contain APIs, and subscriptions grant access to products. The gateway handles the proxying, the policies handle the cross-cutting concerns, and the developer portal handles the documentation.

Start with a single API, get comfortable with the flow, and then layer on policies for rate limiting, caching, and transformation as your needs grow. The investment in setting up APIM properly pays off quickly as your API surface area expands.
