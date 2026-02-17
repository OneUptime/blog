# How to Implement GraphQL APIs in Azure API Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, API Management, GraphQL, API Gateway, Query Optimization, Cloud

Description: Learn how to add GraphQL APIs to Azure API Management with schema import, resolver configuration, and query validation policies.

---

GraphQL has become a popular alternative to REST for APIs where clients need flexibility in what data they request. Azure API Management supports GraphQL APIs as a first-class citizen, letting you import GraphQL schemas, validate queries at the gateway, apply policies, and even create synthetic GraphQL APIs that resolve against REST or other backends.

In this post, I will cover both pass-through GraphQL (proxying to an existing GraphQL backend) and synthetic GraphQL (building a GraphQL layer on top of REST APIs using APIM resolvers).

## Pass-Through GraphQL API

If you already have a GraphQL backend, the simplest approach is to proxy it through APIM. This gives you all the gateway benefits (authentication, rate limiting, monitoring) without changing your backend.

Go to your APIM instance, click "APIs," and select "GraphQL" from the add options. Choose "Pass-through GraphQL."

Fill in the details:

- **Display name**: "Product Catalog GraphQL"
- **API URL suffix**: `graphql/products`
- **GraphQL API endpoint**: The URL of your GraphQL backend, e.g., `https://my-graphql-service.azurewebsites.net/graphql`
- **Schema**: Upload your GraphQL schema file (.graphql or .gql), or let APIM introspect the backend

After importing, APIM creates an API with a single POST operation that accepts GraphQL queries. The schema is stored in APIM and used for validation and documentation in the developer portal.

## Importing a GraphQL Schema

Whether you use pass-through or synthetic GraphQL, you need a schema. Here is an example schema for a product catalog:

```graphql
# Product catalog GraphQL schema
# Defines the types and queries available to clients
type Product {
    id: ID!
    name: String!
    description: String
    price: Float!
    category: Category
    inStock: Boolean!
}

type Category {
    id: ID!
    name: String!
    products: [Product!]!
}

type Query {
    product(id: ID!): Product
    products(category: String, limit: Int = 10): [Product!]!
    categories: [Category!]!
}

type Mutation {
    createProduct(input: ProductInput!): Product!
    updateProduct(id: ID!, input: ProductInput!): Product!
}

input ProductInput {
    name: String!
    description: String
    price: Float!
    categoryId: ID!
}
```

Upload this schema during API creation or update it later in the API's Schema tab.

## Query Validation Policies

One of the biggest advantages of handling GraphQL at the gateway is query validation. You can enforce limits on query complexity, depth, and size before the request reaches your backend. This prevents abusive queries that could overwhelm your backend (the classic N+1 or deeply nested query problem).

```xml
<!-- Validate GraphQL queries to prevent abuse -->
<!-- Limits query depth to 5 levels and restricts field count -->
<inbound>
    <base />
    <validate-graphql-request
        error-variable-name="graphql-errors"
        max-depth="5"
        max-size="10240">
        <!-- Block introspection queries in production -->
        <authorize>
            <rule path="/__schema" action="reject" />
            <rule path="/__type" action="reject" />
        </authorize>
    </validate-graphql-request>
</inbound>
```

This policy:
- Rejects queries deeper than 5 levels of nesting
- Rejects query documents larger than 10KB
- Blocks introspection queries (which expose your schema to potential attackers)

## Blocking Specific Operations

You can selectively allow or block specific queries and mutations:

```xml
<!-- Allow all queries but restrict mutations to authenticated users -->
<inbound>
    <base />
    <validate-graphql-request error-variable-name="graphql-errors">
        <authorize>
            <!-- Allow all queries -->
            <rule path="/Query/*" action="allow" />
            <!-- Block mutations unless the user has the 'writer' role -->
            <rule path="/Mutation/*" action="@{
                var jwt = (Jwt)context.Variables["jwt"];
                return jwt.Claims["roles"]?.Contains("writer") == true ? "allow" : "reject";
            }" />
        </authorize>
    </validate-graphql-request>
</inbound>
```

## Synthetic GraphQL with Resolvers

This is where things get really interesting. Synthetic GraphQL lets you create a GraphQL API in APIM that does not have a GraphQL backend at all. Instead, APIM resolves each field by calling REST APIs, databases, or other data sources.

This is useful when:
- You want to offer a GraphQL interface over existing REST APIs
- You want to aggregate data from multiple services into a single GraphQL query
- You are migrating from REST to GraphQL gradually

To set it up, create a "Synthetic GraphQL" API in APIM and upload your schema. Then configure resolvers for each field that needs data.

## Configuring Resolvers

A resolver tells APIM how to fetch data for a specific field. It is essentially a policy that makes an HTTP call and maps the response to the GraphQL type.

For example, to resolve the `products` query against a REST API:

```xml
<!-- Resolver for Query.products -->
<!-- Calls the REST backend and maps the response to the GraphQL Product type -->
<http-data-source>
    <http-request>
        <set-method>GET</set-method>
        <set-url>@{
            var category = context.GraphQL.Arguments["category"];
            var limit = context.GraphQL.Arguments["limit"];
            var url = "https://products-api.azurewebsites.net/api/products";
            var query = new List<string>();
            if (category != null) query.Add($"category={category}");
            if (limit != null) query.Add($"limit={limit}");
            return query.Count > 0 ? $"{url}?{string.Join("&", query)}" : url;
        }</set-url>
        <set-header name="Authorization" exists-action="override">
            <value>Bearer {{backend-token}}</value>
        </set-header>
    </http-request>
    <http-response>
        <set-body>@{
            var response = context.Response.Body.As<JArray>();
            return response.ToString();
        }</set-body>
    </http-response>
</http-data-source>
```

For resolving a nested field like `Category.products`:

```xml
<!-- Resolver for Category.products -->
<!-- Fetches products for a specific category using the parent category ID -->
<http-data-source>
    <http-request>
        <set-method>GET</set-method>
        <set-url>@{
            var categoryId = context.GraphQL.Parent["id"];
            return $"https://products-api.azurewebsites.net/api/categories/{categoryId}/products";
        }</set-url>
    </http-request>
</http-data-source>
```

The `context.GraphQL.Parent` property gives you access to the parent object's resolved fields, which is how you handle nested relationships.

## Rate Limiting GraphQL APIs

Rate limiting GraphQL is trickier than REST because a single GraphQL query can request vastly different amounts of data. A simple request-count rate limit does not capture the true cost of a query.

Consider combining approaches:

```xml
<!-- Rate limit by both request count and query complexity -->
<inbound>
    <base />
    <!-- Basic rate limit: max 100 queries per minute -->
    <rate-limit-by-key
        calls="100"
        renewal-period="60"
        counter-key="@(context.Subscription.Id)" />

    <!-- Reject overly complex queries -->
    <validate-graphql-request max-depth="5" max-size="10240" />
</inbound>
```

For more sophisticated cost-based rate limiting, you would need to calculate the query cost (based on field complexity weights) and use a custom policy expression to enforce cost-based quotas.

## Caching GraphQL Responses

Caching GraphQL is different from REST because every query can request different fields. The built-in response caching policy works, but the cache key needs to include the query body:

```xml
<!-- Cache GraphQL responses based on the full query text -->
<!-- Different queries get different cache entries -->
<inbound>
    <base />
    <cache-lookup-value
        key="@(context.Request.Body.As<string>(preserveContent: true).GetHashCode().ToString())"
        variable-name="cachedResponse" />
    <choose>
        <when condition="@(context.Variables.ContainsKey("cachedResponse"))">
            <return-response>
                <set-status code="200" reason="OK" />
                <set-header name="Content-Type" exists-action="override">
                    <value>application/json</value>
                </set-header>
                <set-body>@((string)context.Variables["cachedResponse"])</set-body>
            </return-response>
        </when>
    </choose>
</inbound>
<outbound>
    <base />
    <cache-store-value
        key="@(context.Request.Body.As<string>(preserveContent: true).GetHashCode().ToString())"
        value="@(context.Response.Body.As<string>(preserveContent: true))"
        duration="120" />
</outbound>
```

## Developer Portal for GraphQL

The APIM developer portal renders GraphQL APIs with an interactive query editor (similar to GraphiQL or GraphQL Playground). Developers can:

- Browse the schema with type definitions and field descriptions
- Write and execute queries interactively
- See autocompletion based on the schema
- Test mutations

This is a major productivity boost for GraphQL API consumers and one of the key benefits of running GraphQL through APIM.

## Monitoring GraphQL APIs

GraphQL monitoring requires looking beyond HTTP status codes. A GraphQL response can return HTTP 200 with errors in the response body. Add monitoring for:

- Query depth and complexity trends
- Most-queried fields (helps optimize resolver performance)
- Error rates within GraphQL responses (not just HTTP errors)
- Resolver latency for synthetic GraphQL APIs

```xml
<!-- Log GraphQL query details for monitoring -->
<outbound>
    <base />
    <trace source="graphql-monitoring" severity="information">
        <message>@($"GraphQL query executed in {context.Elapsed.TotalMilliseconds}ms")</message>
        <metadata name="querySize" value="@(context.Request.Body.As<string>(preserveContent: true).Length.ToString())" />
    </trace>
</outbound>
```

## Summary

Azure API Management brings GraphQL APIs into the same management plane as your REST APIs. Use pass-through mode to proxy an existing GraphQL backend with gateway policies. Use synthetic mode to build a GraphQL layer over REST APIs using resolvers. Either way, leverage query validation to prevent abuse, apply standard APIM policies for authentication and rate limiting, and take advantage of the developer portal's interactive GraphQL editor. The combination gives your API consumers the flexibility of GraphQL with the operational controls of an API gateway.
