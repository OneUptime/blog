# How to Write Custom YARA-L Detection Rules in Google Chronicle

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Chronicle SIEM, YARA-L, Detection Rules, Threat Detection

Description: Learn how to write custom YARA-L detection rules in Google Chronicle SIEM for identifying threats, suspicious behavior, and security policy violations.

---

YARA-L is Chronicle's purpose-built detection language. If you have used YARA for malware analysis, YARA-L will feel somewhat familiar, but it is designed specifically for correlating security events across logs rather than scanning files. It lets you write rules that match patterns across multiple events, apply time windows, and trigger alerts when specific conditions are met.

In this guide, I will cover the YARA-L syntax, walk through writing rules of increasing complexity, and share patterns that work well in production environments.

## YARA-L Rule Structure

Every YARA-L rule follows the same basic structure. Here is the skeleton you will work with.

```
rule rule_name {
    meta:
        // Metadata about the rule
        author = "your name"
        description = "what this rule detects"
        severity = "HIGH"

    events:
        // Event matching conditions
        $event.metadata.event_type = "USER_LOGIN"

    condition:
        // When to trigger the alert
        $event
}
```

The four main sections are:

- **meta** - Descriptive information about the rule (author, severity, MITRE ATT&CK mapping)
- **events** - Defines variables and matching conditions for UDM events
- **match** - (Optional) Groups events by specific fields over a time window
- **condition** - Specifies the logical condition that triggers the rule

## Your First Rule: Failed Login Detection

Let me start with something straightforward. This rule detects multiple failed logins from the same IP address.

```
rule multiple_failed_logins {
    meta:
        author = "security-team"
        description = "Detects 5 or more failed logins from the same source IP within 10 minutes"
        severity = "MEDIUM"
        mitre_attack_tactic = "Credential Access"
        mitre_attack_technique = "T1110 - Brute Force"

    events:
        // Match failed authentication events
        $fail.metadata.event_type = "USER_LOGIN"
        $fail.security_result.action = "BLOCK"
        $fail.principal.ip != ""

    match:
        // Group by source IP over a 10-minute window
        $fail.principal.ip over 10m

    condition:
        // Trigger when 5 or more failures are seen
        #fail >= 5
}
```

Let me break down what is happening:

1. The `events` section defines a variable `$fail` that matches login events where the action was blocked
2. The `match` section groups these events by the source IP address within a 10-minute sliding window
3. The `condition` section uses `#fail` (the count operator) to check if 5 or more matching events occurred

## Multi-Event Correlation

The real power of YARA-L shows up when you correlate multiple event types. This rule detects a successful login followed by a privilege escalation - a common attack pattern.

```
rule login_then_privilege_escalation {
    meta:
        author = "security-team"
        description = "Detects successful login followed by role change within 30 minutes"
        severity = "HIGH"
        mitre_attack_tactic = "Privilege Escalation"
        mitre_attack_technique = "T1078 - Valid Accounts"

    events:
        // First event: successful login
        $login.metadata.event_type = "USER_LOGIN"
        $login.security_result.action = "ALLOW"
        $login.target.user.userid = $user_id

        // Second event: IAM role change
        $role_change.metadata.event_type = "USER_RESOURCE_UPDATE_PERMISSIONS"
        $role_change.principal.user.userid = $user_id

        // The role change must happen after the login
        $login.metadata.event_timestamp.seconds <
            $role_change.metadata.event_timestamp.seconds

    match:
        // Correlate by user over a 30-minute window
        $user_id over 30m

    condition:
        $login and $role_change
}
```

Notice the use of the placeholder variable `$user_id` to join the two events. This tells Chronicle to match events where the same user appears in both the login and the role change.

## Using Regular Expressions and Lists

YARA-L supports regex matching and reference lists, which are useful for writing flexible rules.

This rule detects access to sensitive GCS buckets from unusual locations.

```
rule sensitive_bucket_access_from_unusual_location {
    meta:
        author = "security-team"
        description = "Detects access to sensitive storage buckets from non-corporate IPs"
        severity = "HIGH"

    events:
        // Match GCS access events
        $access.metadata.event_type = "USER_RESOURCE_ACCESS"
        $access.target.resource.name = /.*sensitive-data.*/ or
        $access.target.resource.name = /.*pii-bucket.*/ or
        $access.target.resource.name = /.*financial-reports.*/

        // Source IP is not in the corporate IP list
        not $access.principal.ip in %corporate_ips

    condition:
        $access
}
```

The `%corporate_ips` reference is a Chronicle reference list. You create these in the Chronicle UI under Settings. They let you maintain lists of IPs, domains, or other values separately from your rules, so you can update them without modifying rule logic.

## Detecting Data Exfiltration Patterns

This more advanced rule looks for a user downloading an unusually high volume of files from Cloud Storage.

```
rule possible_data_exfiltration_gcs {
    meta:
        author = "security-team"
        description = "Detects user downloading more than 50 objects from GCS in 1 hour"
        severity = "HIGH"
        mitre_attack_tactic = "Exfiltration"
        mitre_attack_technique = "T1530 - Data from Cloud Storage"

    events:
        // Match GCS object download events
        $download.metadata.event_type = "USER_RESOURCE_ACCESS"
        $download.metadata.product_name = "Google Cloud Storage"
        $download.metadata.product_event_type = "storage.objects.get"
        $download.principal.user.email_addresses = $user_email
        $download.principal.user.email_addresses != ""

    match:
        // Group by user email over a 1-hour window
        $user_email over 1h

    condition:
        // Trigger when more than 50 downloads happen
        #download > 50
}
```

## Outcome-Based Rules

YARA-L lets you define outcomes that enrich your alerts with additional context. This is incredibly useful for triage.

```
rule suspicious_service_account_key_creation {
    meta:
        author = "security-team"
        description = "Detects service account key creation outside of approved automation"
        severity = "MEDIUM"

    events:
        $key_create.metadata.event_type = "USER_RESOURCE_CREATION"
        $key_create.metadata.product_event_type = "google.iam.admin.v1.CreateServiceAccountKey"
        $key_create.principal.user.email_addresses = $creator

        // Exclude known automation service accounts
        not $key_create.principal.user.email_addresses = /.*@.*\.iam\.gserviceaccount\.com$/

    match:
        $creator over 1h

    outcome:
        // Add risk score and context to the alert
        $risk_score = max(50)
        $target_sa = array_distinct($key_create.target.resource.name)
        $source_ips = array_distinct($key_create.principal.ip)
        $event_count = count_distinct($key_create.metadata.id)

    condition:
        $key_create
}
```

The `outcome` section calculates values that get attached to the resulting alert. Analysts see these immediately, which speeds up investigation.

## Testing and Deploying Rules

Before enabling a rule in production, test it using Chronicle's rule testing feature.

1. Navigate to Detection in the Chronicle console, then Rules
2. Click "Create Rule" and paste your YARA-L code
3. Click "Test Rule" to run it against historical data
4. Review the matches to check for false positives
5. Adjust thresholds and conditions as needed
6. Enable the rule when you are satisfied

A few testing tips:

- Start with a wider time window during testing to catch more potential matches
- Use the `nocase` modifier for string comparisons when case sensitivity might cause missed detections
- Test with both true positives (known bad events) and normal traffic to gauge false positive rates

## Best Practices for Production Rules

After writing and deploying dozens of YARA-L rules, here are patterns that work well:

**Use severity levels consistently.** Map LOW to informational detections, MEDIUM to things that need review within a day, HIGH to things needing immediate attention, and CRITICAL to active compromise indicators.

**Include MITRE ATT&CK mappings.** This helps analysts understand the context of a detection without reading the full rule logic.

**Keep reference lists updated.** Rules that depend on IP allowlists or user lists become useless if those lists go stale. Automate list updates where possible.

**Start with high-fidelity rules.** It is better to have 10 rules that fire accurately than 100 rules that generate noise. Alert fatigue kills SOC productivity faster than anything else.

**Version your rules.** Store rules in a Git repository and use Chronicle's API to deploy them. This gives you an audit trail and the ability to roll back.

YARA-L gives you a powerful language for building detections that map to your specific environment and threat model. Start with the patterns in this guide, adapt them to your log sources and use cases, and iterate based on what you find in production.
