# How to Configure Azure CDN with Geo-Filtering to Restrict Content by Country

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, CDN, Geo-Filtering, Content Delivery, Security, Networking

Description: Learn how to configure Azure CDN geo-filtering rules to restrict or allow content delivery based on country codes for compliance and security.

---

If you serve content globally through Azure CDN, there are situations where you need to restrict access based on geographic location. Licensing agreements, regulatory compliance, and data sovereignty laws all create scenarios where you cannot deliver certain content to users in specific countries. Azure CDN geo-filtering gives you the controls to handle this without building custom logic in your application layer.

In this guide, we will walk through configuring geo-filtering on Azure CDN step by step, covering both the Azure portal approach and the infrastructure-as-code path using Azure CLI and Bicep templates.

## Why Geo-Filtering Matters

Geo-filtering is not just about blocking traffic. It is about meeting legal obligations and optimizing your content delivery strategy. Here are some common reasons teams implement geo-filtering:

- **Licensing restrictions**: Media companies often have region-specific distribution rights. A video streaming service might have rights to deliver content in North America but not in Europe.
- **Regulatory compliance**: GDPR, data residency laws, and export control regulations may require you to limit where data is served from or to.
- **Reducing attack surface**: If your service only operates in certain countries, blocking traffic from everywhere else cuts down on the noise from bots and scanning tools.
- **Cost optimization**: CDN egress costs vary by region. If you know your audience is limited to specific geographies, filtering out unwanted traffic can help manage costs.

## Prerequisites

Before you start, make sure you have:

- An Azure subscription with appropriate permissions
- An existing Azure CDN profile (Standard Microsoft, Standard Verizon, or Premium Verizon)
- At least one CDN endpoint configured and serving content
- Azure CLI installed if you want to use command-line configuration

## Understanding Geo-Filtering Behavior

Azure CDN geo-filtering works by examining the source IP of each incoming request and mapping it to a country code using a GeoIP database. You can define rules that either allow or block access from specific countries. When a blocked user tries to access content, they receive a 403 Forbidden response.

There are two action types:

- **Allow**: Only the listed countries can access the content. Everyone else gets blocked.
- **Block**: The listed countries are denied access. Everyone else can get through.

You can apply geo-filtering rules to specific paths within your CDN endpoint or to the entire endpoint using the root path `/`.

## Step 1: Configure Geo-Filtering Through the Azure Portal

The portal is the quickest way to get geo-filtering rules in place.

1. Navigate to your CDN profile in the Azure portal
2. Select the endpoint you want to configure
3. In the left menu, click on **Geo-filtering**
4. Click **Add Rule**
5. Set the following fields:
   - **Action**: Choose either Block or Allow
   - **Country codes**: Select the countries you want to include in the rule
   - **Path**: Enter the path this rule applies to (use `/` for the entire endpoint)
6. Click **Save**

The rule takes effect within a few minutes as it propagates across the CDN edge nodes.

## Step 2: Configure Geo-Filtering Using Azure CLI

For teams that prefer automation or need to manage rules across multiple environments, the Azure CLI is the better option.

Here is how to add a geo-filtering rule that blocks traffic from specific countries:

```bash
# Add a geo-filtering rule to block access from two countries
# Replace the values with your actual resource group, profile, and endpoint names
az cdn endpoint rule add \
  --resource-group myResourceGroup \
  --profile-name myCdnProfile \
  --name myEndpoint \
  --order 1 \
  --rule-name "BlockCountries" \
  --match-variable RemoteAddress \
  --operator GeoMatch \
  --match-values "CN" "RU" \
  --action-name Block
```

If you want to allow only specific countries instead, you can flip the logic:

```bash
# Allow access only from the United States and Canada
# All other countries will receive a 403 response
az cdn endpoint rule add \
  --resource-group myResourceGroup \
  --profile-name myCdnProfile \
  --name myEndpoint \
  --order 1 \
  --rule-name "AllowNorthAmerica" \
  --match-variable RemoteAddress \
  --operator GeoMatch \
  --negate-condition true \
  --match-values "US" "CA" \
  --action-name Block
```

The `--negate-condition` flag is the key here. It inverts the match, so the rule blocks any request that is NOT from the US or Canada.

## Step 3: Configure Geo-Filtering with Bicep

For infrastructure-as-code workflows, you can define geo-filtering rules in a Bicep template. This approach is ideal for CI/CD pipelines where you want your CDN configuration to be version-controlled and repeatable.

```bicep
// Bicep template for Azure CDN endpoint with geo-filtering
// This blocks access from specified countries on all paths
resource cdnEndpoint 'Microsoft.Cdn/profiles/endpoints@2021-06-01' = {
  name: '${cdnProfileName}/${endpointName}'
  location: 'global'
  properties: {
    originHostHeader: originHostName
    origins: [
      {
        name: 'primary-origin'
        properties: {
          hostName: originHostName
          httpPort: 80
          httpsPort: 443
        }
      }
    ]
    geoFilters: [
      {
        // Block traffic from specific countries
        relativePath: '/'
        action: 'Block'
        countryCodes: [
          'CN'
          'RU'
          'KP'
        ]
      }
    ]
  }
}
```

## Step 4: Configure Path-Specific Rules

One of the powerful features of geo-filtering is the ability to apply different rules to different content paths. For example, you might want to block certain countries from accessing premium content while allowing them to browse your marketing pages.

```bash
# Block specific countries from the premium content path only
az cdn endpoint rule add \
  --resource-group myResourceGroup \
  --profile-name myCdnProfile \
  --name myEndpoint \
  --order 1 \
  --rule-name "BlockPremiumContent" \
  --match-variable RequestUri \
  --operator Contains \
  --match-values "/premium/" \
  --action-name Block \
  --match-variable RemoteAddress \
  --operator GeoMatch \
  --match-values "DE" "FR" "IT"
```

This gives you granular control over which content is available where.

## Step 5: Monitor and Validate Geo-Filtering Rules

After deploying your rules, you should verify they work as expected. There are a few ways to do this:

**Check CDN diagnostic logs**: Enable diagnostic logging on your CDN endpoint and look for 403 responses correlated with the country codes you blocked.

**Use a VPN for testing**: Connect through a VPN endpoint in a blocked country and try to access your content. You should see a 403 response.

**Review Azure Monitor metrics**: Azure CDN exposes metrics like request count broken down by response code. After enabling geo-filtering, watch for an increase in 403 responses.

Here is how to enable diagnostic logging on your CDN endpoint:

```bash
# Enable diagnostic logging to a Log Analytics workspace
az monitor diagnostic-settings create \
  --resource "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Cdn/profiles/myCdnProfile/endpoints/myEndpoint" \
  --name "cdn-diagnostics" \
  --workspace "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.OperationalInsights/workspaces/myWorkspace" \
  --logs '[{"category": "CoreAnalytics", "enabled": true}]'
```

## Common Pitfalls

**GeoIP accuracy is not perfect.** GeoIP databases are updated regularly, but they are not 100% accurate. Some IP ranges may be misclassified, especially for mobile carriers and cloud providers. Do not rely on geo-filtering as your only security control.

**VPN and proxy bypass.** Users with VPNs can easily circumvent geo-filtering. If you need strict geographic enforcement, consider combining geo-filtering with authentication and authorization at the application layer.

**Propagation delay.** Changes to geo-filtering rules can take 10 to 15 minutes to propagate across all CDN edge nodes. Plan your deployments accordingly and do not expect instant enforcement.

**Allow vs Block confusion.** If you choose Allow with a list of countries, every country NOT on the list gets blocked. This is the opposite of what some people expect. Double-check your rule logic before deploying to production.

## CDN Tier Differences

The level of geo-filtering support varies by CDN tier:

- **Standard Microsoft**: Supports basic geo-filtering with allow/block by country
- **Standard Verizon**: Supports basic geo-filtering similar to Standard Microsoft
- **Premium Verizon**: Offers advanced geo-filtering through the rules engine with more granular path matching and additional actions

If you need complex geo-filtering rules with multiple conditions, the Premium Verizon tier gives you the most flexibility through its supplemental rules engine.

## Wrapping Up

Geo-filtering on Azure CDN is straightforward to configure but requires careful planning to get right. Start by clearly defining which countries need access and which should be blocked. Use the portal for quick setup, the CLI for automation, and Bicep templates for infrastructure-as-code workflows. Always combine geo-filtering with other security controls for defense in depth, and monitor your rules to catch any unexpected behavior early.

For production deployments, I recommend starting with a monitor-only approach - enable logging first, review the geographic distribution of your traffic, and then apply blocking rules based on real data rather than assumptions.
