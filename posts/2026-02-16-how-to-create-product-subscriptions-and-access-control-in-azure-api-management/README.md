# How to Create Product Subscriptions and Access Control in Azure API Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, API Management, Subscriptions, Access Control, Products, API Security

Description: A practical guide to setting up products, subscriptions, and access control in Azure API Management to manage who can access your APIs and how.

---

Products and subscriptions are the foundation of access control in Azure API Management. A product groups one or more APIs together and defines the terms of access - who can subscribe, what rate limits apply, and whether approval is needed. A subscription is what a developer gets when they sign up for a product; it gives them the keys they need to call the APIs.

Getting this right matters because it directly affects your API consumers' experience and your ability to manage access at scale. In this post, I will walk through setting up products, configuring subscriptions, managing access with groups, and implementing common access control patterns.

## Understanding the Product Model

The hierarchy in APIM goes like this:

- **API**: A set of operations (endpoints) backed by a service
- **Product**: A package of one or more APIs with usage policies
- **Subscription**: A developer's access grant to a product (with API keys)
- **Group**: A collection of developers with shared access rights

A single API can belong to multiple products. For example, your Order Service API might be in both a "Free" product (with low rate limits) and a "Premium" product (with higher limits). Developers subscribe to the product that fits their needs.

## Creating a Product

Go to your APIM instance, click "Products," and click "Add."

Fill in the details:

- **Display name**: "Starter Plan" (shown to developers)
- **Id**: Auto-generated, but you can customize it
- **Description**: Explain what the product includes, its limits, and pricing
- **State**: "Not published" (start here, publish when ready)
- **Requires subscription**: Yes (almost always)
- **Requires approval**: Depends on your workflow
- **Subscriptions limit**: How many subscriptions a single developer can create (useful for preventing abuse)

After creating the product, go to its "APIs" tab and add the APIs that should be included.

## Configuring Product-Level Policies

Products can have their own policies that apply to all APIs within the product. This is the natural place for rate limits and quotas:

```xml
<!-- Product-level policy for the Starter Plan -->
<!-- These limits apply to all APIs accessed through this product -->
<inbound>
    <base />
    <rate-limit calls="60" renewal-period="60" />
    <quota calls="1000" renewal-period="86400" />
</inbound>
<outbound>
    <base />
    <set-header name="X-Plan" exists-action="override">
        <value>Starter</value>
    </set-header>
</outbound>
```

Create a different product with higher limits for premium users:

```xml
<!-- Product-level policy for the Premium Plan -->
<inbound>
    <base />
    <rate-limit calls="1000" renewal-period="60" />
    <quota calls="100000" renewal-period="86400" />
</inbound>
<outbound>
    <base />
    <set-header name="X-Plan" exists-action="override">
        <value>Premium</value>
    </set-header>
</outbound>
```

## Subscription Types

APIM supports several subscription scopes:

**Product subscription** (most common): The developer subscribes to a product and gets keys that work for all APIs in that product.

**API subscription**: The developer subscribes directly to a specific API, regardless of products. Useful when you want per-API access control.

**All-API subscription**: A special subscription that grants access to every API in the APIM instance. Typically used for internal or admin access.

You configure which scopes are available under your APIM instance's "Subscriptions" settings.

## Managing Subscriptions

When a developer subscribes to a product, they get a primary and secondary key. Both keys are valid simultaneously, which allows for key rotation without downtime.

To manage subscriptions, go to the "Subscriptions" blade. Here you can:

- **View all active subscriptions**: See who has access to what
- **Suspend a subscription**: Temporarily block access without deleting
- **Cancel a subscription**: Permanently revoke access
- **Regenerate keys**: Issue new keys if the old ones are compromised
- **Create subscriptions manually**: Generate keys for a specific developer or service account

For programmatic subscription management, use the REST API or Azure CLI:

```bash
# Create a subscription for a specific user to a product
az apim subscription create \
    --resource-group my-rg \
    --service-name my-apim \
    --subscription-id "partner-acme" \
    --display-name "Acme Corp - Premium" \
    --product-id premium-plan \
    --state active
```

## Access Control with Groups

Groups control which products developers can see and subscribe to. APIM has three built-in groups:

- **Administrators**: Full access to the APIM instance
- **Developers**: Registered users who can subscribe to products
- **Guests**: Unauthenticated visitors to the developer portal

You can also create custom groups to represent different tiers of access:

1. Go to "Groups" and click "Add"
2. Create groups like "Partners," "Internal Developers," "Beta Testers"
3. Add developers to the appropriate groups
4. On each product, configure which groups have access

For example, your "Premium Plan" product might only be visible to the "Partners" group, while the "Starter Plan" is available to all "Developers."

## Integrating with Azure AD Groups

If your developers authenticate with Azure AD, you can map Azure AD groups to APIM groups. This means group membership is managed in Azure AD, and APIM automatically reflects those changes.

Go to "Groups," click "Add," and select "Azure Active Directory" as the group type. Search for the Azure AD group and link it. Now any Azure AD user in that group automatically belongs to the corresponding APIM group.

This is the recommended approach for enterprise scenarios where user management is centralized in Azure AD.

## Approval Workflows

When a product requires approval, subscription requests go to an approval queue. Administrators can approve or reject them.

APIM sends email notifications for pending approval requests. You can customize the email template under "Notification templates."

For automated approval workflows, use the APIM REST API with an Azure Function or Logic App:

```csharp
// Azure Function that auto-approves subscriptions from known domains
// Triggered by an Event Grid event from APIM
[Function("AutoApproveSubscription")]
public async Task Run(
    [EventGridTrigger] EventGridEvent eventGridEvent)
{
    var data = eventGridEvent.Data.ToObjectFromJson<SubscriptionRequestData>();

    // Auto-approve if the developer's email is from a known partner domain
    if (data.DeveloperEmail.EndsWith("@partner.com"))
    {
        await ApproveSubscription(data.SubscriptionId);
    }
}
```

## Subscription Key Patterns

How clients pass subscription keys varies. APIM supports two methods:

**Header** (recommended): `Ocp-Apim-Subscription-Key: your-key`
**Query parameter**: `?subscription-key=your-key`

You can customize the header name in APIM settings if `Ocp-Apim-Subscription-Key` is too verbose for your taste.

For APIs that do not require a subscription key (public APIs), you can disable the requirement at the API level or product level. But I recommend always requiring a key, even for free tiers, because it gives you visibility into who is calling your API.

## Key Rotation Strategy

Subscription keys should be rotated periodically. The dual-key model (primary and secondary) makes this seamless:

1. Client is using the primary key
2. Client switches to the secondary key
3. Admin regenerates the primary key
4. Client switches back to the new primary key
5. Admin regenerates the secondary key

At no point is the client locked out because one key is always valid during the rotation.

Communicate rotation schedules to your API consumers and encourage them to implement key retrieval from a secure store (like Azure Key Vault) rather than hardcoding keys.

## Monitoring Subscription Usage

Track usage per subscription to identify:

- Which consumers generate the most traffic
- Which consumers are hitting rate limits
- Which subscriptions are inactive (candidates for cleanup)
- Unusual usage patterns that might indicate a compromised key

Use Application Insights queries:

```
// Request count and error rate per subscription
requests
| where timestamp > ago(7d)
| extend subscriptionName = tostring(customDimensions["Subscription Name"])
| summarize
    total = count(),
    errors = countif(success == false),
    avg_duration = round(avg(duration), 2)
    by subscriptionName
| order by total desc
```

## Product Lifecycle

Products go through a lifecycle:

1. **Draft**: Created but not published. Not visible in the developer portal.
2. **Published**: Visible and subscribable. Active subscriptions are serving traffic.
3. **Deprecated**: Still functional but marked as deprecated. No new subscriptions allowed.
4. **Retired**: APIs removed from the product. Existing subscriptions are invalidated.

When deprecating a product, give consumers adequate notice and provide a migration path to the replacement product.

## Summary

Products and subscriptions in Azure API Management give you a structured way to package, distribute, and control access to your APIs. Create products for different usage tiers, set appropriate rate limits and quotas, use groups for visibility control, and implement approval workflows for sensitive APIs. The subscription key model provides a simple but effective authentication mechanism, and the dual-key design supports zero-downtime rotation. Monitor usage per subscription to keep your API program healthy and identify consumers who need attention.
