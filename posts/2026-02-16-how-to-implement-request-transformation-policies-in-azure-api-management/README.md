# How to Implement Request Transformation Policies in Azure API Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, API Management, Policy, Request Transformation, API Gateway, Cloud

Description: Learn how to use Azure API Management policies to transform requests and responses, including header manipulation, body rewriting, and URL rewriting.

---

One of the most powerful features of Azure API Management is its policy engine. Policies let you modify requests before they reach your backend and transform responses before they go back to the client. This is incredibly useful when your API gateway's contract differs from your backend's contract - maybe you are migrating from one backend to another, integrating a legacy service with a modern API design, or simply adding headers that your backend expects.

In this post, I will cover the most common request and response transformation patterns with real policy examples that you can adapt for your own APIs.

## Understanding the Policy Pipeline

Every request that flows through APIM passes through four policy sections:

1. **Inbound**: Runs before the request is forwarded to the backend
2. **Backend**: Runs just before the request reaches the backend (used for backend-specific routing)
3. **Outbound**: Runs after the backend responds, before the response goes to the client
4. **On-error**: Runs when an error occurs in any other section

Request transformations go in the inbound section. Response transformations go in the outbound section. The `<base />` tag in each section applies policies inherited from broader scopes (all APIs, product, API level).

## Setting and Removing Headers

The most common transformation is manipulating headers. Maybe your backend expects a correlation ID, or you want to strip internal headers before sending the response to the client.

Adding a header to the request:

```xml
<!-- Add a unique correlation ID to every request for tracing -->
<!-- The backend can use this ID for logging and debugging -->
<inbound>
    <base />
    <set-header name="X-Correlation-Id" exists-action="skip">
        <value>@(Guid.NewGuid().ToString())</value>
    </set-header>
</inbound>
```

The `exists-action` attribute controls what happens if the header already exists:
- `override`: Replace the existing value
- `skip`: Keep the existing value, do not add a new one
- `append`: Add the value as an additional header entry
- `delete`: Remove the header entirely

Removing internal headers from the response:

```xml
<!-- Strip internal headers before sending the response to the client -->
<!-- These headers contain implementation details that should not be exposed -->
<outbound>
    <base />
    <set-header name="X-Powered-By" exists-action="delete" />
    <set-header name="X-AspNet-Version" exists-action="delete" />
    <set-header name="Server" exists-action="delete" />
</outbound>
```

## Rewriting the URL

Sometimes the URL your consumers call is different from the URL your backend expects. Maybe your consumer calls `/api/customers/123` but your backend expects `/legacy/v2/cust?id=123`.

```xml
<!-- Rewrite the URL path to match the backend's expected format -->
<!-- Consumer calls: /api/customers/123 -->
<!-- Backend receives: /legacy/v2/cust?id=123 -->
<inbound>
    <base />
    <rewrite-uri template="/legacy/v2/cust?id={customerId}" copy-unmatched-params="false" />
</inbound>
```

The `{customerId}` placeholder maps to the URL template parameter defined in the operation. If the operation URL template is `/{customerId}`, then the value from the URL is inserted into the rewrite template.

For more complex URL rewrites, use the `set-backend-service` policy:

```xml
<!-- Route requests to a completely different backend based on a header -->
<!-- Internal requests go to the internal service, external go to the public one -->
<inbound>
    <base />
    <choose>
        <when condition="@(context.Request.Headers.GetValueOrDefault("X-Internal","") == "true")">
            <set-backend-service base-url="https://internal-service.corp.net" />
        </when>
        <otherwise>
            <set-backend-service base-url="https://public-service.azurewebsites.net" />
        </otherwise>
    </choose>
</inbound>
```

## Transforming the Request Body

Body transformations are where things get really interesting. You can completely reshape the JSON payload before it reaches your backend.

Suppose your consumer sends this JSON:

```json
{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
}
```

But your backend expects:

```json
{
    "name": {
        "first": "John",
        "last": "Doe"
    },
    "contactEmail": "john@example.com"
}
```

Here is the policy to transform it:

```xml
<!-- Transform the request body to match the backend's expected schema -->
<!-- Restructures the flat consumer payload into the nested backend format -->
<inbound>
    <base />
    <set-body>@{
        var body = context.Request.Body.As<JObject>();
        var transformed = new JObject(
            new JProperty("name", new JObject(
                new JProperty("first", body["firstName"]),
                new JProperty("last", body["lastName"])
            )),
            new JProperty("contactEmail", body["email"])
        );
        return transformed.ToString();
    }</set-body>
</inbound>
```

The `set-body` policy accepts C# expressions that return a string. You can use `JObject` from Newtonsoft.Json (which is available in the policy expression context) to parse and construct JSON.

## Transforming the Response Body

Similarly, you can reshape the backend's response before it reaches the consumer:

```xml
<!-- Transform the response to add metadata and reshape the data -->
<!-- Wraps the backend response in a standard envelope format -->
<outbound>
    <base />
    <set-body>@{
        var body = context.Response.Body.As<JObject>();
        var envelope = new JObject(
            new JProperty("data", body),
            new JProperty("metadata", new JObject(
                new JProperty("requestId", context.RequestId),
                new JProperty("timestamp", DateTime.UtcNow.ToString("o")),
                new JProperty("apiVersion", context.Api.Version ?? "unversioned")
            ))
        );
        return envelope.ToString();
    }</set-body>
</outbound>
```

This wraps every response in a standard envelope with metadata, which is a common pattern for APIs that need to include pagination info, request tracking, or other cross-cutting response fields.

## Adding Query Parameters

You can add, modify, or remove query parameters before the request reaches the backend:

```xml
<!-- Add a default page size if the consumer did not specify one -->
<!-- Also add an API key that the backend requires -->
<inbound>
    <base />
    <set-query-parameter name="pageSize" exists-action="skip">
        <value>25</value>
    </set-query-parameter>
    <set-query-parameter name="api-key" exists-action="override">
        <value>{{backend-api-key}}</value>
    </set-query-parameter>
</inbound>
```

## Converting Between Formats

If your backend returns XML but your consumers expect JSON (or vice versa), APIM can handle the conversion:

```xml
<!-- Convert XML response from legacy backend to JSON -->
<!-- The json-conversion-error-handling attribute controls what happens on failure -->
<outbound>
    <base />
    <xml-to-json kind="direct" apply="always" consider-accept-header="true" />
</outbound>
```

The `consider-accept-header` attribute means the conversion only happens if the client sends an `Accept: application/json` header. If the client accepts XML, the backend's response passes through unchanged.

For JSON to XML conversion:

```xml
<!-- Convert JSON request body to XML for the backend -->
<inbound>
    <base />
    <json-to-xml apply="always" consider-accept-header="false" />
</inbound>
```

## Using Liquid Templates

For complex transformations, APIM supports Liquid templates. Liquid gives you loops, conditionals, and filters that are hard to express in C# one-liners:

```xml
<!-- Use a Liquid template to transform an array response -->
<!-- Each item in the backend response is mapped to a simpler structure -->
<outbound>
    <base />
    <set-body template="liquid">
    {
        "items": [
            {% for item in body.results %}
            {
                "id": "{{ item.id }}",
                "title": "{{ item.name | upcase }}",
                "active": {{ item.status | equals: "active" }}
            }{% unless forloop.last %},{% endunless %}
            {% endfor %}
        ],
        "count": {{ body.results.size }}
    }
    </set-body>
</outbound>
```

Liquid templates are particularly useful when you need to iterate over arrays or apply string filters.

## Chaining Multiple Transformations

You can chain multiple transformation policies together. They execute in order, and each one operates on the result of the previous:

```xml
<!-- Chain multiple transformations -->
<inbound>
    <base />
    <!-- First, add required headers -->
    <set-header name="X-Source" exists-action="override">
        <value>api-gateway</value>
    </set-header>
    <!-- Then, rewrite the URL -->
    <rewrite-uri template="/v2{context.Request.Url.Path}" />
    <!-- Then, transform the body -->
    <set-body>@{
        var body = context.Request.Body.As<JObject>();
        body["source"] = "gateway";
        body["receivedAt"] = DateTime.UtcNow.ToString("o");
        return body.ToString();
    }</set-body>
</inbound>
```

## Performance Considerations

Body transformations (reading and rewriting the request or response body) are the most expensive operations in the policy pipeline. Keep these tips in mind:

- Avoid reading the body if you do not need to. Header and URL transformations are nearly free.
- If you read the body with `context.Request.Body.As<T>()`, it buffers the entire body in memory. For large payloads, this can be significant.
- Use `preserveContent="true"` on the `set-body` policy if you need to read the body multiple times.

## Summary

Request transformation policies in Azure API Management let you decouple your API's public contract from your backend's implementation. Use header policies for simple metadata. Use URL rewriting for routing. Use body transformations when the schema needs to change. And use Liquid templates when the transformation logic gets complex. The policy engine is one of APIM's strongest features, and mastering it gives you the flexibility to integrate any backend behind a clean, consistent API surface.
