# How to Version APIs in Azure API Management with URL Path Versioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, API Management, API Versioning, REST API, API Design, Cloud

Description: A complete guide to implementing URL path versioning in Azure API Management to evolve your APIs without breaking existing consumers.

---

API versioning is one of those things that is easy to put off and painful to retrofit. The moment you have external consumers depending on your API, every breaking change becomes a negotiation. Azure API Management provides built-in versioning support that lets you run multiple versions of an API side by side, each with its own operations and policies, while keeping everything organized under a single umbrella.

In this post, I will focus on URL path versioning, the most common and most visible approach, where the version number appears in the URL like `/v1/orders` or `/v2/orders`.

## Why URL Path Versioning

There are three main versioning schemes that APIM supports:

1. **URL path**: `/v1/orders` vs `/v2/orders`
2. **Query string**: `/orders?api-version=v1` vs `/orders?api-version=v2`
3. **Header**: Same URL, but with a custom header like `Api-Version: v1`

URL path versioning is the most popular for a few reasons. It is immediately visible in logs, browser address bars, and documentation. Developers can see which version they are calling without inspecting headers. It also plays nicely with routing rules, CDNs, and load balancers that operate on URL paths.

The tradeoff is that it changes the URL, which purists argue violates REST principles (a resource's URL should not change). But in practice, the clarity and simplicity of path versioning outweigh the theoretical concerns.

## Creating a Version Set

In APIM, a version set is the container that groups multiple versions of the same API together. Think of it as the parent entity, with each version being a child.

Go to your APIM instance in the Azure Portal, navigate to APIs, and click "Add API." Choose to create a new API or use an existing one as the starting point.

If you already have an unversioned API and want to start versioning it, select the API, click the three-dot menu, and choose "Add version." APIM will prompt you to create a version set.

Fill in the version set details:

- **Name**: "Order Service Versions" (internal identifier)
- **Versioning scheme**: URL path
- **Version identifier**: `v1`

APIM creates the version set and moves your existing API into it as version v1. The API is now accessible at its original URL suffix plus `/v1`. For example, if your API URL suffix was `orders`, the full gateway URL becomes `https://yourapi.azure-api.net/orders/v1/`.

## Adding a New Version

When you need to release a breaking change, create a new version rather than modifying the existing one.

Go to the version set, click "Add version," and specify:

- **Version identifier**: `v2`
- **Full API version set**: Select the existing version set

APIM creates a new API entry for v2. It is a blank slate - no operations, no policies. If you want to start from the v1 definition and modify it, you can clone the v1 API instead:

1. Go to the v1 API
2. Click the three-dot menu and select "Clone"
3. In the clone dialog, set the version to v2 and associate it with the same version set

This copies all operations and policies from v1, giving you a starting point for v2.

## Routing Requests to Different Backends

A common scenario is that v1 and v2 point to different backend services, or different versions of the same service. Configure the backend URL separately for each version:

For v1, set the Web service URL to `https://my-orders-v1.azurewebsites.net`.
For v2, set it to `https://my-orders-v2.azurewebsites.net`.

You can also use a policy to dynamically route based on the version:

```xml
<!-- Route to different backend services based on the API version -->
<!-- v1 goes to the legacy service, v2 goes to the new service -->
<inbound>
    <base />
    <choose>
        <when condition="@(context.Api.Version == "v1")">
            <set-backend-service base-url="https://my-orders-v1.azurewebsites.net" />
        </when>
        <when condition="@(context.Api.Version == "v2")">
            <set-backend-service base-url="https://my-orders-v2.azurewebsites.net" />
        </when>
    </choose>
</inbound>
```

## Managing Operations Across Versions

The whole point of versioning is that different versions can have different operation signatures. v1 might have a GET /items that returns a flat list, while v2 returns a paginated response with metadata.

You define operations independently for each version. In v2, you might:

- Add new required fields to request bodies
- Change response schemas
- Remove deprecated endpoints
- Rename or restructure resources

Since each version is its own API in APIM, changes to v2 do not affect v1 at all. Consumers on v1 continue to work exactly as before.

## Version-Specific Policies

Each version can have its own policies. Maybe v1 has a higher rate limit because it is the established version with SLAs, while v2 is in beta with lower limits:

```xml
<!-- v1 policy: higher rate limit for established version -->
<inbound>
    <base />
    <rate-limit calls="1000" renewal-period="60" />
</inbound>
```

```xml
<!-- v2 policy: lower rate limit for beta version -->
<inbound>
    <base />
    <rate-limit calls="100" renewal-period="60" />
</inbound>
```

You can also apply shared policies at the "All APIs" level that affect every version, and override them at the version level where needed.

## Deprecating Old Versions

When you want to sunset v1, you have a few options:

1. **Documentation approach**: Update the developer portal to mark v1 as deprecated and encourage migration to v2.
2. **Warning header**: Add an outbound policy that includes a deprecation warning:

```xml
<!-- Add deprecation warning header to v1 responses -->
<!-- This signals to consumers that v1 will be removed in the future -->
<outbound>
    <base />
    <set-header name="Deprecation" exists-action="override">
        <value>true</value>
    </set-header>
    <set-header name="Sunset" exists-action="override">
        <value>Wed, 01 Jul 2026 00:00:00 GMT</value>
    </set-header>
    <set-header name="Link" exists-action="override">
        <value>https://yourapi.azure-api.net/orders/v2/ ; rel="successor-version"</value>
    </set-header>
</outbound>
```

3. **Rate limit reduction**: Gradually reduce the rate limits on v1 to encourage migration.
4. **Hard removal**: Delete the v1 API from APIM. Requests to `/v1/` will return 404.

The gentle approach (options 1-3) is always better for your developer relationships. Give consumers plenty of notice and a clear migration path.

## Handling the Unversioned Base URL

When you enable versioning, you might want to handle requests to the base URL without a version segment. For example, what happens when someone calls `/orders/` instead of `/orders/v1/`?

By default, APIM returns a 404 because there is no matching API at the base path. You have a few options:

- **Redirect to the latest version**: Create a standalone API at the base path with a policy that redirects:

```xml
<!-- Redirect unversioned requests to the latest API version -->
<inbound>
    <base />
    <return-response>
        <set-status code="301" reason="Moved Permanently" />
        <set-header name="Location" exists-action="override">
            <value>@($"https://yourapi.azure-api.net/orders/v2{context.Request.Url.Path.Replace("/orders", "")}{context.Request.Url.QueryString}")</value>
        </set-header>
    </return-response>
</inbound>
```

- **Default version**: Some teams treat the unversioned URL as an alias for the latest version. You can achieve this by having a separate API definition at the base path that proxies to the same backend as v2.

## Developer Portal Experience

The developer portal automatically groups versioned APIs together. Developers see a version selector dropdown that lets them switch between v1 and v2 documentation. Each version shows its own operations, schemas, and code samples.

This is a significant advantage of using APIM's built-in versioning rather than managing versions as completely separate APIs. The grouping makes it clear to developers that these are versions of the same service.

## Versioning Strategy Recommendations

A few things I have learned about API versioning in practice:

**Version the API, not individual endpoints.** If you need to change one endpoint, create a new version of the entire API. Cherry-picking versions at the endpoint level creates confusion.

**Use semantic versioning for communication, integer versions for URLs.** Tell your consumers "we are releasing v2 with breaking changes per our SemVer policy," but keep the URL simple with `/v1/` and `/v2/`.

**Do not create a new version for non-breaking changes.** Adding a new optional field to a response, adding a new endpoint, or adding a new optional query parameter are all backward-compatible. Use revisions (not versions) for these changes.

**Set a version lifecycle policy.** Commit to supporting each version for a minimum period (e.g., 12 months after the next version is released). Publish this policy so consumers can plan their migrations.

## Summary

URL path versioning in Azure API Management gives you a clean, visible way to evolve your APIs. Create a version set, add versions as your API changes, route each version to the appropriate backend, and use the developer portal's built-in version grouping to keep documentation organized. The key is to start versioning from day one, even if you only have v1, so the infrastructure is ready when you need v2.
