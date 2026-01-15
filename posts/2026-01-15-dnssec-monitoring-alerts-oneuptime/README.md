# How to Set Up DNSSEC Monitoring Alerts with OneUptime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: DNSSEC, OneUptime, Monitoring, Alerting, DNS, Security

Description: Learn how to configure comprehensive DNSSEC monitoring and alerts in OneUptime to protect your domain from DNS spoofing, cache poisoning, and signature expiration issues.

---

DNSSEC (Domain Name System Security Extensions) adds cryptographic authentication to DNS responses, protecting users from DNS spoofing and cache poisoning attacks. When DNSSEC fails, your domain becomes vulnerable or entirely unreachable. OneUptime gives you the tools to monitor DNSSEC health continuously and alert your team before problems impact users.

---

## Why DNSSEC Monitoring Matters

DNS is the foundation of internet connectivity. Every web request, API call, and email delivery depends on DNS resolution. DNSSEC adds a layer of cryptographic verification that ensures DNS responses are authentic and untampered. But DNSSEC introduces new failure modes that traditional monitoring misses.

### Common DNSSEC Failure Scenarios

- **Signature expiration**: RRSIG records have validity periods. If signatures expire without renewal, validation fails.
- **Key rollover problems**: DNSKEY rotation mistakes can break the chain of trust.
- **DS record mismatches**: Parent zone DS records must match child zone keys exactly.
- **Algorithm misconfigurations**: Using deprecated or mismatched algorithms causes validation failures.
- **NSEC/NSEC3 issues**: Denial of existence proofs can fail if zone walking protection is misconfigured.
- **Zone serial problems**: SOA serial number inconsistencies can cause replication and validation issues.

When any of these fail, DNSSEC-validating resolvers reject your domain entirely. Users see connection failures, and your services go dark for a portion of the internet.

---

## What OneUptime DNSSEC Monitoring Provides

OneUptime offers comprehensive DNSSEC monitoring through its DNS monitor type. Here is what you get:

- **Chain of trust validation**: Verify the complete DNSSEC chain from root to your domain.
- **Signature expiration tracking**: Monitor RRSIG validity periods and alert before expiration.
- **Key health checks**: Verify DNSKEY records are present and properly configured.
- **DS record verification**: Ensure parent zone DS records match your zone keys.
- **Multi-location probing**: Test DNSSEC from multiple global locations to catch regional issues.
- **Automated alerting**: Get notified through email, SMS, Slack, PagerDuty, or webhooks.
- **Historical tracking**: Review DNSSEC health over time to spot degradation patterns.

---

## Prerequisites

Before setting up DNSSEC monitoring, ensure you have:

1. **A OneUptime account**: Sign up at https://oneuptime.com if you have not already.
2. **A project created**: Monitors belong to projects in OneUptime.
3. **DNSSEC enabled on your domain**: Monitoring only makes sense if DNSSEC is active.
4. **Access to notification channels**: Configure where you want alerts delivered.

If you are new to DNSSEC, here is a quick verification that your domain has it enabled:

```bash
dig +dnssec +short example.com DNSKEY
```

If you see DNSKEY records returned, DNSSEC is configured. If not, you will need to enable it with your DNS provider first.

---

## Step-by-Step: Create a DNSSEC Monitor

### Step 1: Navigate to Monitors

1. Log in to your OneUptime dashboard.
2. Select your project from the sidebar.
3. Click on **Monitors** in the navigation menu.
4. Click the **Create Monitor** button in the top right.

### Step 2: Select DNS Monitor Type

OneUptime supports multiple monitor types. For DNSSEC monitoring:

1. Choose **DNS** from the monitor type options.
2. This monitor type includes DNSSEC validation as part of its checks.

### Step 3: Configure Basic Settings

Fill in the basic monitor configuration:

**Monitor Name**: Choose a descriptive name that identifies the domain and purpose.

Examples:
- "Production Domain DNSSEC - example.com"
- "API Domain DNSSEC - api.example.com"
- "CDN Domain DNSSEC - cdn.example.com"

**Description**: Add context for your team.

Example: "Monitors DNSSEC chain of trust for our primary production domain. Critical for user trust and SEO."

### Step 4: Enter Domain Details

**Domain Name**: Enter the fully qualified domain name you want to monitor.

Examples:
- `example.com` (apex domain)
- `www.example.com` (subdomain)
- `api.example.com` (service subdomain)

**Record Type**: Select the DNS record type to query. Common choices:

| Record Type | Use Case |
|-------------|----------|
| A | IPv4 address resolution |
| AAAA | IPv6 address resolution |
| MX | Email server records |
| TXT | SPF, DKIM, and other text records |
| CNAME | Alias records |
| NS | Nameserver delegation |
| SOA | Zone authority information |

For DNSSEC monitoring, querying A or AAAA records is typical since these are the most commonly resolved record types.

### Step 5: Enable DNSSEC Validation

This is the critical step for DNSSEC monitoring:

1. Look for the **DNSSEC Validation** toggle or checkbox.
2. Enable DNSSEC validation for this monitor.
3. When enabled, OneUptime will verify the complete chain of trust for every check.

With DNSSEC validation enabled, the monitor will:
- Fetch DNSKEY records from your zone
- Verify RRSIG signatures on all returned records
- Validate the DS record chain to the parent zone
- Continue up the chain to the root zone
- Report failures if any validation step fails

### Step 6: Configure Monitoring Interval

Choose how often OneUptime should check your DNSSEC configuration:

| Interval | Recommendation |
|----------|----------------|
| 1 minute | Critical production domains |
| 5 minutes | Important domains with SLO requirements |
| 15 minutes | Standard monitoring for most domains |
| 30 minutes | Lower priority or development domains |
| 1 hour | Cost-sensitive or low-traffic domains |

For DNSSEC specifically, 5-15 minute intervals are usually appropriate. DNSSEC failures do not resolve on their own, so you do not need sub-minute polling. But you want to catch issues quickly before users notice.

### Step 7: Select Probe Locations

OneUptime offers global probe locations. For DNSSEC monitoring, multiple locations matter because:

- Different DNS resolvers may have cached different data
- Regional DNS anycast nodes might have inconsistent configurations
- Some locations may use different resolver implementations

Select at least 2-3 geographically diverse locations:
- One in your primary user region
- One in a secondary market
- One in a distant region for global coverage

If you run self-hosted probes inside private networks, include those for internal DNS validation.

### Step 8: Set Success Criteria

Define what constitutes a successful check:

**DNS Resolution**: The query must return valid records.

**DNSSEC Validation**: The complete chain of trust must validate successfully.

**Response Time**: Optionally set a maximum acceptable response time (e.g., 500ms).

For DNSSEC monitoring, the validation requirement is the primary criterion. If validation fails, the check fails, regardless of whether records are returned.

### Step 9: Save the Monitor

Click **Save** to create your monitor. OneUptime will immediately begin checking your DNSSEC configuration from the selected probe locations.

---

## Configuring Alerts for DNSSEC Issues

Monitoring without alerting is just observing. Here is how to configure alerts that notify your team when DNSSEC problems occur.

### Navigate to Alert Configuration

1. Open your newly created DNSSEC monitor.
2. Click on the **Alerts** tab or section.
3. Click **Add Alert Rule** to create a new alert.

### Configure Alert Conditions

**Condition Type**: Choose when this alert should fire.

For DNSSEC monitoring, typical conditions include:

| Condition | Description | Use Case |
|-----------|-------------|----------|
| Monitor is offline | DNSSEC validation failed | Primary failure detection |
| Monitor is degraded | Partial failures or slow response | Early warning detection |
| Monitor has been offline for X minutes | Sustained failure | Confirms real outage vs transient glitch |

**Recommended Configuration**:

Create two alert rules for comprehensive coverage:

**Rule 1: Immediate Alert**
- Condition: Monitor is offline
- Threshold: Immediate (0 minute delay)
- Severity: High
- Purpose: Catch any DNSSEC failure instantly

**Rule 2: Sustained Alert**
- Condition: Monitor has been offline for 5 minutes
- Severity: Critical
- Purpose: Escalate for confirmed outages

This two-tier approach prevents alert fatigue from momentary glitches while ensuring sustained issues get appropriate escalation.

### Configure Alert Severity

Map DNSSEC issues to your incident severity framework:

| OneUptime Severity | Typical Mapping | Response |
|-------------------|-----------------|----------|
| Critical | SEV-1 / P1 | Immediate page, all hands |
| High | SEV-2 / P2 | On-call response within 15 minutes |
| Medium | SEV-3 / P3 | Respond during business hours |
| Low | SEV-4 / P4 | Track for next maintenance window |

DNSSEC failures typically warrant High or Critical severity because they can make your domain completely unreachable for validating resolvers.

### Configure Notification Channels

Set up where alerts are delivered. OneUptime supports multiple channels:

**Email Notifications**:
- Add team distribution lists
- Include on-call rotation emails
- Add stakeholder addresses for critical domains

**SMS Notifications**:
- Direct mobile alerts for on-call engineers
- Backup notification path if other channels fail

**Slack Integration**:
- Post to incident channels
- Mention specific users or groups
- Include monitor details in message

**PagerDuty Integration**:
- Trigger incidents in your existing on-call system
- Leverage PagerDuty escalation policies
- Maintain single pane of glass for incidents

**Microsoft Teams**:
- Post to operations channels
- Alert relevant team members

**Webhook Integration**:
- Trigger custom automation
- Integrate with internal tools
- Feed to SIEM or security platforms

**Recommended Channel Configuration**:

| Severity | Channels |
|----------|----------|
| Critical | SMS + PagerDuty + Slack + Email |
| High | PagerDuty + Slack + Email |
| Medium | Slack + Email |
| Low | Email only |

### Configure Alert Timing

**Alert Delay**: How long a condition must persist before alerting.

For DNSSEC, a small delay (1-2 minutes) can prevent false positives from:
- Network transients
- Probe connectivity issues
- DNS resolver hiccups

However, do not delay too long. DNSSEC failures are serious and require rapid response.

**Repeat Notifications**: How often to re-notify if the issue persists.

- Every 15 minutes for critical issues
- Every hour for high issues
- Once daily for medium/low issues

**Auto-Resolve**: Whether to automatically resolve alerts when the monitor recovers.

Enable auto-resolve for DNSSEC monitors. Once validation succeeds again, the immediate issue is resolved (though you should still investigate the root cause).

---

## Setting Up On-Call Rotations

For 24/7 DNSSEC monitoring coverage, configure on-call rotations in OneUptime.

### Create an On-Call Schedule

1. Navigate to **On-Call** in your project.
2. Click **Create Schedule**.
3. Name it appropriately (e.g., "DNS and Security On-Call").

### Configure Rotation Layers

**Primary Layer**: First responders who get paged immediately.

**Secondary Layer**: Escalation if primary does not acknowledge within SLA.

**Manager Layer**: Further escalation for extended outages.

### Set Rotation Timing

| Pattern | Configuration | Use Case |
|---------|---------------|----------|
| Weekly | 7-day rotations | Small teams |
| Daily | 24-hour rotations | Larger teams, spread load |
| Follow the Sun | Time-zone based handoffs | Global teams |
| Business Hours | Weekday coverage only | Non-critical domains |

### Link On-Call to Alerts

In your DNSSEC monitor alert configuration:

1. Select **On-Call Policy** as a notification target.
2. Choose the appropriate on-call schedule.
3. Configure escalation timing.

Now when DNSSEC fails, the on-call engineer gets paged automatically.

---

## Creating Runbooks for DNSSEC Incidents

Effective DNSSEC incident response requires documented procedures. Link runbooks to your alerts so responders have immediate guidance.

### Runbook Structure

Create a runbook document (in OneUptime or your knowledge base) with these sections:

**1. Verification Steps**

```markdown
## Verify the Issue

1. Check OneUptime monitor details for specific error
2. Run manual DNSSEC validation:
   ```
   dig +dnssec +trace example.com
   ```
3. Check https://dnsviz.net for visual chain analysis
4. Verify with https://dnssec-analyzer.verisignlabs.com/
```

**2. Common Causes and Fixes**

```markdown
## Expired Signatures (RRSIG)

Symptoms:
- "signature expired" errors
- RRSIG dates show past validity

Fix:
1. Contact DNS provider to re-sign zone
2. If self-managed, run zone resign process
3. Verify new signatures propagate

## DS Record Mismatch

Symptoms:
- "DS record not found" or "DS mismatch" errors
- Parent zone shows different DS than child DNSKEY

Fix:
1. Generate new DS from current DNSKEY
2. Update DS at registrar
3. Wait for propagation (up to 48 hours)
4. Monitor for resolution

## Missing DNSKEY

Symptoms:
- "DNSKEY not found" errors
- Zone returns no DNSKEY records

Fix:
1. Verify zone file includes DNSKEY
2. Check zone signing configuration
3. Re-enable DNSSEC at provider if necessary
```

**3. Escalation Path**

```markdown
## Escalation

If not resolved in 30 minutes:
1. Escalate to DNS team lead
2. Contact DNS provider support
3. Consider temporary DNSSEC disable (last resort)

Emergency contacts:
- DNS Provider: [support number]
- Registrar: [support number]
- Domain Admin: [internal contact]
```

### Link Runbook to Monitor

In OneUptime, add the runbook URL to your monitor:

1. Edit the DNSSEC monitor.
2. Find the **Runbook URL** or **Documentation** field.
3. Paste the runbook link.

Now when alerts fire, responders see the runbook link immediately.

---

## Advanced DNSSEC Monitoring Configurations

### Monitor Multiple Record Types

For comprehensive DNSSEC coverage, create separate monitors for different record types:

| Monitor | Record Type | Purpose |
|---------|-------------|---------|
| DNSSEC - A Record | A | Primary website resolution |
| DNSSEC - AAAA Record | AAAA | IPv6 resolution |
| DNSSEC - MX Record | MX | Email delivery |
| DNSSEC - TXT Record | TXT | SPF/DKIM validation |

Each record type can have independent DNSSEC issues, especially in complex zones.

### Monitor DNSKEY Directly

Create a dedicated monitor that queries DNSKEY records:

1. Create a new DNS monitor.
2. Set record type to DNSKEY.
3. Enable DNSSEC validation.
4. Set success criteria to require DNSKEY in response.

This catches key publication issues that might not affect A record resolution immediately but will cause future failures.

### Monitor DS Records at Parent

Create a monitor that queries your parent zone for DS records:

1. Create a new DNS monitor.
2. Query the parent zone (e.g., for `example.com`, query `com.` nameservers).
3. Set record type to DS.
4. Verify expected DS record is present.

This detects DS record removal or modification at the registrar level.

### Signature Expiration Warning

While OneUptime monitors validation success, you can also track signature expiration proactively:

1. Create a custom script monitor or synthetic monitor.
2. Parse RRSIG records to extract expiration dates.
3. Alert when expiration is within 7 days.
4. Escalate when expiration is within 24 hours.

This provides advance warning before failures occur.

---

## Integrating with Incident Management

### Automatic Incident Creation

Configure OneUptime to automatically create incidents when DNSSEC monitors fail:

1. Navigate to your project settings.
2. Find **Incident Settings** or **Automation**.
3. Create a rule: "When DNSSEC monitor goes offline, create incident."
4. Set incident template with appropriate title and description.

### Status Page Integration

If you run a public status page with OneUptime, link DNSSEC monitors to service status:

1. Create a service component for "DNS Resolution" or "Domain Security."
2. Link your DNSSEC monitors to this component.
3. Configure status mapping:
   - Monitor online = Operational
   - Monitor degraded = Degraded Performance
   - Monitor offline = Major Outage

Now your status page automatically reflects DNSSEC health.

---

## Testing Your DNSSEC Monitoring

Before relying on your monitoring in production, verify it works correctly.

### Test Alert Delivery

1. Temporarily change your monitor to check an invalid domain.
2. Verify alerts fire and reach all configured channels.
3. Confirm on-call paging works.
4. Test alert acknowledgment and resolution.
5. Restore the correct domain configuration.

### Test Runbook Access

1. Trigger a test alert.
2. Follow the runbook link from the alert.
3. Verify runbook content is current and accessible.
4. Confirm all team members can access the runbook.

### Simulate DNSSEC Failure

If you have a test domain with DNSSEC:

1. Temporarily break DNSSEC (remove DS record or expire signatures).
2. Verify OneUptime detects the failure.
3. Confirm alerts fire with correct severity.
4. Practice incident response using your runbook.
5. Restore DNSSEC and verify recovery detection.

Never test on production domains without careful planning and communication.

---

## Best Practices for DNSSEC Monitoring

### Do: Monitor All Critical Domains

Do not just monitor your primary domain. Include:
- All production domains
- API domains
- CDN domains
- Email domains
- Any domain where DNSSEC is enabled

### Do: Use Multiple Probe Locations

DNSSEC issues can be regional due to DNS anycast or caching. Multiple probes catch geographically isolated problems.

### Do: Set Appropriate Alert Thresholds

Balance sensitivity with noise. DNSSEC failures are rare but serious. Err on the side of alerting quickly.

### Do: Maintain Updated Runbooks

DNSSEC troubleshooting requires specific knowledge. Keep runbooks current with:
- Provider contact information
- Current key management procedures
- Recent configuration changes

### Do: Review Monitor History Regularly

Check your DNSSEC monitor history monthly. Look for:
- Near-misses (brief failures that recovered)
- Response time trends
- Geographic consistency

### Do Not: Ignore Intermittent Failures

Even brief DNSSEC failures impact users. Investigate any validation failure, even if it self-resolved.

### Do Not: Rely on Single Check Location

One probe location can have local network issues or use a resolver with stale cache. Multiple locations provide confidence.

### Do Not: Set Excessive Alert Delays

DNSSEC failures make your domain unreachable for validating resolvers. Every minute matters. Keep alert delays short.

### Do Not: Forget Signature Expiration

RRSIG expiration is the most common DNSSEC failure mode. Monitor proactively, not just reactively.

---

## DNSSEC Monitoring Checklist

Use this checklist to verify your DNSSEC monitoring setup is complete:

### Monitor Configuration

| Item | Status |
|------|--------|
| DNS monitor created for primary domain | |
| DNSSEC validation enabled | |
| Appropriate record type selected | |
| Multiple probe locations configured | |
| Reasonable check interval set | |
| Monitor is active and showing data | |

### Alert Configuration

| Item | Status |
|------|--------|
| Alert rule for immediate failure | |
| Alert rule for sustained failure | |
| Appropriate severity levels set | |
| Email notification configured | |
| SMS/phone notification configured | |
| Slack/Teams notification configured | |
| PagerDuty/webhook integration configured | |
| Alert repeat interval set | |
| Auto-resolve enabled | |

### On-Call Configuration

| Item | Status |
|------|--------|
| On-call schedule created | |
| Primary rotation configured | |
| Escalation policy defined | |
| On-call linked to DNSSEC alerts | |
| Team members added to rotation | |

### Runbook and Documentation

| Item | Status |
|------|--------|
| Runbook created for DNSSEC incidents | |
| Verification steps documented | |
| Common fixes documented | |
| Escalation path documented | |
| Runbook linked to monitor | |
| Team trained on runbook | |

### Testing and Validation

| Item | Status |
|------|--------|
| Alert delivery tested | |
| On-call paging tested | |
| Runbook accessibility verified | |
| Recovery detection confirmed | |

---

## Summary: DNSSEC Monitoring with OneUptime

DNSSEC adds essential security to DNS but introduces new failure modes. OneUptime provides the monitoring and alerting infrastructure to catch DNSSEC issues before they impact users.

### Key Takeaways

1. **DNSSEC failures are serious**: They make your domain unreachable for validating resolvers.

2. **Common failure modes**: Signature expiration, key rollover issues, and DS record mismatches are the usual suspects.

3. **OneUptime DNS monitors**: Include built-in DNSSEC validation to verify the complete chain of trust.

4. **Multi-location probing**: Essential for catching regional or resolver-specific issues.

5. **Layered alerting**: Immediate alerts for any failure, escalation for sustained issues.

6. **Runbooks matter**: DNSSEC troubleshooting requires specific knowledge. Document it.

7. **Test your setup**: Verify alerts reach the right people before a real incident.

### Quick Reference Table

| Configuration | Recommended Setting |
|---------------|---------------------|
| Monitor Type | DNS |
| DNSSEC Validation | Enabled |
| Check Interval | 5-15 minutes |
| Probe Locations | 3+ geographically diverse |
| Alert Threshold | Immediate + 5-minute sustained |
| Alert Severity | High or Critical |
| Notifications | SMS + PagerDuty + Slack + Email |
| On-Call | 24/7 rotation linked |
| Runbook | Linked to monitor |

### Next Steps

1. **Create your first DNSSEC monitor**: Follow the step-by-step guide above.
2. **Configure alerts**: Ensure your team gets notified immediately.
3. **Set up on-call**: Define who responds and when.
4. **Write your runbook**: Document troubleshooting for your specific DNS setup.
5. **Test everything**: Verify the complete alert chain works.
6. **Monitor additional domains**: Cover all DNSSEC-enabled domains you manage.

With proper DNSSEC monitoring in place, you will catch signature expirations, key problems, and validation failures before your users experience outages. Your domains stay secure, and your team sleeps better knowing OneUptime is watching.

---

## Additional Resources

- [DNSSEC Fundamentals](https://www.icann.org/resources/pages/dnssec-what-is-it-why-important-2019-03-05-en) - ICANN's introduction to DNSSEC
- [DNSViz](https://dnsviz.net/) - Visual DNSSEC analysis tool
- [DNSSEC Analyzer](https://dnssec-analyzer.verisignlabs.com/) - Verisign's DNSSEC validation tool
- [RFC 4033-4035](https://datatracker.ietf.org/doc/html/rfc4033) - DNSSEC protocol specifications
- [OneUptime Documentation](https://oneuptime.com/docs) - Complete OneUptime setup guides

---

## Conclusion

DNSSEC monitoring is not optional for organizations that have enabled DNS security extensions. Signature expirations, key rollovers, and configuration mistakes can make your domain completely unreachable for a growing portion of internet users who rely on validating resolvers.

OneUptime makes DNSSEC monitoring accessible. You do not need to write scripts, parse DNS responses manually, or build custom alerting infrastructure. Configure a DNS monitor with DNSSEC validation enabled, set up alerts to your preferred channels, and let OneUptime watch your domains around the clock.

Start with your most critical domain today. Expand coverage as you confirm the monitoring works. Keep your runbooks current. And when the next DNSSEC issue arises, whether from an expired signature or a botched key rollover, you will know about it in minutes, not hours.

Your domain security depends on it. Your users expect it. OneUptime delivers it.

---
