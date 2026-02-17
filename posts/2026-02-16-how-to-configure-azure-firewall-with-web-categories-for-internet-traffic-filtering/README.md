# How to Configure Azure Firewall with Web Categories for Internet Traffic Filtering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Firewall, Web Categories, URL Filtering, Internet Security, Content Filtering

Description: Configure Azure Firewall web categories to filter outbound internet traffic by content type, blocking access to unwanted or risky website categories.

---

Controlling what your users and workloads can access on the internet is a core network security requirement. Instead of maintaining massive lists of individual URLs or domains, Azure Firewall lets you filter traffic by web category. You can block entire categories like gambling, malware, or social networking with a single rule, and Azure maintains the categorization database for you.

This guide covers how to configure web category filtering in Azure Firewall, including both Standard and Premium tiers, and how to combine categories with other rule types for a comprehensive filtering strategy.

## How Web Category Filtering Works

Azure Firewall maintains a categorization engine that classifies websites and URLs into categories. When a client behind the firewall makes an outbound request, the firewall checks the destination against its categorization database and applies the matching rules.

There are two levels of category matching depending on your firewall tier:

- **Standard tier**: Categorizes based on the FQDN (domain name). The entire domain gets one category. This works with both HTTP and HTTPS traffic using SNI inspection.
- **Premium tier**: Categorizes based on the full URL, including the path. This provides more granular control but requires TLS inspection to be enabled for HTTPS traffic.

For example, `news.example.com/sports` and `news.example.com/gambling` might be categorized differently with Premium tier URL-level categorization, but they would share the same category under Standard tier FQDN-level categorization.

## Prerequisites

- An Azure Firewall deployed in your VNet (Standard or Premium tier)
- A firewall policy associated with the firewall
- Outbound traffic from your VNet routed through the firewall (UDR in place)
- Azure CLI installed

## Step 1: Understand Available Web Categories

Azure Firewall supports a large number of web categories. Here are some of the most commonly used ones for filtering:

| Category | Description |
|----------|-------------|
| Gambling | Online gambling and betting sites |
| Malware | Known malware distribution sites |
| Phishing | Known phishing sites |
| Adult Content | Adult or explicit content |
| Social Networking | Social media platforms |
| Streaming Media | Video and audio streaming services |
| Peer-to-Peer | P2P file sharing sites |
| Hacking | Hacking tools and resources |
| Proxy and Anonymizer | Web proxy and anonymization services |
| Cryptocurrency Mining | Crypto mining pools and software |

You can get the full list of available categories from the Azure documentation or query them through the API.

## Step 2: Create a Firewall Policy with Web Category Rules

Create application rules that use web categories as the target:

```bash
# Create a rule collection group for web filtering
az network firewall policy rule-collection-group create \
  --name WebFilteringRules \
  --policy-name myFirewallPolicy \
  --resource-group myResourceGroup \
  --priority 500

# Block unwanted web categories
az network firewall policy rule-collection-group collection add-filter-collection \
  --name "BlockRiskyCategories" \
  --policy-name myFirewallPolicy \
  --resource-group myResourceGroup \
  --rule-collection-group-name WebFilteringRules \
  --collection-priority 100 \
  --action Deny \
  --rule-name "DenyGambling" \
  --rule-type ApplicationRule \
  --source-addresses "10.0.0.0/16" \
  --protocols Http=80 Https=443 \
  --web-categories Gambling

# Add more category blocks to the same collection
az network firewall policy rule-collection-group collection rule add \
  --name "BlockRiskyCategories" \
  --policy-name myFirewallPolicy \
  --resource-group myResourceGroup \
  --rule-collection-group-name WebFilteringRules \
  --rule-name "DenyMalware" \
  --rule-type ApplicationRule \
  --source-addresses "10.0.0.0/16" \
  --protocols Http=80 Https=443 \
  --web-categories Malware

az network firewall policy rule-collection-group collection rule add \
  --name "BlockRiskyCategories" \
  --policy-name myFirewallPolicy \
  --resource-group myResourceGroup \
  --rule-collection-group-name WebFilteringRules \
  --rule-name "DenyPhishing" \
  --rule-type ApplicationRule \
  --source-addresses "10.0.0.0/16" \
  --protocols Http=80 Https=443 \
  --web-categories Phishing

az network firewall policy rule-collection-group collection rule add \
  --name "BlockRiskyCategories" \
  --policy-name myFirewallPolicy \
  --resource-group myResourceGroup \
  --rule-collection-group-name WebFilteringRules \
  --rule-name "DenyCryptoMining" \
  --rule-type ApplicationRule \
  --source-addresses "10.0.0.0/16" \
  --protocols Http=80 Https=443 \
  --web-categories CryptocurrencyMining
```

## Step 3: Allow Specific Categories

In addition to blocking bad categories, you might want to explicitly allow certain categories. This is useful when you have a default-deny policy and need to permit specific types of internet access.

```bash
# Allow business-related web categories
az network firewall policy rule-collection-group collection add-filter-collection \
  --name "AllowBusinessCategories" \
  --policy-name myFirewallPolicy \
  --resource-group myResourceGroup \
  --rule-collection-group-name WebFilteringRules \
  --collection-priority 200 \
  --action Allow \
  --rule-name "AllowBusinessSites" \
  --rule-type ApplicationRule \
  --source-addresses "10.0.0.0/16" \
  --protocols Http=80 Https=443 \
  --web-categories "Business" "Finance" "Government" "Health" "InformationTechnology" "SearchEngines"
```

## Step 4: Apply Different Policies to Different User Groups

You can apply different web category policies to different source address ranges. For example, a development team might need access to categories that should be blocked for general users.

```bash
# Allow developers access to hacking tools and forums
# (needed for security testing and research)
az network firewall policy rule-collection-group collection add-filter-collection \
  --name "DevTeamExceptions" \
  --policy-name myFirewallPolicy \
  --resource-group myResourceGroup \
  --rule-collection-group-name WebFilteringRules \
  --collection-priority 50 \
  --action Allow \
  --rule-name "AllowSecurityResearch" \
  --rule-type ApplicationRule \
  --source-addresses "10.0.5.0/24" \
  --protocols Http=80 Https=443 \
  --web-categories "Hacking" "ProxyAndAnonymizer"
```

Since this rule has a lower priority number (50 vs 100), it is evaluated first. Developers in the 10.0.5.0/24 subnet can access hacking and proxy sites, while everyone else is still blocked by the rules in priority 100.

## Step 5: Configure Logging for Web Category Activity

Enable diagnostic logging to track which categories are being accessed and blocked:

```bash
# Enable Azure Firewall diagnostic logging
az monitor diagnostic-settings create \
  --name "firewall-web-category-logs" \
  --resource "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Network/azureFirewalls/myFirewall" \
  --workspace "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.OperationalInsights/workspaces/myWorkspace" \
  --logs '[
    {"category": "AzureFirewallApplicationRule", "enabled": true},
    {"category": "AzureFirewallNetworkRule", "enabled": true},
    {"category": "AzureFirewallDnsProxy", "enabled": true}
  ]'
```

Query the logs to see web category activity:

```
// KQL query to see blocked web category requests
AzureDiagnostics
| where Category == "AzureFirewallApplicationRule"
| where msg_s contains "WebCategory"
| parse msg_s with * "WebCategory: " webCategory "." *
| summarize BlockedCount = count() by webCategory, bin(TimeGenerated, 1h)
| order by BlockedCount desc
```

## Step 6: Handle Miscategorized Sites

Sometimes the categorization engine gets it wrong. A legitimate business site might be categorized as something it is not. When this happens, you have two options:

**Create an FQDN-based exception**: Add a specific allow rule for the miscategorized FQDN with a higher priority than the category block:

```bash
# Allow a specific domain that is miscategorized
az network firewall policy rule-collection-group collection add-filter-collection \
  --name "CategoryExceptions" \
  --policy-name myFirewallPolicy \
  --resource-group myResourceGroup \
  --rule-collection-group-name WebFilteringRules \
  --collection-priority 10 \
  --action Allow \
  --rule-name "AllowMiscategorizedSite" \
  --rule-type ApplicationRule \
  --source-addresses "10.0.0.0/16" \
  --protocols Http=80 Https=443 \
  --target-fqdns "legitimate-business-site.com"
```

**Submit a recategorization request**: Microsoft accepts requests to recategorize sites. This fixes the issue permanently but takes time to process.

## Premium Tier URL-Level Categorization

If you need URL-level categorization (not just FQDN-level), you must use Azure Firewall Premium with TLS inspection enabled. With TLS inspection, the firewall can decrypt HTTPS traffic and examine the full URL path, enabling more granular categorization.

The rule configuration is the same, but the categorization engine will check the full URL instead of just the domain name. This is particularly useful for sites like forums or wikis where different paths contain different types of content.

## Best Practices

**Start in log-only mode**: Before blocking categories, run your rules in log mode for a week to understand what your users are accessing. This prevents blocking legitimate business traffic.

**Review logs regularly**: Traffic patterns change. Categories that were not important last month might become relevant this month. Schedule monthly reviews of your web category logs.

**Combine with FQDN filtering**: Web categories are broad. Combine them with specific FQDN allow/deny rules for fine-grained control over individual sites.

**Document exceptions**: Every time you create an exception for a miscategorized site or a business need, document the reason. This makes audits much easier.

**Test after changes**: After modifying web category rules, test from an actual client machine to verify the expected behavior. Use `curl` or a browser to hit URLs in the affected categories.

## Wrapping Up

Web category filtering in Azure Firewall simplifies internet access control by letting you think in terms of content types rather than individual domains. Block risky categories, allow business-relevant ones, and use source-based rules to give different teams appropriate access levels. The Standard tier handles most use cases with FQDN-level categorization, while Premium tier with TLS inspection provides URL-level granularity for environments that need it. Always start with logging before enforcement, and maintain exception rules for miscategorized sites to avoid blocking legitimate traffic.
