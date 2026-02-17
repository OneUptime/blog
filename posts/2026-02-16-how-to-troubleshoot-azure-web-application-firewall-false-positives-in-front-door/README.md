# How to Troubleshoot Azure Web Application Firewall False Positives in Front Door

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, WAF, Front Door, Web Security, False Positives, Application Security, Troubleshooting

Description: Learn how to identify, analyze, and resolve Azure Web Application Firewall false positives in Front Door without compromising security posture.

---

You deploy Azure Web Application Firewall (WAF) on Front Door, switch it to prevention mode, and within hours your support team is getting complaints. Legitimate form submissions are being blocked. API calls that worked yesterday are returning 403 errors. File uploads are getting rejected. You check the WAF logs and see hundreds of rule violations, most of which are false positives.

This is the standard WAF experience. Every team goes through it. The WAF rules are intentionally broad to catch as many attack patterns as possible, which means they also catch legitimate traffic that happens to look like an attack. The key is tuning the WAF to reduce false positives without opening security holes.

## Understanding WAF Rule Sets

Azure Front Door WAF uses managed rule sets, primarily the Microsoft Default Rule Set (DRS) and the Bot Manager rule set. The DRS includes rules from the OWASP Core Rule Set (CRS) adapted for Azure.

Rules are organized into groups:
- **SQL Injection (SQLi)** - catches SQL injection patterns
- **Cross-Site Scripting (XSS)** - catches XSS patterns
- **Local File Inclusion (LFI)** - catches path traversal attempts
- **Remote Code Execution (RCE)** - catches command injection patterns
- **Protocol violations** - catches malformed HTTP requests
- **Protocol anomalies** - catches unusual request patterns

Each rule has an ID, and when it triggers, the WAF logs the rule ID along with the matched content. This information is critical for tuning.

## Step 1: Enable Diagnostic Logging

Before you can fix false positives, you need to see them. Enable WAF diagnostic logging to send data to Log Analytics.

```bash
# Enable diagnostic logging for Front Door WAF
az monitor diagnostic-settings create \
  --name "waf-diagnostics" \
  --resource "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Cdn/profiles/myFrontDoor" \
  --workspace "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.OperationalInsights/workspaces/myLAW" \
  --logs '[{"category":"FrontDoorWebApplicationFirewallLog","enabled":true}]'
```

## Step 2: Analyze Blocked Requests

Query the WAF logs to identify which rules are generating the most false positives.

```
// KQL query to find the most frequently triggered WAF rules
// Focus on blocked requests (action == "Block")
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.CDN"
| where Category == "FrontDoorWebApplicationFirewallLog"
| where action_s == "Block"
| summarize count() by ruleName_s, ruleGroup_s, requestUri_s
| order by count_ desc
| take 20
```

This gives you a ranked list of rules causing blocks. Now look at the specific requests being blocked.

```
// Detailed view of blocked requests for a specific rule
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.CDN"
| where Category == "FrontDoorWebApplicationFirewallLog"
| where action_s == "Block"
| where ruleName_s == "942130"
| project TimeGenerated, clientIP_s, requestUri_s, details_matches_s, details_msg_s
| take 50
```

The `details_matches_s` field shows exactly what part of the request triggered the rule. This is the most important field for determining whether a match is a true positive or false positive.

## Step 3: Common False Positive Patterns

Here are the false positive patterns I see most frequently.

### SQL Injection Rules Blocking Form Data

SQL injection rules look for patterns like `SELECT`, `UNION`, `OR 1=1`, and similar SQL keywords in request bodies. If your application has form fields where users type natural language, these rules fire constantly. A user typing "I would like to select the blue option" triggers SQLi rules because of the word "select."

### XSS Rules Blocking HTML Content

XSS rules look for HTML tags, JavaScript event handlers, and script patterns. If your application has a rich text editor that submits HTML content, XSS rules will block almost every submission.

### File Upload Rules

Large file uploads or uploads with certain content types trigger rules that look for malicious file content. Binary content can contain byte sequences that match attack patterns by coincidence.

### Cookie and Header Rules

Rules that inspect cookies and headers can trigger on legitimate values. Authentication tokens, session IDs, and custom headers sometimes contain patterns that match attack signatures.

## Step 4: Apply Exclusions

The primary tool for fixing false positives is WAF exclusions. Exclusions tell the WAF to skip specific parts of the request when evaluating specific rules.

For example, if rule 942130 (SQL injection) is triggering on a form field called "description," you can exclude that field from that specific rule.

```bash
# Create a WAF policy with an exclusion
# This excludes the "description" field from SQL injection rule 942130
az network front-door waf-policy managed-rule-set rule-group-override create \
  --policy-name myWAFPolicy \
  --resource-group myRG \
  --type Microsoft_DefaultRuleSet \
  --version 2.1 \
  --rule-group-id SQLI \
  --rule-id 942130 \
  --action Log \
  --exclusion "RequestBodyPostArgNames Equals description"
```

Be as specific as possible with exclusions. Instead of excluding an entire rule for all requests, exclude a specific field from a specific rule. This minimizes the security impact.

Types of exclusions:
- **RequestHeaderNames** - exclude specific headers from rule evaluation
- **RequestCookieNames** - exclude specific cookies
- **RequestBodyPostArgNames** - exclude specific form field names
- **RequestBodyJsonArgNames** - exclude specific JSON field names
- **QueryStringArgNames** - exclude specific query parameters

## Step 5: Use Per-Rule Actions

Instead of disabling a rule entirely, you can change its action from "Block" to "Log." This lets the rule continue monitoring without blocking traffic. Use this when you cannot create a narrow enough exclusion.

```bash
# Change rule 942130 from Block to Log (monitor only)
az network front-door waf-policy managed-rule-set rule-group-override create \
  --policy-name myWAFPolicy \
  --resource-group myRG \
  --type Microsoft_DefaultRuleSet \
  --version 2.1 \
  --rule-group-id SQLI \
  --rule-id 942130 \
  --action Log
```

Review logged matches regularly. If a rule in Log mode shows only false positives over a period of weeks, you may be comfortable keeping it in Log mode permanently. If it occasionally catches real attacks, consider refining the exclusions further.

## Step 6: Custom Rules for Bypass

For specific URI paths that are known to generate false positives (like admin panels, API endpoints that accept complex data, or webhook receivers), create custom rules that bypass managed rules.

```bash
# Custom rule that allows traffic to the /api/webhooks path
# bypassing managed rule evaluation for this specific path
az network front-door waf-policy custom-rule create \
  --policy-name myWAFPolicy \
  --resource-group myRG \
  --name AllowWebhooks \
  --priority 10 \
  --action Allow \
  --rule-type MatchRule \
  --match-condition "RequestUri Contains /api/webhooks"
```

Custom rules with "Allow" action are processed before managed rules. If a custom rule matches and allows the traffic, managed rules are not evaluated for that request.

Be cautious with this approach. Excluding an entire path from WAF protection creates a potential attack vector if that path is also accessible from the public internet.

## Step 7: Gradual Prevention Mode Rollout

Do not switch the entire WAF to prevention mode at once. Use a gradual approach:

1. Start in detection mode (log everything, block nothing)
2. Analyze logs for two weeks to identify false positive patterns
3. Create exclusions and rule overrides for false positives
4. Switch specific rule groups to prevention mode one at a time
5. Monitor for new false positives after each rule group is enabled
6. Repeat until all rule groups are in prevention mode

This takes longer than a big-bang switch, but it avoids the scenario where you deploy prevention mode and immediately break production.

## Ongoing Maintenance

WAF tuning is not a one-time activity. Managed rule sets are updated periodically, and new rules can introduce new false positives. Application changes can also create new false positive patterns.

Set up a monthly review of WAF logs. Check for new blocked requests that might be false positives. Review any rules that were set to Log mode and decide whether they should be moved to Block or kept in Log.

False positives are the cost of running a WAF. The goal is not to eliminate them entirely but to reduce them to a manageable level while maintaining strong protection against real attacks.
