# How to Build a Compliance Evidence Package from OpenTelemetry Data for Auditors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Compliance, Audit Evidence, SOC2

Description: Learn how to assemble audit-ready compliance evidence packages from your OpenTelemetry telemetry data for SOC 2 and similar audits.

When audit season arrives, engineering teams typically spend weeks pulling together evidence. Screenshots of dashboards, exports from various tools, manual attestations - it is a painful process. If your observability stack runs on OpenTelemetry, you already have most of the evidence sitting in your telemetry backends. The trick is knowing how to extract and package it in a format auditors can actually use.

## What Auditors Want to See

Compliance frameworks like SOC 2, ISO 27001, and PCI DSS have overlapping evidence requirements around operational monitoring. Auditors typically ask for proof of:

- Active monitoring and alerting for production systems
- Incident detection and response timelines
- Change management tracking
- Data retention policy enforcement
- Access control on sensitive systems

OpenTelemetry data can provide evidence for all of these if you know where to look.

## Structuring the Evidence Package

Create a systematic directory structure that maps to audit control points. This makes it easy for auditors to find what they need.

```bash
#!/bin/bash
# create_evidence_structure.sh
# Creates the directory structure for audit evidence collection

AUDIT_DIR="audit-evidence-$(date +%Y-Q$(( ($(date +%-m)-1)/3+1 )))"

mkdir -p "$AUDIT_DIR"/{monitoring,incident-response,change-management,retention,access-control}

echo "Evidence package directory created: $AUDIT_DIR"
echo ""
echo "Structure:"
echo "  monitoring/        - Active alerting and dashboard evidence"
echo "  incident-response/ - Detection and response timeline evidence"
echo "  change-management/ - Pipeline config change history"
echo "  retention/         - Data lifecycle policy enforcement"
echo "  access-control/    - RBAC and access audit evidence"
```

## Extracting Monitoring Evidence

Auditors want proof that your monitoring is active and comprehensive. Pull alert rule definitions and recent alert firing history from Prometheus.

```python
# extract_monitoring_evidence.py
# Pulls alert rules and firing history from Prometheus for audit evidence
import requests
import json
from datetime import datetime, timedelta

PROMETHEUS_URL = "http://prometheus.monitoring.svc:9090"
EVIDENCE_DIR = "audit-evidence-2026-Q1/monitoring"

def export_alert_rules():
    """Export all configured alert rules as evidence of active monitoring."""
    resp = requests.get(f"{PROMETHEUS_URL}/api/v1/rules")
    rules = resp.json()

    with open(f"{EVIDENCE_DIR}/alert-rules.json", "w") as f:
        json.dump(rules, f, indent=2)

    # Create a human-readable summary
    summary_lines = ["# Active Alert Rules Summary", ""]
    for group in rules["data"]["groups"]:
        summary_lines.append(f"## Group: {group['name']}")
        for rule in group["rules"]:
            if rule["type"] == "alerting":
                summary_lines.append(
                    f"- **{rule['name']}**: `{rule['query']}`"
                    f" (severity: {rule['labels'].get('severity', 'unset')})"
                )
        summary_lines.append("")

    with open(f"{EVIDENCE_DIR}/alert-rules-summary.md", "w") as f:
        f.write("\n".join(summary_lines))

    print(f"Exported {sum(len(g['rules']) for g in rules['data']['groups'])} rules")

def export_alert_history(days=90):
    """Export recent alert firings as evidence of active detection."""
    end = datetime.utcnow()
    start = end - timedelta(days=days)

    # Query ALERTS_FOR_STATE metric to get alert firing history
    resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query_range", params={
        "query": 'ALERTS{alertstate="firing"}',
        "start": start.isoformat() + "Z",
        "end": end.isoformat() + "Z",
        "step": "1h",
    })

    with open(f"{EVIDENCE_DIR}/alert-history-{days}d.json", "w") as f:
        json.dump(resp.json(), f, indent=2)

    print(f"Exported {days}-day alert history")

export_alert_rules()
export_alert_history()
```

## Extracting Incident Response Evidence

Traces from OpenTelemetry can demonstrate incident detection timelines. This script queries Tempo for traces during known incident windows and exports them.

```python
# extract_incident_traces.py
# Exports trace data from Tempo for documented incidents
import requests
import json

TEMPO_URL = "http://tempo.monitoring.svc:3200"
EVIDENCE_DIR = "audit-evidence-2026-Q1/incident-response"

# Define known incidents with their time windows
INCIDENTS = [
    {
        "id": "INC-2026-042",
        "description": "Payment service latency spike",
        "start": "2026-01-15T14:30:00Z",
        "end": "2026-01-15T15:45:00Z",
        "service": "payment-service",
    },
    {
        "id": "INC-2026-051",
        "description": "Database connection pool exhaustion",
        "start": "2026-01-22T09:10:00Z",
        "end": "2026-01-22T09:55:00Z",
        "service": "order-service",
    },
]

for incident in INCIDENTS:
    # Search for traces matching the incident window and service
    resp = requests.get(f"{TEMPO_URL}/api/search", params={
        "tags": f'service.name="{incident["service"]}"',
        "start": incident["start"],
        "end": incident["end"],
        "limit": 100,
    })

    traces = resp.json()

    evidence = {
        "incident_id": incident["id"],
        "description": incident["description"],
        "time_window": {"start": incident["start"], "end": incident["end"]},
        "traces_found": len(traces.get("traces", [])),
        "trace_data": traces,
    }

    filename = f"{EVIDENCE_DIR}/{incident['id']}-traces.json"
    with open(filename, "w") as f:
        json.dump(evidence, f, indent=2)

    print(f"Exported {evidence['traces_found']} traces for {incident['id']}")
```

## Change Management Evidence

Track every change to your OTel Collector configurations using Git history. This script extracts the change log for a given audit period.

```bash
#!/bin/bash
# extract_change_evidence.sh
# Exports git history for OTel pipeline config changes during audit period

EVIDENCE_DIR="audit-evidence-2026-Q1/change-management"
START_DATE="2026-01-01"
END_DATE="2026-03-31"

# Export commit log for collector config changes
git log --after="$START_DATE" --before="$END_DATE" \
  --format="Date: %ai%nAuthor: %an <%ae>%nCommit: %H%nMessage: %s%n---" \
  -- 'deploy/otel/**' 'config/otel-*' \
  > "$EVIDENCE_DIR/config-change-log.txt"

# Count changes per author for the summary
echo "=== Configuration Change Summary ===" > "$EVIDENCE_DIR/change-summary.txt"
echo "Period: $START_DATE to $END_DATE" >> "$EVIDENCE_DIR/change-summary.txt"
echo "" >> "$EVIDENCE_DIR/change-summary.txt"

git shortlog --after="$START_DATE" --before="$END_DATE" \
  -s -n -- 'deploy/otel/**' 'config/otel-*' \
  >> "$EVIDENCE_DIR/change-summary.txt"

echo ""
echo "Changes exported to $EVIDENCE_DIR/"
```

## Data Retention Evidence

Prove that your telemetry data follows retention policies by checking actual data boundaries.

```python
# verify_retention.py
# Verifies that telemetry backends enforce configured retention periods
import requests
from datetime import datetime, timedelta

EVIDENCE_DIR = "audit-evidence-2026-Q1/retention"
EXPECTED_RETENTION_DAYS = 90

def check_prometheus_retention():
    """Verify Prometheus is not retaining data beyond the policy."""
    resp = requests.get("http://prometheus.monitoring.svc:9090/api/v1/query", params={
        "query": "prometheus_tsdb_lowest_timestamp"
    })
    result = resp.json()
    oldest_ts = float(result["data"]["result"][0]["value"][1]) / 1000
    oldest_date = datetime.fromtimestamp(oldest_ts)
    retention_days = (datetime.utcnow() - oldest_date).days

    return {
        "backend": "Prometheus",
        "oldest_data": oldest_date.isoformat(),
        "actual_retention_days": retention_days,
        "policy_retention_days": EXPECTED_RETENTION_DAYS,
        "compliant": retention_days <= EXPECTED_RETENTION_DAYS + 1,
    }

evidence = check_prometheus_retention()
print(f"Prometheus retention: {evidence['actual_retention_days']} days "
      f"(policy: {evidence['policy_retention_days']} days) "
      f"- {'COMPLIANT' if evidence['compliant'] else 'NON-COMPLIANT'}")
```

## Packaging and Delivery

Bundle everything into a signed archive that auditors can verify.

```bash
#!/bin/bash
# package_evidence.sh
# Creates a signed, timestamped archive of all audit evidence

AUDIT_DIR="audit-evidence-2026-Q1"

# Generate a manifest with SHA-256 checksums for every file
find "$AUDIT_DIR" -type f -not -name "MANIFEST.txt" \
  -exec shasum -a 256 {} \; > "$AUDIT_DIR/MANIFEST.txt"

# Create the archive
tar czf "${AUDIT_DIR}.tar.gz" "$AUDIT_DIR"

# Sign the archive with GPG
gpg --armor --detach-sign "${AUDIT_DIR}.tar.gz"

echo "Evidence package created:"
echo "  Archive:   ${AUDIT_DIR}.tar.gz"
echo "  Signature: ${AUDIT_DIR}.tar.gz.asc"
echo "  Manifest:  ${AUDIT_DIR}/MANIFEST.txt"
```

## Summary

Building a compliance evidence package from OpenTelemetry data turns audit preparation from a manual scramble into a repeatable, scriptable process. By extracting alert rules, incident traces, configuration change history, retention verification, and access control evidence directly from your telemetry infrastructure, you create a comprehensive package that auditors can review with confidence. Automate this collection quarterly, and audit season becomes just another CI job.
