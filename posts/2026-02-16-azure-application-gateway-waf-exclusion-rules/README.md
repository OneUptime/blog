# How to Configure Azure Application Gateway with Web Application Firewall Exclusion Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Application Gateway, WAF, Web Application Firewall, Exclusion Rules, Security, OWASP

Description: Learn how to configure WAF exclusion rules on Azure Application Gateway to prevent false positives while maintaining web application security.

---

Web Application Firewalls are great until they start blocking legitimate traffic. If you have deployed Azure Application Gateway with WAF enabled, you have probably run into false positives. A user submits a form with HTML content, and the WAF blocks it as an XSS attack. An API call includes SQL-like syntax in a parameter, and the WAF flags it as SQL injection. These are the exact scenarios that WAF exclusion rules are designed to handle.

In this post, I will walk through configuring WAF exclusion rules on Azure Application Gateway. We will cover how to identify false positives, create targeted exclusions, and maintain security while reducing noise.

## Understanding WAF Rules and False Positives

Azure Application Gateway WAF uses the OWASP Core Rule Set (CRS). The current default versions are CRS 3.2 and CRS 3.1. These rule sets contain hundreds of rules organized into groups like SQL injection, cross-site scripting (XSS), local file inclusion, and more.

Each rule inspects specific parts of the HTTP request - headers, cookies, URL parameters, and the request body. When a rule matches, it either blocks the request (Prevention mode) or logs it (Detection mode).

False positives happen when legitimate requests match a rule pattern. Common triggers include:

- Rich text editors sending HTML content in form fields
- API parameters containing SQL keywords like "select" or "update"
- Application-specific cookies with special characters
- File upload fields containing binary data
- Custom headers with encoded values

## Identifying False Positives

Before creating exclusion rules, you need to identify which WAF rules are triggering on legitimate traffic. Start by putting the WAF in Detection mode.

```bash
# Set WAF to Detection mode to log without blocking
az network application-gateway waf-config set \
  --resource-group rg-appgw \
  --gateway-name appgw-main \
  --enabled true \
  --firewall-mode Detection \
  --rule-set-type OWASP \
  --rule-set-version 3.2
```

Now let your application run normally and check the WAF logs in Log Analytics.

```
// Query WAF logs for blocked/detected requests in the last 24 hours
AzureDiagnostics
| where Category == "ApplicationGatewayFirewallLog"
| where TimeGenerated > ago(24h)
| project
    TimeGenerated,
    ruleId_s,
    ruleGroup_s,
    message_s,
    details_message_s,
    details_data_s,
    requestUri_s,
    action_s
| order by TimeGenerated desc
```

This query shows you which rules are firing, what data triggered them, and which requests are affected. Look for patterns - if the same rule fires repeatedly on a specific URL path or parameter, it is likely a false positive.

## Creating Exclusion Rules

Once you have identified false positives, create exclusion rules that are as narrow as possible. The goal is to exclude only the specific parameter or field that triggers the false positive, not to disable the entire rule.

### Method 1: Exclude by Request Attribute

The most common approach is to exclude a specific request attribute from WAF inspection.

```bash
# Exclude a specific request body field from WAF rule 942130 (SQL injection detection)
# This is useful when a form field legitimately contains SQL-like content
az network application-gateway waf-config set \
  --resource-group rg-appgw \
  --gateway-name appgw-main \
  --enabled true \
  --firewall-mode Prevention \
  --rule-set-type OWASP \
  --rule-set-version 3.2 \
  --exclusion "RequestBodyPostArgNames Equals content" \
  --exclusion "RequestBodyPostArgNames Equals description"
```

This tells the WAF to skip inspection of the `content` and `description` POST parameters. All other parameters are still fully inspected.

### Method 2: Use WAF Policy with Per-Rule Exclusions

WAF policies give you more granular control. You can create exclusions that apply only to specific rules.

```bash
# Create a WAF policy
az network application-gateway waf-policy create \
  --resource-group rg-appgw \
  --name waf-policy-main

# Add a managed rule set to the policy
az network application-gateway waf-policy managed-rule rule-set add \
  --resource-group rg-appgw \
  --policy-name waf-policy-main \
  --type OWASP \
  --version 3.2

# Create an exclusion that applies only to rule 942130 (SQL injection)
az network application-gateway waf-policy managed-rule exclusion add \
  --resource-group rg-appgw \
  --policy-name waf-policy-main \
  --match-variable RequestBodyPostArgNames \
  --selector-match-operator Equals \
  --selector "query_text"
```

### Method 3: Per-Rule Exclusions with Rule Group Targeting

For even more precise control, you can target exclusions to specific rule groups.

```bash
# Add an exclusion scoped to a specific rule group and rule ID
az network application-gateway waf-policy managed-rule exclusion rule-set add \
  --resource-group rg-appgw \
  --policy-name waf-policy-main \
  --match-variable RequestBodyPostArgNames \
  --selector-match-operator Equals \
  --selector "query_text" \
  --type OWASP \
  --version 3.2 \
  --group-name REQUEST-942-APPLICATION-ATTACK-SQLI \
  --rule-ids 942130 942150
```

This exclusion only applies when rules 942130 and 942150 evaluate the `query_text` parameter. All other rules still inspect this parameter normally.

## Exclusion Match Variables

You can create exclusions on different parts of the request. Here are the available match variables:

| Match Variable | Description |
|---|---|
| RequestHeaderNames | HTTP request header names |
| RequestHeaderValues | HTTP request header values |
| RequestCookieNames | Cookie names |
| RequestCookieValues | Cookie values |
| RequestArgNames | Query string parameter names |
| RequestBodyPostArgNames | POST body parameter names |
| RequestBodyJsonArgNames | JSON body property names |

## Selector Match Operators

The selector match operator controls how the exclusion matches. Options are:

- **Equals**: Exact match. Use for specific field names.
- **StartsWith**: Matches fields that start with the value.
- **EndsWith**: Matches fields that end with the value.
- **Contains**: Matches fields containing the value.
- **EqualsAny**: Matches all values (use carefully).

For example, to exclude all JSON properties starting with "meta_":

```bash
# Exclude all JSON properties starting with "meta_" from WAF inspection
az network application-gateway waf-policy managed-rule exclusion add \
  --resource-group rg-appgw \
  --policy-name waf-policy-main \
  --match-variable RequestBodyJsonArgNames \
  --selector-match-operator StartsWith \
  --selector "meta_"
```

## Disabling Specific Rules

Sometimes an exclusion is not enough, and you need to disable a rule entirely. This is less ideal but sometimes necessary for rules that generate too much noise for your application.

```bash
# Disable specific rules that consistently generate false positives
az network application-gateway waf-policy managed-rule override add \
  --resource-group rg-appgw \
  --policy-name waf-policy-main \
  --type OWASP \
  --version 3.2 \
  --rule-group-id REQUEST-920-PROTOCOL-ENFORCEMENT \
  --rule-id 920230 \
  --state Disabled

# Disable another problematic rule
az network application-gateway waf-policy managed-rule override add \
  --resource-group rg-appgw \
  --policy-name waf-policy-main \
  --type OWASP \
  --version 3.2 \
  --rule-group-id REQUEST-942-APPLICATION-ATTACK-SQLI \
  --rule-id 942430 \
  --state Disabled
```

## Applying the WAF Policy to the Application Gateway

After configuring your policy, apply it to the Application Gateway.

```bash
# Get the WAF policy ID
POLICY_ID=$(az network application-gateway waf-policy show \
  --resource-group rg-appgw \
  --name waf-policy-main \
  --query id \
  --output tsv)

# Apply the WAF policy to the Application Gateway
az network application-gateway update \
  --resource-group rg-appgw \
  --name appgw-main \
  --set "firewallPolicy.id=$POLICY_ID"
```

## Testing Exclusion Rules

After applying exclusions, test thoroughly to make sure:

1. The false positives are resolved (legitimate traffic gets through)
2. Real attacks are still blocked (the exclusion is not too broad)

```bash
# Test that a previously blocked request now succeeds
curl -X POST https://your-app-gateway/api/search \
  -H "Content-Type: application/json" \
  -d '{"query_text": "SELECT * FROM products WHERE category = shoes"}' \
  -v

# Test that actual SQL injection is still blocked
curl -X POST https://your-app-gateway/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin; DROP TABLE users;--"}' \
  -v
```

The first request should succeed (because we excluded `query_text`). The second request should still be blocked (because `username` is not excluded).

## Monitoring After Exclusions

Keep monitoring WAF logs after applying exclusions to make sure you have not opened any gaps.

```
// Monitor WAF activity after applying exclusions
AzureDiagnostics
| where Category == "ApplicationGatewayFirewallLog"
| where TimeGenerated > ago(1h)
| summarize
    Blocked = countif(action_s == "Blocked"),
    Detected = countif(action_s == "Detected"),
    Allowed = countif(action_s == "Allowed")
    by bin(TimeGenerated, 5m)
| render timechart
```

## Best Practices

**Start with Detection mode**: Always run in Detection mode first to identify false positives before switching to Prevention mode. This avoids blocking legitimate traffic.

**Be as specific as possible**: Prefer per-rule exclusions over global exclusions. Use exact match operators instead of wildcards. The narrower the exclusion, the less security surface you expose.

**Document every exclusion**: Keep a record of why each exclusion was created, what false positive it addresses, and when it was last reviewed. Exclusions should be audited regularly.

**Review after CRS updates**: When you upgrade the OWASP CRS version, review your exclusions. New rule versions might fix false positives, making some exclusions unnecessary. New rules might also create new false positives.

**Use per-site WAF policies**: If you have multiple applications behind the same Application Gateway, use per-site WAF policies. This lets you tailor exclusions to each application rather than applying broad exclusions globally.

WAF exclusion rules are a necessary part of any WAF deployment. The key is finding the balance between reducing false positives and maintaining security. Start narrow, test thoroughly, and monitor continuously.
