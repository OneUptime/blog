# How to Set Up Regular Ceph Health Review Meetings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Operation, Monitoring, Kubernetes

Description: Learn how to structure regular Ceph health review meetings with automated pre-meeting reports, key metrics dashboards, and a consistent agenda to keep clusters healthy.

---

## Why Schedule Health Reviews

Ceph clusters can degrade gradually - OSDs may flap occasionally, PG counts can become suboptimal, or capacity can creep up toward warning thresholds. A weekly or bi-weekly health review meeting catches these issues before they become incidents.

## What to Review Each Meeting

Define a standard agenda for every health review:

1. Cluster health status (HEALTH_OK, HEALTH_WARN, HEALTH_ERR)
2. OSD status - any OSDs down or out
3. PG status - any PGs not in active+clean state
4. Capacity utilization per pool
5. Recent alerts fired in Prometheus/Alertmanager
6. Pending changes or upgrades
7. Action items from last meeting

## Generate a Pre-Meeting Health Report

Automate a health report that is sent to the team before the meeting:

```bash
#!/bin/bash
# generate-ceph-health-report.sh
NAMESPACE="rook-ceph"
REPORT_FILE="/tmp/ceph-health-report-$(date +%Y-%m-%d).txt"

kubectl -n $NAMESPACE exec deploy/rook-ceph-tools -- bash -c "
  echo '==== Ceph Health Report: $(date) ===='
  echo ''
  echo '-- Overall Health --'
  ceph health detail
  echo ''
  echo '-- OSD Status --'
  ceph osd stat
  echo ''
  echo '-- PG Status --'
  ceph pg stat
  echo ''
  echo '-- Capacity --'
  ceph df
  echo ''
  echo '-- Recent Events --'
  ceph log last 20
" > "$REPORT_FILE"

# Email or post to Slack
cat "$REPORT_FILE" | mail -s "Ceph Health Report $(date +%Y-%m-%d)" ops-team@example.com
```

Schedule this script to run the morning before your meeting:

```bash
# crontab entry - runs 8 AM Monday
0 8 * * 1 /opt/scripts/generate-ceph-health-report.sh
```

## Set Up a Grafana Dashboard for Meetings

Create a Grafana dashboard that reviewers can open during the meeting. Key panels to include:

- Ceph cluster health status (HEALTH_OK = green, WARN = yellow, ERR = red)
- OSD count up vs. total
- PG active+clean percentage
- Cluster storage used percentage
- Client IOPS and throughput (last 7 days)
- Top 5 pools by utilization

Export the dashboard to JSON and commit it to your Git repository:

```bash
curl -s http://grafana:3000/api/dashboards/uid/ceph-overview \
  -H "Authorization: Bearer $GRAFANA_API_KEY" | \
  jq '.dashboard' > ceph-overview-dashboard.json
```

## Track Action Items

Maintain an action item log in a shared document or issue tracker:

```bash
# Sample action items format
Date       | Owner        | Action                          | Status
-----------+--------------+---------------------------------+--------
2026-03-24 | nawazdhandala | Investigate OSD 3 slow reads    | Open
2026-03-31 | ops-team      | Upgrade Rook to 1.14.0          | Pending
```

Review open items at the start of each meeting and close them when resolved.

## Escalation Criteria

Define clear escalation thresholds so the meeting triggers an incident when needed:

- Cluster in HEALTH_ERR for more than 30 minutes: escalate immediately
- Capacity above 80% on any pool: open a capacity planning ticket
- More than 2 OSDs down: trigger on-call page

Document these thresholds in your runbook so all attendees know what requires immediate action vs. deferred remediation.

## Summary

Regular Ceph health review meetings are most effective when supported by automated pre-meeting reports, a standard agenda covering health, OSDs, PGs, and capacity, and a Grafana dashboard for visual review. Tracking action items and defining escalation criteria ensures findings from each meeting translate into concrete improvements.
