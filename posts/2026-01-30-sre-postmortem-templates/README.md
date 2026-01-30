# How to Build Postmortem Templates

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: SRE, Incident Management, Postmortem, Reliability

Description: Create effective postmortem templates that capture incident details, root causes, and actionable improvements for organizational learning.

---

Incidents happen. Systems fail, dependencies break, and unexpected load spikes bring services to their knees. What separates mature engineering organizations from the rest is not the absence of incidents, but how they learn from them.

A well-crafted postmortem template is the backbone of this learning process. It provides structure when chaos subsides, ensures nothing important gets forgotten, and creates a shared language for discussing failures.

---

## Why Templates Matter

Without a template, postmortems tend to drift. Some become blame sessions. Others skip the root cause and jump straight to quick fixes. Many never happen at all because nobody knows where to start.

| Benefit | Description |
|---------|-------------|
| Consistency | Every incident gets the same level of analysis regardless of who writes it |
| Completeness | Critical sections cannot be skipped or forgotten |
| Speed | Writers spend time on content, not structure |
| Searchability | Standardized sections make historical postmortems easier to search and compare |
| Accountability | Clear ownership of action items with deadlines |

---

## The Foundation: Blameless Culture

Before writing a single template field, establish this principle: postmortems are blameless.

Blameless does not mean no accountability. It means we focus on systems and processes, not individuals. When someone makes a mistake, we ask: "What about our system allowed this mistake to happen?" not "Who messed up?"

Include this notice at the top of every postmortem template.

```markdown
## Blameless Postmortem Notice

This document follows blameless postmortem principles. We focus on:
- What happened (not who caused it)
- Why our systems allowed this to happen
- How we can prevent similar incidents

Names appear only to establish timeline context, not to assign blame.
```

### Signs of Blame Creeping In

| Blaming Language | Blameless Alternative |
|-----------------|----------------------|
| "John should have tested this" | "Our testing process did not catch this edge case" |
| "The deploy was rushed" | "Our release process allowed insufficient validation time" |
| "They ignored the alerts" | "Alert fatigue led to this signal being missed" |
| "It was human error" | "Our system did not have guardrails to prevent this action" |

---

## Core Template Structure

Every postmortem needs these sections. We will build each one with examples.

### Section 1: Incident Metadata

Start with the basics. This section enables filtering and searching across historical incidents.

```yaml
# Incident Metadata
incident_id: INC-2026-0130
title: "Payment API timeout causing checkout failures"
severity: SEV-2
status: Resolved

# Timing
detected_at: 2026-01-30T14:23:00Z
resolved_at: 2026-01-30T15:47:00Z
duration_minutes: 84

# Impact
users_affected: ~12,000
revenue_impact: $47,000 estimated
services_affected:
  - payment-api
  - checkout-service
  - order-processor

# Ownership
incident_commander: Alice Chen
postmortem_author: Bob Martinez
review_date: 2026-02-01
```

### Section 2: Executive Summary

Write this for someone who has 30 seconds to understand what happened. Three to four sentences maximum.

```markdown
## Executive Summary

On January 30, 2026, the payment API experienced elevated latency
and timeouts for 84 minutes, causing checkout failures for
approximately 12,000 users. The root cause was a database
connection pool exhaustion triggered by a spike in retry traffic
from a downstream service. Estimated revenue impact was $47,000.
```

### Section 3: Timeline

The timeline is the backbone of any postmortem. It establishes facts before interpretations.

```markdown
## Timeline (All times UTC)

| Time | Event |
|------|-------|
| 14:15 | Deploy of checkout-service v2.3.1 completes |
| 14:18 | Order-processor begins experiencing intermittent 503s from payment-api |
| 14:20 | Order-processor retry logic triggers, increasing request volume 3x |
| 14:23 | Monitoring alert fires: payment-api p99 latency > 5s |
| 14:25 | On-call engineer Alice Chen acknowledges alert |
| 14:28 | Alice identifies connection pool saturation in payment-api metrics |
| 14:32 | Incident declared SEV-2, war room opened |
| 14:52 | Root cause identified: max_connections=50 per instance, 6 instances = 300 total |
| 15:18 | Hotfix rolled out to production |
| 15:35 | p99 latency returns to normal |
| 15:47 | All error rates back to baseline, incident resolved |
```

### Timeline Construction Tips

Building accurate timelines requires multiple data sources. This script pulls relevant events.

```bash
#!/bin/bash
# timeline-builder.sh
# Gather incident timeline data from multiple sources

INCIDENT_START="2026-01-30T14:00:00Z"
INCIDENT_END="2026-01-30T16:00:00Z"

echo "=== Deployment Events ==="
kubectl get events --field-selector reason=Pulled \
  --sort-by='.lastTimestamp' \
  -o jsonpath='{range .items[*]}{.lastTimestamp} {.message}{"\n"}{end}'

echo "=== Alert History ==="
curl -s "https://api.oneuptime.com/alerts?start=${INCIDENT_START}&end=${INCIDENT_END}" \
  | jq -r '.alerts[] | "\(.triggered_at) \(.name)"'

echo "=== Git Commits ==="
git log --since="${INCIDENT_START}" --until="${INCIDENT_END}" \
  --format="%ai %s" --all
```

---

## Section 4: Root Cause Analysis

This section separates good postmortems from great ones. Use structured techniques to go beyond surface-level explanations.

### The 5 Whys Technique

Start with the observable problem and ask "why" repeatedly until you reach a systemic cause.

```markdown
## Root Cause Analysis: 5 Whys

**Problem:** Checkout failures for 12,000 users

1. **Why did checkouts fail?**
   Payment API returned 503 errors

2. **Why did payment API return 503s?**
   Database connection pool was exhausted

3. **Why was the connection pool exhausted?**
   Request volume exceeded the pool capacity of 300 connections

4. **Why did request volume spike?**
   Downstream order-processor service entered a retry storm

5. **Why did the retry storm happen?**
   Order-processor had aggressive retry settings (5 retries, no backoff)
   and no circuit breaker to stop retrying when payment-api was degraded

**Root Cause:** Missing circuit breaker and aggressive retry configuration
allowed transient failures to cascade into sustained connection pool exhaustion.
```

### Contributing Factors Analysis

Complex incidents often have multiple contributing factors.

```markdown
## Contributing Factors

| Factor | Category | Severity |
|--------|----------|----------|
| Aggressive retry settings (5x, no backoff) | Configuration | High |
| Small connection pool size (50 per instance) | Capacity | Medium |
| No alerting on connection pool utilization | Observability | Medium |
| No load testing with failure scenarios | Testing | Medium |
```

### Cause Categories Reference

Use consistent categories to enable analysis across many postmortems.

| Category | Examples |
|----------|----------|
| Configuration | Wrong settings, missing config, stale values |
| Capacity | Insufficient resources, pool exhaustion, disk full |
| Code | Bug, race condition, memory leak |
| Dependency | Third-party failure, network partition |
| Process | Inadequate review, skipped testing, unclear runbook |
| Observability | Missing alerts, wrong thresholds, alert fatigue |

---

## Section 5: Impact Assessment

Quantify the impact to prioritize future prevention efforts.

```markdown
## Impact Assessment

### User Impact
- **Affected users:** ~12,000 unique users attempted checkout during incident
- **Failed transactions:** 3,247 checkout attempts resulted in errors
- **Retry behavior:** 67% of affected users successfully completed checkout after resolution

### Business Impact
- **Direct revenue loss:** $47,000 (3,247 failed transactions x $14.47 avg order)
- **Support tickets:** 127 tickets opened during incident window
- **SLA impact:** Monthly uptime SLO of 99.9% consumed 0.12% of error budget
```

---

## Section 6: What Went Well

Celebrating successes in incident response reinforces good behaviors.

```markdown
## What Went Well

1. **Fast detection:** Monitoring alert fired within 5 minutes of impact start
2. **Quick response:** On-call acknowledged within 2 minutes
3. **Effective escalation:** Backup engineer pulled in at appropriate time
4. **Clear communication:** Status page updated every 15 minutes
5. **Safe rollout:** Hotfix tested in staging before production
```

---

## Section 7: What Could Be Improved

Capture learnings without blame. Focus on systemic improvements.

```markdown
## What Could Be Improved

1. **Slower root cause identification:** Took 27 minutes to identify connection
   pool as the bottleneck. Better dashboards would help.

2. **No circuit breaker:** We knew order-processor lacked circuit breakers but
   had not prioritized adding them.

3. **Retry configuration:** Default retry settings were too aggressive.
   No team-wide standard for retry behavior.

4. **Missing runbook step:** Runbook did not cover connection pool exhaustion.
```

---

## Section 8: Action Items

This is where postmortems create value. Without concrete action items, learning does not translate into improvement.

```markdown
## Action Items

### High Priority (Complete within 1 week)

| ID | Action | Owner | Due Date | Status |
|----|--------|-------|----------|--------|
| A1 | Add circuit breaker to order-processor | @alice | 2026-02-06 | In Progress |
| A2 | Implement exponential backoff in retry logic | @alice | 2026-02-06 | Not Started |
| A3 | Add connection pool utilization alert (>80%) | @bob | 2026-02-03 | Complete |

### Medium Priority (Complete within 1 month)

| ID | Action | Owner | Due Date | Status |
|----|--------|-------|----------|--------|
| A4 | Load test payment-api with failure injection | @carol | 2026-02-20 | Not Started |
| A5 | Create runbook section for connection pool issues | @alice | 2026-02-10 | Not Started |

### Low Priority (Complete within quarter)

| ID | Action | Owner | Due Date | Status |
|----|--------|-------|----------|--------|
| A6 | Establish team-wide retry configuration standard | @dave | 2026-03-30 | Not Started |
```

### Writing Good Action Items

| Weak Action Item | Strong Action Item |
|-----------------|-------------------|
| "Improve monitoring" | "Add dashboard panel showing connection pool utilization percentage" |
| "Fix retry logic" | "Implement exponential backoff with jitter, max 3 retries, 30s timeout" |
| "Better testing" | "Add chaos engineering test that kills 50% of payment-api pods during load test" |
| "Update docs" | "Add 'Connection Pool Exhaustion' section to payment-api runbook" |

---

## Section 9: Follow-Up Tracking

Postmortems lose value if action items are never completed.

```markdown
## Follow-Up Schedule

### Review Meetings
- **1-week review:** 2026-02-06, check high-priority items
- **1-month review:** 2026-03-02, verify all items complete

### Tracking Integration
- JIRA Epic: [PLAT-4521](https://jira.example.com/PLAT-4521)
- All action items linked as sub-tasks

### Completion Criteria
This postmortem is considered complete when:
- [ ] All high-priority action items are deployed to production
- [ ] Medium-priority items are scheduled in sprint planning
- [ ] Runbook updates are merged and reviewed
```

---

## Sharing Learnings

A postmortem read by only the incident responders misses most of its value.

```markdown
## Distribution

### Immediate (within 24 hours)
- Payment team Slack channel
- Platform team Slack channel
- Engineering leadership

### Weekly (engineering newsletter)
- 3-sentence summary + link to full postmortem

### Monthly (all-hands)
- Include in reliability metrics presentation
```

### Postmortem Review Meeting Agenda

```markdown
## Postmortem Review Meeting Agenda

**Duration:** 30 minutes

1. **Context setting (3 min)** - Read blameless notice aloud
2. **Timeline walkthrough (7 min)** - Author presents key events
3. **Root cause discussion (10 min)** - Review 5 Whys analysis
4. **Action item review (7 min)** - Verify owners and due dates
5. **Closing (3 min)** - Confirm tracking, schedule follow-up
```

---

## Severity Classification Matrix

Standardize how you classify incident severity so postmortem priority is consistent.

| Severity | User Impact | Revenue Impact | Postmortem Required |
|----------|-------------|----------------|---------------------|
| SEV-1 | Total outage | >$100k/hour | Yes, within 48 hours |
| SEV-2 | Major feature down | $10k-100k/hour | Yes, within 1 week |
| SEV-3 | Degraded experience | $1k-10k/hour | Yes, lightweight |
| SEV-4 | Minor impact | <$1k/hour | Optional |

---

## Postmortem Quality Checklist

Use this checklist to review postmortems before publishing.

```markdown
## Quality Checklist

### Completeness
- [ ] All metadata fields populated
- [ ] Timeline has timestamps for key events
- [ ] Root cause goes beyond surface explanation
- [ ] Impact is quantified where possible

### Blamelessness
- [ ] No individual blame language
- [ ] Focus on systems and processes

### Actionability
- [ ] Every action item has an owner
- [ ] Every action item has a due date
- [ ] Actions are specific and measurable

### Distribution
- [ ] Shared with relevant teams
- [ ] Added to postmortem index
- [ ] Action items tracked in project management tool
```

---

## Template Storage and Discovery

Store postmortems where teams can find and learn from them.

```
postmortems/
├── 2026/
│   ├── 01/
│   │   ├── INC-2026-0115-database-failover.md
│   │   └── INC-2026-0130-payment-api-timeout.md
│   └── 02/
├── templates/
│   ├── standard-postmortem.md
│   └── security-incident.md
└── index.md
```

### Searchable Index

```markdown
| ID | Date | Title | Severity | Services | Cause Category |
|----|------|-------|----------|----------|----------------|
| INC-2026-0130 | 2026-01-30 | Payment API timeout | SEV-2 | payment-api | Configuration |
| INC-2026-0115 | 2026-01-15 | Database failover delay | SEV-1 | postgres | Dependency |
```

---

## Automation: Timeline Collection

Set up your monitoring system to export incident timelines automatically.

```python
# postmortem_timeline.py
# Generate timeline from monitoring data

from datetime import datetime
import requests

def generate_timeline(incident_id: str, start_time: datetime, end_time: datetime):
    """
    Pulls events from multiple sources and merges into unified timeline.
    """
    timeline = []

    # Pull from alert system
    alerts = fetch_alerts(start_time, end_time)
    for alert in alerts:
        timeline.append({
            'time': alert['triggered_at'],
            'event': f"Alert fired: {alert['name']}",
            'source': 'monitoring'
        })

    # Pull from deployment system
    deploys = fetch_deploys(start_time, end_time)
    for deploy in deploys:
        timeline.append({
            'time': deploy['completed_at'],
            'event': f"Deploy: {deploy['service']} {deploy['version']}",
            'source': 'deployments'
        })

    # Sort by time and return
    timeline.sort(key=lambda x: x['time'])
    return timeline


def fetch_alerts(start: datetime, end: datetime) -> list:
    """Fetch alerts from OneUptime or your monitoring system."""
    response = requests.get(
        'https://api.oneuptime.com/alerts',
        params={'start': start.isoformat(), 'end': end.isoformat()},
        headers={'Authorization': f'Bearer {API_KEY}'}
    )
    return response.json()['alerts']
```

---

## Common Mistakes to Avoid

| Mistake | Why It Hurts | How to Fix |
|---------|--------------|------------|
| Writing postmortems weeks later | Details fade, timeline is inaccurate | Set 48-hour deadline for draft |
| Stopping at 2 Whys | Surface causes get fixed, root causes do not | Require minimum 5 Whys |
| Vague action items | Nothing gets done | Require specific, measurable actions |
| No follow-up tracking | Action items rot | Integrate with project management |
| Postmortems are siloed | Org does not learn | Distribute widely, include in newsletters |
| Blame creeps in | People hide information | Review for blame language before publishing |

---

## Measuring Postmortem Effectiveness

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Postmortem completion rate | >95% of qualifying incidents | Count postmortems / qualifying incidents |
| Time to postmortem | <72 hours for draft | Track creation timestamps |
| Action item completion rate | >90% within deadline | Track in project management system |
| Repeat incident rate | <10% within 90 days | Compare root causes across postmortems |

---

## Closing Thoughts

Postmortem templates are living documents. Start with the basics, and refine based on what works for your team. The goal is not bureaucratic compliance, but genuine learning that prevents future incidents.

1. **Start simple.** A basic template used consistently beats a complex template used rarely.
2. **Review and iterate.** Every quarter, ask: what sections do we always skip? What do we wish we captured?
3. **Celebrate learning.** Share postmortems that led to significant improvements.
4. **Automate the boring parts.** Timeline collection and template generation should not be manual.

The best postmortem template is one your team actually uses. Build it together, refine it often, and watch your incident response mature over time.

---

**Related Reading:**

- [Effective Incident Postmortem Templates](https://oneuptime.com/blog/post/2025-09-09-effective-incident-postmortem-templates-ready-to-use-examples/view)
- [The Five Stages of SRE Maturity](https://oneuptime.com/blog/post/2025-09-01-the-five-stages-of-sre-maturity/view)
- [Designing an SRE On-Call Rotation](https://oneuptime.com/blog/post/2025-11-28-sre-on-call-rotation-design/view)
- [SRE Metrics to Track](https://oneuptime.com/blog/post/2025-11-28-sre-metrics-to-track/view)
