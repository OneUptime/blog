# How to Build On-Call Handoff Procedures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Site Reliability Engineering, On-Call, Incident Response, Documentation, Best Practices

Description: A comprehensive guide to creating effective on-call handoff procedures that ensure smooth transitions, reduce incident response time, and prevent knowledge gaps between shifts.

---

> "The quality of your on-call handoffs directly determines how quickly your next shift can respond to incidents. A five-minute handoff conversation can save hours of confusion at 3 AM."

---

## Why Handoff Procedures Matter

On-call handoffs are critical moments in your incident response workflow. A poorly executed handoff can lead to:

- Delayed incident response due to missing context
- Repeated troubleshooting of known issues
- Escalations that could have been avoided
- Burnout from engineers feeling unprepared
- Customer impact from extended resolution times

A well-structured handoff ensures continuity, reduces cognitive load, and empowers the incoming engineer to respond effectively from minute one.

---

## Handoff Timing and Scheduling

### Establish Consistent Handoff Windows

Choose handoff times that work for your team and stick to them. Common patterns include:

| Pattern | Handoff Time | Best For |
|---------|--------------|----------|
| Daily shifts (8-12h) | Start/end of business hours | Teams in single timezone |
| Weekly rotation | Monday morning | Distributed teams |
| Follow-the-sun | Regional business hours | Global 24/7 coverage |

### Buffer Time Recommendations

- **Minimum overlap:** 30 minutes for routine handoffs
- **Extended overlap:** 1 hour during active incidents
- **Shadow period:** Full shift overlap for new on-call engineers

```yaml
# Example: Handoff schedule configuration
# This configuration defines when handoffs occur and how much overlap is required

handoff_schedule:
  # Primary handoff window - when the formal handoff meeting occurs
  primary_window: "09:00-09:30"

  # Timezone for all times in this configuration
  timezone: "America/New_York"

  # Minimum overlap required between outgoing and incoming engineer
  minimum_overlap_minutes: 30

  # Extended overlap during active incidents
  incident_overlap_minutes: 60

  # Days when handoffs occur (for weekly rotations)
  handoff_days:
    - "Monday"
```

---

## Shift Reports

A shift report captures everything that happened during your on-call period. Create one at the end of every shift, even if nothing occurred.

### Essential Shift Report Components

1. **Incident summary:** List all incidents with severity, duration, and resolution status
2. **Alert statistics:** Total alerts, acknowledged, resolved, false positives
3. **System health overview:** Current status of critical services
4. **Actions taken:** Any changes made to production systems
5. **Follow-up items:** Tasks that need attention in the next shift

### Shift Report Template

```markdown
# On-Call Shift Report

## Shift Details
<!-- Basic information about who was on-call and when -->

- **Engineer:** [Your Name]
- **Shift Start:** [Date/Time with timezone]
- **Shift End:** [Date/Time with timezone]
- **Rotation:** [Primary/Secondary]

---

## Incident Summary
<!-- List all incidents that occurred during this shift -->
<!-- Include severity level, brief description, and current status -->

| Time | Severity | Description | Status | Incident ID |
|------|----------|-------------|--------|-------------|
| 14:32 UTC | SEV-2 | Database connection pool exhaustion | Resolved | INC-2024-0127 |
| 18:45 UTC | SEV-3 | Elevated error rates in payment service | Monitoring | INC-2024-0128 |

---

## Alert Statistics
<!-- Summary of all alerts received during the shift -->

- **Total Alerts:** 23
- **Acknowledged:** 23
- **Auto-Resolved:** 15
- **Manually Resolved:** 6
- **False Positives:** 2
- **Escalated:** 0

---

## System Health
<!-- Current state of critical systems at handoff time -->

| Service | Status | Notes |
|---------|--------|-------|
| API Gateway | Healthy | - |
| Database Cluster | Healthy | Replica lag < 100ms |
| Payment Service | Degraded | Monitoring elevated latency |
| CDN | Healthy | - |

---

## Actions Taken
<!-- Any changes made to production during this shift -->

1. Increased database connection pool from 100 to 150 (14:45 UTC)
2. Restarted payment-service-worker-3 pod (18:52 UTC)
3. Updated alert threshold for memory usage (20:00 UTC)

---

## Handoff Notes
<!-- Important context for the incoming engineer -->

- Payment service latency is still elevated; root cause investigation ongoing
- Database team deploying connection pooler upgrade at 10:00 UTC tomorrow
- Customer X reported intermittent timeouts; monitoring their traffic patterns

---

## Follow-up Items
<!-- Tasks that need attention in upcoming shifts -->

- [ ] Review payment service logs after traffic patterns normalize
- [ ] Verify database connection pool settings after upgrade
- [ ] Close INC-2024-0128 if latency returns to normal
```

---

## Handling Ongoing Incidents

Active incidents require special attention during handoffs. Never hand off an incident without a thorough briefing.

### Incident Handoff Checklist

```markdown
# Incident Handoff Checklist

## Before the Handoff
<!-- Ensure these items are complete before transferring ownership -->

- [ ] Document current incident status in the incident channel
- [ ] Update the incident timeline with recent actions
- [ ] Prepare a verbal summary of the investigation so far
- [ ] Identify any pending actions or decisions

## During the Handoff
<!-- Cover these topics in the handoff conversation -->

- [ ] Walk through the incident timeline chronologically
- [ ] Explain the current hypothesis and evidence
- [ ] Review what has been tried and ruled out
- [ ] Discuss next steps and recommended actions
- [ ] Transfer any open communication threads

## After the Handoff
<!-- Confirm successful transfer of responsibility -->

- [ ] Incoming engineer acknowledges in incident channel
- [ ] Update incident record with new owner
- [ ] Outgoing engineer remains available for questions (30 min)
- [ ] Verify incoming engineer has all necessary access
```

### Incident Context Template

```markdown
# Active Incident Handoff: [Incident Title]

## Current Status
<!-- One-line summary of where things stand right now -->

**Status:** Investigating | Identified | Mitigating | Monitoring | Resolved
**Severity:** SEV-1 | SEV-2 | SEV-3 | SEV-4
**Duration:** X hours Y minutes
**Customer Impact:** [Brief description of user-facing impact]

---

## Timeline Summary
<!-- Key events in chronological order -->

| Time (UTC) | Event |
|------------|-------|
| 14:00 | First alert triggered - API latency > 500ms |
| 14:05 | On-call engineer acknowledged |
| 14:15 | Identified database as bottleneck |
| 14:30 | Attempted connection pool increase - no improvement |
| 14:45 | Escalated to database team |

---

## Current Hypothesis
<!-- What we believe is causing the issue -->

Primary theory: Connection leak in the new authentication middleware
deployed yesterday. Evidence: connection count growing linearly since
deployment, no corresponding increase in traffic.

---

## What We Have Tried
<!-- Actions taken and their results -->

1. **Increased connection pool (14:30)** - No improvement, connections
   still growing
2. **Restarted affected pods (14:40)** - Temporary improvement, issue
   returned after 10 minutes
3. **Enabled debug logging (15:00)** - Collecting data for analysis

---

## Next Steps
<!-- Recommended actions for the incoming engineer -->

1. Review debug logs for connection lifecycle patterns
2. Compare authentication middleware behavior with previous version
3. Consider rollback if no root cause identified within 1 hour
4. Database team standing by for emergency intervention if needed

---

## Key Contacts
<!-- People involved in this incident -->

- Database Team: @db-oncall (Sarah - already briefed)
- Platform Team: @platform-oncall (Available for middleware questions)
- Customer Success: @cs-team (Managing customer communications)

---

## Relevant Links
<!-- Quick access to investigation resources -->

- Incident Channel: #inc-2024-0127
- Dashboard: [Link to relevant dashboard]
- Runbook: [Link to applicable runbook]
- Recent Deploy: [Link to deployment PR]
```

---

## Documenting Known Issues

Maintain a living document of known issues that on-call engineers should be aware of. This prevents repeated investigations of the same problems.

### Known Issues Register

```markdown
# Known Issues Register

## Active Known Issues
<!-- Issues that are currently affecting systems -->
<!-- Include workarounds so on-call engineers know how to respond -->

### KI-001: Intermittent Redis Connection Timeouts
<!-- First known issue entry -->

- **Status:** Active
- **Severity:** Low
- **First Observed:** 2024-01-15
- **Affected Systems:** User session service
- **Symptoms:** Sporadic 500 errors on login, resolves within seconds
- **Root Cause:** Network congestion during peak hours
- **Workaround:** No action required; automatic retry handles it
- **Permanent Fix:** Network team upgrading links (ETA: Feb 2024)
- **Alert Behavior:** May trigger session-service-error-rate alert; safe to acknowledge if error rate < 1%

---

### KI-002: Memory Growth in Log Aggregator
<!-- Second known issue entry -->

- **Status:** Active
- **Severity:** Medium
- **First Observed:** 2024-01-20
- **Affected Systems:** log-aggregator pods
- **Symptoms:** Memory usage grows 5%/day, OOMKilled after ~2 weeks
- **Root Cause:** Memory leak in log parsing library
- **Workaround:** Restart log-aggregator pods weekly
- **Permanent Fix:** Awaiting upstream library patch
- **Alert Behavior:** Will trigger memory-high alert around day 10; follow restart runbook

---

## Recently Resolved
<!-- Issues fixed in the last 30 days - kept for reference -->

### KI-003: Slow Dashboard Loading (RESOLVED)
<!-- Resolved issue for historical reference -->

- **Status:** Resolved (2024-01-25)
- **Resolution:** Upgraded database indexes
- **Verification:** Dashboard load time < 2s for 7 days

---

## Scheduled Maintenance Affecting On-Call
<!-- Planned work that may generate alerts or require attention -->

| Date | Time (UTC) | System | Impact | Contact |
|------|------------|--------|--------|---------|
| 2024-01-28 | 02:00-04:00 | Database | Failover, expect brief connectivity issues | @dba-team |
| 2024-01-30 | 10:00-10:30 | CDN | Cache purge, temporary origin load increase | @infra-team |
```

---

## Tracking Recent Changes

Recent deployments and infrastructure changes are often the cause of new incidents. Keep a change log accessible during handoffs.

### Change Log Template

```markdown
# Recent Changes Log

## Last 24 Hours
<!-- Changes deployed in the last 24 hours -->
<!-- These are the most likely culprits for new issues -->

### Deploy: authentication-service v2.3.1
<!-- Individual change entry with full context -->

- **Time:** 2024-01-26 14:00 UTC
- **Author:** @engineer-name
- **PR:** #1234
- **Changes:** Updated OAuth token validation logic
- **Rollback:** `kubectl rollout undo deployment/auth-service`
- **Monitoring:** Check auth-error-rate and login-latency dashboards
- **Known Risks:** May affect cached tokens; users might need to re-login

---

### Config Change: Increased API rate limits
<!-- Configuration change entry -->

- **Time:** 2024-01-26 16:30 UTC
- **Author:** @engineer-name
- **Ticket:** OPS-567
- **Changes:** Rate limit increased from 100/min to 200/min for partner tier
- **Rollback:** Update ConfigMap api-config, key: partner_rate_limit
- **Monitoring:** Check rate-limiter-rejections metric
- **Known Risks:** Higher load on downstream services during traffic spikes

---

## Last 7 Days
<!-- Summary of changes from the past week -->
<!-- Less detail but still useful for pattern recognition -->

| Date | System | Change | Risk Level |
|------|--------|--------|------------|
| 01-25 | payment-service | v3.1.0 - New payment provider integration | Medium |
| 01-24 | database | Connection pool configuration update | Low |
| 01-23 | cdn | SSL certificate renewal | Low |
| 01-22 | api-gateway | Added new rate limiting rules | Medium |
| 01-21 | monitoring | Updated alert thresholds | Low |

---

## Deployment Calendar
<!-- Upcoming planned deployments -->

| Date | Time (UTC) | System | Change | Owner |
|------|------------|--------|--------|-------|
| 01-28 | 10:00 | user-service | v4.0.0 - Major refactor | @team-user |
| 01-29 | 14:00 | database | Index optimization | @dba-team |
```

---

## Escalation Contacts

Maintain an up-to-date list of escalation contacts for different types of issues.

### Escalation Matrix

```markdown
# Escalation Contact Matrix

## Tier 1: On-Call Engineers
<!-- First responders for all alerts -->

| Role | Primary | Secondary | Contact Method |
|------|---------|-----------|----------------|
| Platform On-Call | Current schedule | Current schedule | PagerDuty |
| Database On-Call | Current schedule | Current schedule | PagerDuty |

---

## Tier 2: Team Leads and Specialists
<!-- Escalate here when Tier 1 needs additional expertise -->

| Domain | Contact | Availability | Contact Method |
|--------|---------|--------------|----------------|
| API/Backend | Sarah Chen | Business hours + weekends | Slack @sarah, Phone: +1-555-0101 |
| Database | Marcus Johnson | 24/7 for SEV-1 | PagerDuty @marcus |
| Infrastructure | Alex Rivera | Business hours | Slack @alex |
| Security | Security Team | 24/7 | security@company.com, PagerDuty |

---

## Tier 3: Management Escalation
<!-- For SEV-1 incidents or decisions requiring management approval -->

| Role | Contact | When to Engage |
|------|---------|----------------|
| Engineering Manager | Jordan Smith | SEV-1 > 30 min, resource decisions |
| Director of Engineering | Pat Williams | SEV-1 > 1 hour, customer escalations |
| VP of Engineering | Chris Taylor | SEV-1 > 2 hours, exec communication needed |

---

## External Contacts
<!-- Vendor and partner contacts for external dependencies -->

| Vendor | Support Type | Contact | SLA |
|--------|--------------|---------|-----|
| AWS | Premium Support | AWS Console Case | 15 min response |
| CloudFlare | Enterprise | support@cloudflare.com | 1 hour response |
| Database Vendor | 24/7 Critical | +1-800-XXX-XXXX | 30 min response |
| Payment Provider | Technical | api-support@provider.com | 4 hour response |

---

## Escalation Guidelines
<!-- When and how to escalate -->

### SEV-1 (Critical)
- Escalate to Tier 2 immediately
- Page management after 15 minutes if no progress
- Notify customer success for proactive communication

### SEV-2 (High)
- Attempt resolution for 30 minutes before escalating
- Escalate to Tier 2 if blocked or root cause unclear
- Management notification at 1 hour

### SEV-3 (Medium)
- Follow runbook procedures
- Escalate to Tier 2 during business hours if unresolved after 2 hours
- Can defer to next business day if stable workaround exists
```

---

## Documentation Templates

Standardize your handoff documentation to ensure consistency across shifts and engineers.

### Quick Handoff Notes Template

```markdown
# Quick Handoff Notes
<!-- Use this template for routine handoffs with no active incidents -->

**Date:** [Date]
**Outgoing:** [Name]
**Incoming:** [Name]

## Shift Summary
<!-- One paragraph overview of the shift -->

Quiet shift overall. Handled 12 alerts, all routine. No incidents opened.
Database maintenance completed successfully at 02:00 UTC.

## Attention Items
<!-- Things the incoming engineer should watch -->

1. Payment service showing slightly elevated latency (within SLO)
2. Scheduled CDN maintenance at 10:00 UTC - expect brief alert noise

## Recent Changes
<!-- Deployments in the last 24 hours -->

- auth-service v2.3.1 deployed at 14:00 UTC (stable)

## Handoff Complete
<!-- Confirmation signatures -->

- [x] Outgoing confirmed handoff
- [x] Incoming acknowledged
```

### Comprehensive Handoff Document

```markdown
# Comprehensive On-Call Handoff

## Metadata
<!-- Basic handoff information -->

| Field | Value |
|-------|-------|
| Handoff Date | [Date] |
| Handoff Time | [Time with timezone] |
| Outgoing Engineer | [Name] |
| Incoming Engineer | [Name] |
| Rotation Week | [Week number] |

---

## Executive Summary
<!-- 3-5 bullet points covering the most important information -->

- No active incidents at time of handoff
- One SEV-3 incident resolved during shift (INC-2024-0127)
- Database upgrade scheduled for tomorrow - review runbook
- New deployment (payment-service v3.1.0) being monitored
- Alert noise from log-aggregator expected until weekly restart

---

## Active Incidents
<!-- Full details on any ongoing incidents -->

None at time of handoff.

---

## Resolved Incidents This Shift
<!-- Summary of incidents that were resolved -->

### INC-2024-0127: API Timeout Errors
- **Severity:** SEV-3
- **Duration:** 45 minutes
- **Root Cause:** Expired SSL certificate on internal service
- **Resolution:** Certificate renewed manually
- **Follow-up:** Automated certificate rotation task created

---

## System Status
<!-- Current health of all critical systems -->

All systems operational. See dashboard: [Link]

---

## Known Issues to Watch
<!-- Active known issues that may require attention -->

- KI-002: Log aggregator memory growth (restart scheduled for day 10)
- Redis connection intermittent timeouts during peak (no action needed)

---

## Upcoming Events
<!-- Scheduled maintenance, deployments, or other events -->

| Time (UTC) | Event | Impact |
|------------|-------|--------|
| Tomorrow 02:00 | Database upgrade | 5 min downtime expected |
| Tomorrow 10:00 | payment-service v3.2.0 deploy | Monitor closely |

---

## Runbooks Referenced This Shift
<!-- Links to runbooks that were used -->

- [SSL Certificate Renewal](link)
- [API Gateway Restart](link)

---

## Notes for Incoming Engineer
<!-- Free-form notes and advice -->

Pretty quiet week overall. The database team has been very responsive
if you need anything. Keep an eye on payment-service after tomorrow's
deploy - the new provider integration has some edge cases we are still
validating.

---

## Handoff Verification
<!-- Both engineers confirm the handoff -->

- [x] Outgoing engineer completed shift report
- [x] Incoming engineer reviewed documentation
- [x] Verbal handoff completed at [time]
- [x] Incoming engineer has access to all systems
- [x] Pager ownership transferred
```

---

## Best Practices Summary

### Before Your Shift

1. **Review the previous shift report** at least 15 minutes before your shift starts
2. **Check the known issues register** for any active problems
3. **Review recent deployments** from the change log
4. **Verify your access** to all necessary systems and communication channels
5. **Test your pager** to ensure you receive alerts

### During Your Shift

1. **Document as you go** - do not wait until the end of your shift
2. **Update incident timelines in real-time** during active incidents
3. **Note any changes you make** to production systems immediately
4. **Flag new known issues** as you discover them
5. **Keep the known issues register current** by resolving fixed items

### During Handoff

1. **Start on time** - respect your colleague's schedule
2. **Use the checklist** - do not rely on memory
3. **Prioritize active incidents** - cover these first and in detail
4. **Walk through dashboards together** - share visual context
5. **Confirm understanding** - have the incoming engineer summarize back

### After Handoff

1. **Remain available** for 30 minutes after handoff for questions
2. **Complete your shift report** before fully disconnecting
3. **Update any documentation** that was unclear or missing
4. **Provide feedback** on the handoff process during retrospectives

---

## Automating Handoffs with OneUptime

OneUptime provides built-in tools to streamline your on-call handoff procedures:

- **Automated shift reports:** Generate incident summaries automatically
- **On-call schedule management:** Visualize rotations and handoff times
- **Incident timeline tracking:** Capture every action during incident response
- **Runbook integration:** Link runbooks directly to alerts
- **Escalation policy management:** Define and maintain escalation matrices

By combining structured handoff procedures with OneUptime's on-call management features, your team can achieve seamless transitions that keep your services reliable around the clock.

---

Learn more about building effective on-call workflows at [OneUptime](https://oneuptime.com).
