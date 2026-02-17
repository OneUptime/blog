# How to Enable Preconfigured WAF Rules to Block SQL Injection Attacks in Cloud Armor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Armor, WAF, SQL Injection, Security, OWASP

Description: Learn how to enable preconfigured WAF rules in Google Cloud Armor to detect and block SQL injection attacks using OWASP ModSecurity Core Rule Set.

---

SQL injection remains one of the most common and dangerous web application vulnerabilities. An attacker sends malicious SQL through input fields, query parameters, or headers, and if your application does not properly sanitize inputs, the attacker can read, modify, or delete data from your database.

Cloud Armor includes preconfigured WAF (Web Application Firewall) rules based on the OWASP ModSecurity Core Rule Set (CRS) that can detect and block SQL injection attempts at the edge, before they reach your application. In this guide, I will show you how to enable these rules, tune them to reduce false positives, and monitor their effectiveness.

## What Are Preconfigured WAF Rules?

Cloud Armor's preconfigured WAF rules are signature-based detection rules derived from the OWASP ModSecurity Core Rule Set. They inspect request headers, query parameters, URL paths, and request bodies for patterns that match known attack signatures.

For SQL injection, the rules look for patterns like:
- `' OR 1=1 --` in query parameters
- `UNION SELECT` statements in URLs
- Comment sequences like `/**/` used to bypass filters
- Common SQL functions like `CONCAT()`, `SLEEP()`, `BENCHMARK()`
- Encoded versions of these patterns (URL encoding, hex encoding, etc.)

## Available SQL Injection Rule Sets

Cloud Armor provides several sensitivity levels for SQL injection detection:

| Expression | Sensitivity | False Positive Risk |
|-----------|------------|-------------------|
| `sqli-v33-stable` | Stable, lower sensitivity | Lower |
| `sqli-v33-canary` | Canary, includes newer rules | Higher |
| Sensitivity level 1 | Most confident detections only | Lowest |
| Sensitivity level 2 | More patterns detected | Low |
| Sensitivity level 3 | Broad detection | Medium |
| Sensitivity level 4 | Maximum detection | Highest |

Start with a lower sensitivity level and increase it gradually after monitoring for false positives.

## Step 1: Create a Security Policy

```bash
# Create a security policy for WAF rules
gcloud compute security-policies create waf-policy \
    --description="WAF security policy with SQL injection protection" \
    --project=my-project
```

## Step 2: Enable SQL Injection Detection (Preview Mode)

Start with preview mode to see what the rules would block without actually blocking anything.

```bash
# Enable SQL injection detection at sensitivity level 1 in preview mode
gcloud compute security-policies rules create 1000 \
    --security-policy=waf-policy \
    --expression="evaluatePreconfiguredExpr('sqli-v33-stable', ['owasp-crs-v030301-id942251-sqli','owasp-crs-v030301-id942420-sqli','owasp-crs-v030301-id942431-sqli','owasp-crs-v030301-id942460-sqli','owasp-crs-v030301-id942421-sqli','owasp-crs-v030301-id942432-sqli'])" \
    --action=deny-403 \
    --description="Block SQL injection - sensitivity level 1" \
    --preview \
    --project=my-project
```

A simpler approach is to enable the entire rule set.

```bash
# Enable all SQL injection rules in preview mode
gcloud compute security-policies rules create 1000 \
    --security-policy=waf-policy \
    --expression="evaluatePreconfiguredExpr('sqli-v33-stable')" \
    --action=deny-403 \
    --description="Block SQL injection attacks - all rules" \
    --preview \
    --project=my-project
```

## Step 3: Attach the Policy and Monitor

```bash
# Attach the policy to your backend service
gcloud compute backend-services update my-web-backend \
    --security-policy=waf-policy \
    --global \
    --project=my-project
```

Now monitor the logs to see what traffic would be blocked.

```bash
# Check preview matches for SQL injection rules
gcloud logging read \
    'resource.type="http_load_balancer" AND jsonPayload.previewSecurityPolicy.name="waf-policy" AND jsonPayload.previewSecurityPolicy.preconfiguredExprIds:"sqli"' \
    --format="json(timestamp,httpRequest.requestUrl,httpRequest.remoteIp,jsonPayload.previewSecurityPolicy.preconfiguredExprIds)" \
    --limit=50 \
    --project=my-project
```

Review the matches carefully. Look for:
- Legitimate requests that contain SQL-like patterns (search queries, code examples in blog posts, etc.)
- Actual SQL injection attempts
- The specific rule IDs that triggered

## Step 4: Tune Rules to Reduce False Positives

After monitoring in preview mode, you will likely find some false positives. You can exclude specific rules that trigger on legitimate traffic.

```bash
# Enable SQL injection rules but exclude specific rule IDs that cause false positives
gcloud compute security-policies rules update 1000 \
    --security-policy=waf-policy \
    --expression="evaluatePreconfiguredExpr('sqli-v33-stable', ['owasp-crs-v030301-id942432-sqli','owasp-crs-v030301-id942421-sqli'])" \
    --action=deny-403 \
    --description="Block SQLi - tuned to exclude false positives" \
    --preview \
    --project=my-project
```

The excluded rule IDs in the second parameter are rules that will be skipped. This lets you keep most protections active while suppressing the ones that cause problems with your specific application.

### Common False Positive Scenarios

**Search functionality**: Users searching for terms like "select", "union", or "drop" can trigger rules. Exclude the overly broad rules or create a path-based exception.

```bash
# Allow SQL-like search terms on the search endpoint
gcloud compute security-policies rules create 900 \
    --security-policy=waf-policy \
    --expression="request.path == '/search'" \
    --action=allow \
    --description="Skip WAF for search endpoint" \
    --project=my-project
```

**API endpoints accepting JSON**: SQL-like patterns in JSON request bodies can trigger detections.

**Blog or CMS content**: If your application accepts content that includes code examples, SQL keywords in the content will trigger rules.

## Step 5: Enforce the Rules

Once you are satisfied with the tuning, remove preview mode to start enforcing.

```bash
# Remove preview mode - start blocking SQL injection attempts
gcloud compute security-policies rules update 1000 \
    --security-policy=waf-policy \
    --no-preview \
    --project=my-project
```

## Step 6: Add Additional OWASP Protections

SQL injection is just one attack vector. Cloud Armor has preconfigured rules for other OWASP Top 10 threats too.

```bash
# Block cross-site scripting (XSS) attacks
gcloud compute security-policies rules create 2000 \
    --security-policy=waf-policy \
    --expression="evaluatePreconfiguredExpr('xss-v33-stable')" \
    --action=deny-403 \
    --description="Block XSS attacks" \
    --project=my-project

# Block local file inclusion (LFI) attacks
gcloud compute security-policies rules create 3000 \
    --security-policy=waf-policy \
    --expression="evaluatePreconfiguredExpr('lfi-v33-stable')" \
    --action=deny-403 \
    --description="Block LFI attacks" \
    --project=my-project

# Block remote file inclusion (RFI) attacks
gcloud compute security-policies rules create 4000 \
    --security-policy=waf-policy \
    --expression="evaluatePreconfiguredExpr('rfi-v33-stable')" \
    --action=deny-403 \
    --description="Block RFI attacks" \
    --project=my-project

# Block remote code execution (RCE) attacks
gcloud compute security-policies rules create 5000 \
    --security-policy=waf-policy \
    --expression="evaluatePreconfiguredExpr('rce-v33-stable')" \
    --action=deny-403 \
    --description="Block RCE attacks" \
    --project=my-project

# Block protocol attacks
gcloud compute security-policies rules create 6000 \
    --security-policy=waf-policy \
    --expression="evaluatePreconfiguredExpr('protocolattack-v33-stable')" \
    --action=deny-403 \
    --description="Block protocol attacks" \
    --project=my-project
```

## Terraform Configuration

```hcl
# Security policy with SQL injection and other WAF rules
resource "google_compute_security_policy" "waf" {
  name        = "waf-policy"
  description = "WAF policy with OWASP rules"

  # Default allow
  rule {
    action   = "allow"
    priority = 2147483647
    description = "Default allow"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
  }

  # Block SQL injection
  rule {
    action   = "deny(403)"
    priority = 1000
    description = "Block SQL injection attacks"
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-v33-stable')"
      }
    }
  }

  # Block XSS
  rule {
    action   = "deny(403)"
    priority = 2000
    description = "Block XSS attacks"
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-v33-stable')"
      }
    }
  }

  # Block LFI
  rule {
    action   = "deny(403)"
    priority = 3000
    description = "Block LFI attacks"
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('lfi-v33-stable')"
      }
    }
  }

  # Block RCE
  rule {
    action   = "deny(403)"
    priority = 5000
    description = "Block RCE attacks"
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('rce-v33-stable')"
      }
    }
  }
}
```

## Step 7: Monitor and Analyze WAF Events

Set up ongoing monitoring for WAF rule matches.

```bash
# View all WAF blocks in the last hour
gcloud logging read \
    'resource.type="http_load_balancer" AND jsonPayload.enforcedSecurityPolicy.outcome="DENY" AND jsonPayload.enforcedSecurityPolicy.preconfiguredExprIds:"sqli"' \
    --format="table(timestamp,httpRequest.remoteIp,httpRequest.requestUrl)" \
    --limit=50 \
    --project=my-project
```

### Create a BigQuery Sink for Analysis

```bash
# Export WAF logs to BigQuery for analysis
gcloud logging sinks create waf-logs-to-bq \
    bigquery.googleapis.com/projects/my-project/datasets/waf_logs \
    --log-filter='resource.type="http_load_balancer" AND jsonPayload.enforcedSecurityPolicy.name="waf-policy"' \
    --project=my-project
```

Then query BigQuery for attack patterns:

```sql
-- Top SQL injection attack sources
SELECT
  httpRequest.remoteIp AS attacker_ip,
  COUNT(*) AS attack_count,
  MIN(timestamp) AS first_seen,
  MAX(timestamp) AS last_seen
FROM
  `my-project.waf_logs.requests_*`
WHERE
  jsonPayload.enforcedSecurityPolicy.outcome = 'DENY'
  AND EXISTS(
    SELECT 1 FROM UNNEST(jsonPayload.enforcedSecurityPolicy.preconfiguredExprIds) AS rule
    WHERE rule LIKE '%sqli%'
  )
GROUP BY
  attacker_ip
ORDER BY
  attack_count DESC
LIMIT 20;
```

## Wrapping Up

Preconfigured WAF rules in Cloud Armor provide a strong defense against SQL injection without requiring you to write and maintain your own detection patterns. The key is to start in preview mode, monitor for false positives, tune the rules by excluding specific signatures that conflict with your application, and then enforce. Combined with proper input validation in your application code, Cloud Armor's WAF rules create a defense-in-depth approach where attacks are caught at the edge even if application-level protections have gaps.
