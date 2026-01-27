# How to Build Incident Response Playbooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Response, SRE, Playbooks, On-Call, Reliability

Description: Learn how to create effective incident response playbooks that guide teams through outages with clear steps, roles, and communication templates.

---

> "The best time to write a playbook is before the incident. The second best time is right after."

When your production systems go down at 3 AM, you do not want your on-call engineer fumbling through documentation or trying to remember what worked last time. You need a clear, actionable playbook that guides them from detection to resolution. This post walks you through building incident response playbooks that actually work.

## Why Playbooks Matter

Incidents are stressful. Under pressure, even experienced engineers make mistakes, forget steps, or take longer than necessary to resolve issues. Playbooks solve this by providing:

- **Consistency**: Every incident gets the same structured response
- **Speed**: No time wasted figuring out what to do next
- **Knowledge Transfer**: New team members can respond effectively on day one
- **Reduced Cognitive Load**: Engineers focus on the problem, not the process
- **Audit Trail**: Clear documentation of what was done and why

Without playbooks, your incident response depends entirely on who happens to be on-call. That is a risk you cannot afford.

## Playbook Structure and Components

A well-structured playbook has these essential sections:

### 1. Metadata and Scope

```yaml
# Playbook: Database Connection Pool Exhaustion
# Version: 2.3
# Last Updated: 2026-01-15
# Owner: Platform Team
# Services Affected: API Gateway, User Service, Order Service

Trigger Conditions:
  - Alert: db_connection_pool_exhausted
  - Symptom: 500 errors with "connection timeout" in logs
  - Threshold: Connection pool utilization > 95% for 5 minutes
```

### 2. Severity Classification

Define clear severity levels so responders know how urgently to act:

```markdown
## Severity Levels

| Level | Definition | Response Time | Escalation |
|-------|-----------|---------------|------------|
| SEV1 | Complete service outage affecting all users | Immediate | Page all on-call + engineering leads |
| SEV2 | Partial outage or major feature unavailable | 15 minutes | Page primary on-call |
| SEV3 | Degraded performance, workaround available | 1 hour | Notify on-call via Slack |
| SEV4 | Minor issue, no user impact | Next business day | Create ticket |
```

### 3. Role Assignments

Every incident needs clear ownership. Define these roles:

```markdown
## Incident Roles

### Incident Commander (IC)
- Coordinates overall response
- Makes decisions on escalation and communication
- Tracks timeline and action items
- Does NOT troubleshoot directly

### Technical Lead
- Leads diagnosis and remediation efforts
- Coordinates between multiple engineers if needed
- Provides technical updates to IC

### Communications Lead
- Updates status page
- Handles customer communications
- Notifies stakeholders
- Documents timeline in incident channel

### Scribe (optional for SEV1/SEV2)
- Records all actions taken
- Tracks who did what and when
- Prepares postmortem timeline
```

## Diagnostic Steps and Runbooks

The heart of any playbook is the diagnostic section. Write it as a decision tree:

```markdown
## Diagnosis Steps

### Step 1: Verify the Alert
- Check monitoring dashboard: [Link to dashboard]
- Confirm alert is not a false positive
- If false positive, acknowledge and investigate alert threshold

### Step 2: Assess Impact
Run these commands to determine scope:

# Check error rates across services
curl -s https://monitoring.internal/api/error-rates | jq '.services[]'

# Check active user sessions
kubectl exec -it api-gateway-pod -- /app/bin/check_sessions

# Verify which regions are affected
for region in us-east us-west eu-west; do
  curl -s "https://${region}.api.example.com/health"
done

### Step 3: Identify Root Cause
Follow this decision tree:

Is the database responding?
  YES -> Check application logs for errors
  NO  -> Go to Database Recovery Playbook

Are error rates spiking on a specific endpoint?
  YES -> Check recent deployments for that service
  NO  -> Check infrastructure metrics (CPU, memory, network)

Was there a recent deployment?
  YES -> Consider rollback (see Rollback Procedure)
  NO  -> Continue to Step 4
```

## Communication Templates

Pre-written templates save precious minutes during incidents:

```markdown
## Status Page Templates

### Initial Acknowledgment (post within 5 minutes)
Title: Investigating [Service] Issues
Body: We are currently investigating reports of [brief description].
Some users may experience [specific symptoms]. Our team is actively
working on this issue. We will provide an update within 30 minutes.

### Update Template (every 30 minutes for SEV1/SEV2)
Title: [Service] Issue - Update
Body: We have identified the cause as [root cause summary].
Our team is currently [action being taken]. Estimated time to
resolution is [ETA or "unknown"]. Next update in 30 minutes.

### Resolution Template
Title: [Service] Issue - Resolved
Body: The issue affecting [service] has been resolved as of [time].
Root cause: [brief explanation]. Users should no longer experience
[symptoms]. We will publish a detailed postmortem within 48 hours.
```

### Internal Communication Templates

```markdown
## Slack Templates

### Incident Declaration
:rotating_light: INCIDENT DECLARED - SEV[X]
Service: [affected service]
Impact: [user-facing impact]
IC: @[name]
Tech Lead: @[name]
War Room: [link to video call]
Status Page: [link]

### Handoff Template
:arrows_counterclockwise: INCIDENT HANDOFF
Outgoing IC: @[name]
Incoming IC: @[name]
Current Status: [brief summary]
Active Actions: [list]
Next Steps: [list]
```

## Escalation Procedures

Define when and how to escalate:

```markdown
## Escalation Matrix

### Automatic Escalations
- No acknowledgment in 10 minutes -> Page secondary on-call
- No acknowledgment in 20 minutes -> Page engineering manager
- SEV1 not resolved in 1 hour -> Page VP of Engineering

### Manual Escalation Triggers
- Incident requires access you do not have
- Root cause involves systems outside your expertise
- Customer or legal implications identified
- Media attention or social media escalation

### How to Escalate
1. Use PagerDuty escalation button (preferred)
2. Or call directly: [escalation phone tree]
3. Document escalation in incident channel
```

## Recovery Actions

Provide specific, tested recovery procedures:

```markdown
## Recovery Procedures

### Rollback Deployment
Prerequisites: kubectl access, deployment permissions

# Check current deployment version
kubectl get deployment api-gateway -o jsonpath='{.metadata.annotations.kubernetes\.io/change-cause}'

# View rollout history
kubectl rollout history deployment/api-gateway

# Rollback to previous version
kubectl rollout undo deployment/api-gateway

# Verify rollback
kubectl rollout status deployment/api-gateway

Estimated time: 5-10 minutes
Success criteria: Error rates return to baseline within 5 minutes

### Scale Up Database Connections
Prerequisites: Database admin access

-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Increase max connections (requires restart)
ALTER SYSTEM SET max_connections = 500;

-- Or add read replica for read traffic
-- Contact DBA team: @dba-oncall

Estimated time: 15-30 minutes
Success criteria: Connection pool utilization below 70%

### Failover to Secondary Region
Prerequisites: DNS admin access, runbook training completed

1. Verify secondary region health: https://us-west.status.internal
2. Update DNS weight in Route53 (or Cloudflare)
3. Monitor traffic shift in dashboard
4. Do NOT disable primary until stable for 10 minutes

Estimated time: 5-15 minutes
Success criteria: All traffic serving from secondary region
```

## Post-Incident Tasks

The incident is not over when the service is restored:

```markdown
## Post-Incident Checklist

### Immediate (within 1 hour of resolution)
- [ ] Update status page to "Resolved"
- [ ] Notify stakeholders of resolution
- [ ] Create incident ticket with basic details
- [ ] Preserve logs and metrics (extend retention if needed)

### Within 24 hours
- [ ] Schedule postmortem meeting
- [ ] Assign postmortem owner
- [ ] Gather timeline from all participants
- [ ] Collect relevant dashboards and logs

### Within 48 hours
- [ ] Complete postmortem document
- [ ] Identify action items with owners
- [ ] Share postmortem with team
- [ ] Update this playbook if gaps were found

### Within 1 week
- [ ] Create tickets for all action items
- [ ] Prioritize action items in sprint planning
- [ ] Update monitoring and alerting based on learnings
```

## Keeping Playbooks Updated

Playbooks rot fast. Build maintenance into your process:

**Review Triggers:**
- After every incident that uses the playbook
- When services or infrastructure change
- Quarterly scheduled review
- When on-call engineers report confusion

**Ownership Model:**
- Each playbook has a designated owner
- Owner reviews monthly, even without incidents
- Changes require review from someone who has used it in an incident

**Testing:**
- Run tabletop exercises quarterly
- New on-call engineers must walk through playbooks during onboarding
- Game days should test playbook accuracy

```yaml
# Add this metadata to track freshness
Playbook Metadata:
  Last Incident Use: 2026-01-10
  Last Review: 2026-01-15
  Next Scheduled Review: 2026-04-15
  Test Results: Passed game day 2025-12-01
  Open Issues: None
```

## Best Practices Summary

1. **Write playbooks before you need them** - Create them during calm periods, not during incidents
2. **Keep them specific** - Generic playbooks do not help. Write for specific scenarios
3. **Include actual commands** - Copy-paste ready commands save time and reduce errors
4. **Define clear roles** - Everyone should know their responsibilities before the incident
5. **Test regularly** - An untested playbook is just wishful thinking
6. **Update after every use** - If something was unclear or wrong, fix it immediately
7. **Make them findable** - A great playbook is useless if no one can find it at 3 AM
8. **Start simple** - A basic playbook today beats a perfect playbook never
9. **Include escalation paths** - Know when to ask for help and how
10. **Document the "why"** - Help future readers understand the reasoning behind steps

## Getting Started

You do not need to document every possible incident on day one. Start with:

1. Your three most common incidents from the past quarter
2. Your highest-impact potential failures
3. Any incident that took longer than it should have

Build from there. Every incident without a playbook is an opportunity to create one.

---

**Ready to level up your incident response?** OneUptime provides integrated incident management, on-call scheduling, and status pages that work seamlessly with your playbooks. Track incidents, manage escalations, and communicate with stakeholders - all in one platform. Learn more at [OneUptime.com](https://oneuptime.com).

**Related Reading:**
- [Effective Incident Postmortem Templates](https://oneuptime.com/blog/post/2025-09-09-effective-incident-postmortem-templates-ready-to-use-examples/view)
- [SRE On-Call Rotation Design](https://oneuptime.com/blog/post/2025-11-28-sre-on-call-rotation-design/view)
- [The Five Stages of SRE Maturity](https://oneuptime.com/blog/post/2025-09-01-the-five-stages-of-sre-maturity/view)
