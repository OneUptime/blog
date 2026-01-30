# How to Create Game Day Exercises

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: SRE, Chaos Engineering, Testing, Reliability

Description: Plan and execute game day exercises to test incident response, validate runbooks, and improve system resilience through controlled failure injection.

---

## What is a Game Day?

A game day is a planned event where engineering teams intentionally inject failures into their systems to test incident response capabilities, validate runbooks, and identify weaknesses before real incidents occur. Think of it as a fire drill for your infrastructure.

Unlike chaos engineering experiments that run continuously in production, game days are scheduled events with defined participants, clear objectives, and structured observation periods.

**Why run game days?**

- Validate that runbooks actually work
- Train engineers on incident response procedures
- Discover gaps in monitoring and alerting
- Build muscle memory for high-pressure situations
- Test communication channels and escalation paths

---

## Game Day Planning

Effective game days require careful planning. Rushing into failure injection without preparation leads to confusion and potentially real outages.

### Planning Timeline

| Phase | Timeframe | Activities |
|-------|-----------|------------|
| Initial Planning | 4-6 weeks before | Define objectives, select scenarios, identify participants |
| Detailed Design | 2-3 weeks before | Write scenario scripts, prepare injection tools, notify stakeholders |
| Dry Run | 1 week before | Test injection mechanisms, verify rollback procedures |
| Final Prep | 2-3 days before | Send reminders, confirm availability, freeze non-essential changes |
| Game Day | Day of | Execute scenarios, observe, document |
| Debrief | Within 48 hours | Review findings, assign action items |

### Setting Clear Objectives

Every game day needs specific, measurable objectives. Vague goals like "test our resilience" lead to unfocused exercises.

This YAML configuration shows how to structure clear, measurable objectives for a game day:

```yaml
# game-day-objectives.yaml
game_day:
  name: "Q1 Database Failover Exercise"
  date: "2026-02-15"
  duration_hours: 4

objectives:
  primary:
    - id: OBJ-001
      description: "Validate PostgreSQL replica promotion completes within 5 minutes"
      success_criteria: "Replica becomes primary in under 300 seconds"
      measurement: "Time from primary failure to successful write on new primary"

    - id: OBJ-002
      description: "Verify application reconnection without manual intervention"
      success_criteria: "All application pods reconnect within 2 minutes of failover"
      measurement: "Count of pods with healthy database connections"

    - id: OBJ-003
      description: "Confirm alerting fires within expected timeframes"
      success_criteria: "PagerDuty alert received within 60 seconds of failure"
      measurement: "Time delta between failure injection and alert timestamp"
```

---

## Scenario Selection

Choosing the right scenarios determines whether your game day provides valuable insights or wastes everyone's time.

### Scenario Categories

| Category | Examples | Risk Level | Recommended For |
|----------|----------|------------|-----------------|
| Infrastructure | Node failure, disk full, network partition | Medium-High | Mature teams with good rollback |
| Application | Memory leak, CPU spike, deadlock | Medium | Teams with solid monitoring |
| Dependency | Database unavailable, cache miss storm | Medium | Testing graceful degradation |
| Process | Alert fatigue simulation, communication breakdown | Low | New teams, onboarding |

### Building a Scenario Library

Document scenarios in a structured format so they can be reused and refined over time.

This template defines a reusable scenario with all the information needed for safe execution:

```yaml
# scenarios/database-failover.yaml
scenario:
  id: SCN-DB-001
  name: "Primary Database Failover"
  category: "Infrastructure"
  last_executed: "2025-11-20"

description: |
  Simulate primary PostgreSQL database failure to test automatic failover
  to replica and application recovery.

prerequisites:
  - PostgreSQL cluster with at least one replica
  - Connection pooler configured for automatic failover
  - Runbook RB-DB-003 reviewed and updated

injection_method:
  type: "process_kill"
  target: "postgresql primary"
  command: "sudo systemctl stop postgresql"

expected_behavior:
  - Replica detects primary failure within 30 seconds
  - Replica promotes itself to primary
  - Applications reconnect automatically
  - Alerts fire for database failover event

rollback_procedure:
  steps:
    - "Start original primary as replica"
    - "Verify replication is functioning"
  estimated_time: "15 minutes"

success_metrics:
  - name: "Failover Time"
    target: "< 5 minutes"
  - name: "Data Loss"
    target: "0 transactions"
```

---

## Scope and Blast Radius

Controlling the blast radius is critical. A game day should test your systems, not take down production for real customers.

### Defining Boundaries

Create explicit boundaries for what can and cannot be affected.

```yaml
# blast-radius-definition.yaml
blast_radius:
  game_day_id: "GD-2026-02-15"

  in_scope:
    environments:
      - "production-us-west-2"
    services:
      - "user-service"
      - "order-service"
    traffic_percentage: 10  # Only affect 10% of traffic

  out_of_scope:
    environments:
      - "production-us-east-1"
    services:
      - "billing-service"  # End of month processing

  hard_stops:
    - condition: "Error rate exceeds 5% globally"
      action: "Immediate rollback"
    - condition: "Customer complaints received"
      action: "Evaluate scope, consider abort"
```

### Rollback Procedures

Document rollback procedures before starting. Every participant should know how to abort.

This script provides emergency rollback capabilities for common game day scenarios:

```bash
#!/bin/bash
# rollback.sh - Emergency rollback script for game day scenarios

set -euo pipefail

GAME_DAY_ID="${1:-GD-2026-02-15}"
SCENARIO="${2:-all}"

log() {
    echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] $1"
}

rollback_database_failover() {
    log "Rolling back database failover scenario..."
    kubectl exec -n database postgresql-0 -- pg_ctl start
    log "Waiting for replication sync..."
    sleep 30
    kubectl exec -n database postgresql-0 -- pg_isready
    log "Database rollback complete"
}

rollback_all() {
    log "Executing full rollback for game day $GAME_DAY_ID"
    rollback_database_failover

    # Disable game day feature flags
    curl -X POST "https://feature-flags.internal/api/flags/game_day_enabled" \
        -H "Content-Type: application/json" \
        -d '{"enabled": false}'

    log "Full rollback complete"
}

case "$SCENARIO" in
    database) rollback_database_failover ;;
    all) rollback_all ;;
    *) echo "Unknown scenario: $SCENARIO"; exit 1 ;;
esac
```

---

## Participant Roles

Clear role assignment prevents confusion during the exercise. Everyone should know their responsibilities before the game day starts.

### Core Roles

| Role | Responsibilities | Skills Required |
|------|-----------------|-----------------|
| Game Day Lead | Overall coordination, go/no-go decisions | Leadership, system knowledge |
| Scenario Executor | Inject failures, monitor injection tools | Technical, scripting |
| Incident Commander | Lead incident response (as if real) | Incident management experience |
| Observer | Document timeline, note behaviors | Attention to detail |
| Communications Lead | Update status page, notify stakeholders | Clear communication |
| Rollback Authority | Single person who can call abort | Senior engineer |

### Role Assignment

```yaml
# roles-assignment.yaml
game_day_id: "GD-2026-02-15"

roles:
  game_day_lead:
    primary: "Alice Chen"
    backup: "Bob Martinez"
    responsibilities:
      - "Final go/no-go decision"
      - "Scenario timing and pacing"
      - "Declare game day complete"

  incident_commander:
    primary: "Eve Johnson"
    note: "IC should not know scenario details beforehand for realistic response"

  observer:
    members:
      - name: "Grace Lee"
        focus: "Technical response quality"
      - name: "Henry Brown"
        focus: "Communication flow"

  rollback_authority:
    primary: "Liam Anderson"
    responsibilities:
      - "Single authority to call abort"
      - "Execute rollback procedures"
      - "Override any decision if safety risk"
```

---

## Observation and Metrics

Collecting data during the game day is as important as running the scenarios. Without good observations, you cannot measure improvement.

### Metrics to Capture

```yaml
# metrics-collection.yaml
metrics:
  timing:
    - name: "time_to_detect"
      description: "Time from failure injection to first alert"
      target: "< 60 seconds"

    - name: "time_to_acknowledge"
      description: "Time from alert to human acknowledgment"
      target: "< 5 minutes"

    - name: "time_to_mitigate"
      description: "Time from detection to service restoration"
      target: "< 30 minutes"

  quality:
    - name: "runbook_accuracy"
      description: "Did the runbook match actual steps taken?"
      measurement: "Observer comparison, scale 1-5"

  impact:
    - name: "error_rate_peak"
      target: "< 1%"
    - name: "affected_requests"
      description: "Number of requests that failed"
```

### Observation Template

Observers should use a structured template to capture events.

```markdown
# Game Day Observation Log

**Game Day ID:** GD-2026-02-15
**Observer:** Grace Lee
**Focus Area:** Technical Response Quality

## Timeline

| Timestamp (UTC) | Event | Actor | Notes |
|-----------------|-------|-------|-------|
| 10:00:00 | Game day started | Lead | All participants ready |
| 10:02:15 | Scenario 1 injection | Executor | Database primary killed |
| 10:02:45 | First alert fired | System | "PostgreSQL primary unreachable" |
| 10:03:12 | Alert acknowledged | IC | Response time: 27 seconds |

## Observations

### What Went Well
- Alert fired within 30 seconds
- IC took command quickly

### Issues Identified
- Application reconnection took longer than expected
- Status page not updated until 10 minutes after detection
```

---

## Debrief Process

The debrief is where game days deliver their value. Without a structured debrief, insights get lost.

### Debrief Meeting Structure

Hold the debrief within 48 hours while memories are fresh. Allocate 60-90 minutes.

**Agenda:**

1. **Timeline review** (15 min) - Walk through each scenario chronologically
2. **What went well** (15 min) - Celebrate successes, identify practices to continue
3. **What needs improvement** (20 min) - Focus on systems, not individuals
4. **Action items** (20 min) - Create specific, assignable tasks with deadlines
5. **Process feedback** (10 min) - How to improve the next game day

### Debrief Document Template

```markdown
# Game Day Debrief Report

## Summary
**Game Day ID:** GD-2026-02-15
**Date:** 2026-02-15
**Participants:** 12

### Scenarios Executed
| Scenario | Target | Result |
|----------|--------|--------|
| Database Failover | 5 min recovery | 13 min |
| Cache Node Failure | 30 sec failover | 22 sec |

---

## Detailed Findings

### Finding 1: Application Connection Pool Exhaustion
**Severity:** High

**Description:**
When the database primary failed, application pods did not release stale
connections quickly enough. The connection pool filled with dead connections.

**Root Cause:**
Connection pool idle_timeout set to 30 minutes. Dead connection detection
relies on TCP keepalive with a 2-minute default.

**Recommendation:**
- Reduce idle_timeout to 5 minutes
- Enable connection validation on borrow

**Action Items:**
- [ ] Update connection pool config (Owner: Charlie, Due: 2026-02-22)
- [ ] Test fix in staging (Owner: Diana, Due: 2026-02-25)

---

## Runbook Updates Required
| Runbook | Update Needed | Owner |
|---------|---------------|-------|
| RB-DB-003 | Update namespace reference | Charlie |
| RB-DB-003 | Add app health verification | Diana |
```

---

## Documenting Learnings

Game day learnings should persist beyond the debrief document. Integrate findings into your ongoing reliability practice.

### Knowledge Management

```yaml
# learning-integration.yaml
learning_destinations:
  runbooks:
    description: "Update runbooks with corrections"
    timeline: "Within 1 week of debrief"

  monitoring:
    description: "Add or modify alerts based on findings"
    timeline: "Within 2 weeks of debrief"

  architecture_decisions:
    description: "Document architectural improvements needed"
    timeline: "Within 1 month of debrief"

  scenario_library:
    description: "Improve scenario documentation for future use"
    timeline: "Within 1 week of debrief"
```

### Tracking Improvement Over Time

Track metrics across game days to measure improvement.

| Metric | Q1 Game Day | Q2 Game Day | Improvement |
|--------|-------------|-------------|-------------|
| Time to detect | 45s | 30s | 33% faster |
| Time to mitigate | 18 min | 13 min | 28% faster |
| Runbook accuracy | 3/5 | 4/5 | Improved |
| Objectives met | 2/3 | 3/3 | Full success |

---

## Common Pitfalls

| Pitfall | Prevention |
|---------|------------|
| Scope creep | Strict time boxing, prioritize scenarios |
| Unrealistic scenarios | Keep scenarios secret from responders |
| No follow-through | Track action items in ticketing system |
| Over-engineering | Start simple, iterate |
| Blame culture | Focus on systems, not individuals |
| No baseline | Capture baseline metrics before first scenario |

---

## Building a Game Day Program

For organizations wanting to run game days regularly, establish a quarterly cadence.

```yaml
# game-day-program.yaml
quarterly_schedule:
  Q1:
    date: "2026-02-15"
    theme: "Database and Storage"
  Q2:
    date: "2026-05-15"
    theme: "Network and Dependencies"
  Q3:
    date: "2026-08-15"
    theme: "Compute and Scaling"
  Q4:
    date: "2026-11-15"
    theme: "Full Stack"

success_metrics:
  - "4 game days completed per year"
  - "80% of action items closed within 30 days"
  - "Time to mitigate improves 10% year over year"
```

---

## Conclusion

Game days are investments in reliability. The time spent planning and executing exercises pays dividends when real incidents occur. Teams that practice failure response regularly recover faster and communicate better.

Key takeaways:

1. **Plan thoroughly** - Good game days require weeks of preparation
2. **Control blast radius** - Protect production from unintended impact
3. **Assign clear roles** - Everyone should know their responsibilities
4. **Observe and measure** - Data drives improvement
5. **Debrief promptly** - Extract learnings while fresh
6. **Follow through** - Action items must be completed

Your systems will fail. The question is whether your team is prepared when they do. Game days help you answer that question before it matters.

---

**Related Reading:**

- [The Ultimate SRE Reliability Checklist](https://oneuptime.com/blog/post/2025-09-10-sre-checklist/view)
- [The Five Stages of SRE Maturity](https://oneuptime.com/blog/post/2025-09-01-the-five-stages-of-sre-maturity/view)
- [What is Toil and How to Eliminate It](https://oneuptime.com/blog/post/2025-10-01-what-is-toil-and-how-to-eliminate-it/view)
