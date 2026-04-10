# How to Create Automated Ceph Cluster Health Reports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Monitoring, Automation, Report

Description: Automate Ceph cluster health reports using ceph health, scripts, and cron jobs to proactively detect issues before they impact production.

---

Manually checking Ceph cluster health is error-prone and time-consuming. Automating health reports ensures your team gets consistent, timely insights without relying on anyone remembering to run the checks.

## Gathering Health Data with the Ceph CLI

The starting point for any health report is `ceph health detail` and `ceph status`:

```bash
ceph health detail
ceph status
ceph osd stat
ceph mon stat
ceph df
```

Combine these into a single script:

```bash
#!/bin/bash
REPORT_FILE="/var/log/ceph/health-report-$(date +%Y%m%d-%H%M%S).txt"
echo "=== Ceph Health Report - $(date) ===" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "--- Cluster Status ---" >> "$REPORT_FILE"
ceph status >> "$REPORT_FILE" 2>&1
echo "" >> "$REPORT_FILE"
echo "--- Health Detail ---" >> "$REPORT_FILE"
ceph health detail >> "$REPORT_FILE" 2>&1
echo "" >> "$REPORT_FILE"
echo "--- OSD Stats ---" >> "$REPORT_FILE"
ceph osd stat >> "$REPORT_FILE" 2>&1
echo "" >> "$REPORT_FILE"
echo "--- Disk Usage ---" >> "$REPORT_FILE"
ceph df >> "$REPORT_FILE" 2>&1
echo "" >> "$REPORT_FILE"
echo "--- PG Summary ---" >> "$REPORT_FILE"
ceph pg stat >> "$REPORT_FILE" 2>&1
echo "Report written to $REPORT_FILE"
```

## Scheduling Reports with Cron

Schedule the script to run every hour and daily for a summary:

```bash
# Hourly health snapshot
0 * * * * /usr/local/bin/ceph-health-report.sh

# Daily summary emailed at 7 AM
0 7 * * * { ceph status; ceph health detail; ceph osd stat; ceph df; } 2>&1 | mail -s "Daily Ceph Report" ops@example.com
```

## Parsing Health Output for Alerting

Parse the `ceph health` output to trigger alerts when the cluster is not HEALTH_OK:

```bash
#!/bin/bash
STATUS=$(ceph health 2>&1)
if echo "$STATUS" | grep -q "HEALTH_ERR"; then
  echo "CRITICAL: $STATUS" | mail -s "[ALERT] Ceph HEALTH_ERR" oncall@example.com
elif echo "$STATUS" | grep -q "HEALTH_WARN"; then
  echo "WARNING: $STATUS" | mail -s "[WARN] Ceph HEALTH_WARN" ops@example.com
fi
```

## Generating JSON Reports

For integration with dashboards or ticketing systems, output JSON:

```bash
ceph status --format json-pretty > /var/log/ceph/status-$(date +%Y%m%d).json
ceph health detail --format json-pretty > /var/log/ceph/health-$(date +%Y%m%d).json
```

You can then ship these files to Elasticsearch, S3, or any log aggregation system.

## Storing and Rotating Reports

Use logrotate to keep reports manageable:

```bash
# /etc/logrotate.d/ceph-reports
/var/log/ceph/health-report-*.txt {
    daily
    rotate 30
    compress
    missingok
    notifempty
}
```

## Summary

Automated Ceph health reports are easy to set up using shell scripts and cron, giving your team regular snapshots of cluster state without manual effort. Combining output-based alerting with structured JSON output allows you to integrate health data into existing monitoring pipelines. Rotating old reports with logrotate keeps disk usage under control over time.
