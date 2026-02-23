# How to Configure Terraform Enterprise Audit Logging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, Audit Logging, Compliance, Security, Governance

Description: Learn how to configure and use Terraform Enterprise audit logging for compliance, security monitoring, and operational visibility into who changed what and when.

---

When your infrastructure is managed through Terraform Enterprise, every action matters - who created a workspace, who triggered a run, who approved an apply, who changed variables. Audit logging captures all of these events and gives your security and compliance teams the visibility they need. Whether you are meeting SOC 2 requirements, investigating an incident, or just want to understand who did what, TFE audit logs are the source of truth.

This guide covers enabling audit logging, understanding the log format, forwarding logs to external systems, and building useful queries.

## What TFE Audit Logs Capture

Terraform Enterprise tracks events across several categories:

- **Authentication events**: Logins, logouts, failed authentication attempts
- **Organization events**: Creating or deleting organizations, changing settings
- **Workspace events**: Creating, updating, deleting workspaces, changing settings
- **Run events**: Triggering plans, approving applies, canceling runs
- **Variable events**: Creating, updating, deleting variables (values are not logged for sensitive variables)
- **Team and user events**: Adding or removing team members, changing permissions
- **Policy events**: Creating or updating Sentinel policies, policy check results
- **VCS events**: Connecting or disconnecting VCS providers, webhook events
- **API token events**: Creating or revoking tokens

## Accessing Audit Logs via the API

### List Audit Log Events

```bash
# Get the most recent audit log events
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  "${TFE_URL}/api/v2/organization/audit-trail?page[size]=20" | \
  jq '.data[] | {
    timestamp: .attributes.timestamp,
    type: .attributes.type,
    action: .attributes.action,
    actor: .attributes.actor.email,
    resource: .attributes.resource
  }'
```

### Filter by Event Type

```bash
# Get only authentication events
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  "${TFE_URL}/api/v2/organization/audit-trail?filter[type]=authentication&page[size]=50" | \
  jq '.data[] | {
    timestamp: .attributes.timestamp,
    action: .attributes.action,
    actor: .attributes.actor,
    ip_address: .attributes["actor-ip"]
  }'

# Get workspace modification events
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  "${TFE_URL}/api/v2/organization/audit-trail?filter[type]=workspace&page[size]=50" | \
  jq '.data[] | {
    timestamp: .attributes.timestamp,
    action: .attributes.action,
    workspace: .attributes.resource.name,
    actor: .attributes.actor.email
  }'
```

### Filter by Date Range

```bash
# Get events from a specific time period
# Useful for incident investigation
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  "${TFE_URL}/api/v2/organization/audit-trail?filter[since]=2026-02-20T00:00:00Z&filter[before]=2026-02-23T23:59:59Z&page[size]=100" | \
  jq '.data | length'
```

## Configuring Log Forwarding

### Stream to Splunk

```bash
#!/bin/bash
# forward-audit-logs-splunk.sh
# Forward TFE audit logs to Splunk via HEC (HTTP Event Collector)

SPLUNK_HEC_URL="https://splunk.example.com:8088/services/collector/event"
SPLUNK_TOKEN="your-hec-token"
LAST_TIMESTAMP_FILE="/var/lib/tfe-audit/last-timestamp"

# Read the last processed timestamp
if [ -f "${LAST_TIMESTAMP_FILE}" ]; then
  SINCE=$(cat "${LAST_TIMESTAMP_FILE}")
else
  SINCE=$(date -u -d '1 hour ago' '+%Y-%m-%dT%H:%M:%SZ')
fi

# Fetch new audit events
EVENTS=$(curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  "${TFE_URL}/api/v2/organization/audit-trail?filter[since]=${SINCE}&page[size]=100")

# Forward each event to Splunk
echo "${EVENTS}" | jq -c '.data[]' | while read -r EVENT; do
  TIMESTAMP=$(echo "${EVENT}" | jq -r '.attributes.timestamp')

  # Format for Splunk HEC
  SPLUNK_EVENT=$(jq -n \
    --arg time "${TIMESTAMP}" \
    --argjson event "${EVENT}" \
    '{
      time: $time,
      sourcetype: "terraform:enterprise:audit",
      source: "tfe-api",
      event: $event
    }')

  # Send to Splunk
  curl -s -k \
    -H "Authorization: Splunk ${SPLUNK_TOKEN}" \
    -d "${SPLUNK_EVENT}" \
    "${SPLUNK_HEC_URL}"

  # Update last timestamp
  echo "${TIMESTAMP}" > "${LAST_TIMESTAMP_FILE}"
done
```

### Stream to CloudWatch Logs

```bash
#!/bin/bash
# forward-audit-logs-cloudwatch.sh
# Forward TFE audit logs to AWS CloudWatch

LOG_GROUP="/tfe/audit-logs"
LOG_STREAM="tfe-$(hostname)"

# Create log group if it does not exist
aws logs create-log-group --log-group-name "${LOG_GROUP}" 2>/dev/null

# Create log stream
aws logs create-log-stream \
  --log-group-name "${LOG_GROUP}" \
  --log-stream-name "${LOG_STREAM}" 2>/dev/null

# Fetch audit events
EVENTS=$(curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  "${TFE_URL}/api/v2/organization/audit-trail?page[size]=100")

# Build CloudWatch log events
CW_EVENTS=$(echo "${EVENTS}" | jq '[.data[] | {
  timestamp: (.attributes.timestamp | fromdateiso8601 * 1000),
  message: (. | tostring)
}]')

# Put events into CloudWatch
aws logs put-log-events \
  --log-group-name "${LOG_GROUP}" \
  --log-stream-name "${LOG_STREAM}" \
  --log-events "${CW_EVENTS}"
```

### Stream to Elasticsearch

```bash
#!/bin/bash
# forward-audit-logs-elastic.sh
# Forward TFE audit logs to Elasticsearch

ES_URL="https://elasticsearch.example.com:9200"
ES_INDEX="tfe-audit"

# Fetch audit events
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  "${TFE_URL}/api/v2/organization/audit-trail?page[size]=100" | \
  jq -c '.data[]' | while read -r EVENT; do

  # Extract the event ID for the document ID
  DOC_ID=$(echo "${EVENT}" | jq -r '.id')

  # Index the event in Elasticsearch
  curl -s -X POST \
    "${ES_URL}/${ES_INDEX}/_doc/${DOC_ID}" \
    -H "Content-Type: application/json" \
    -d "${EVENT}"
done
```

## Automated Audit Log Analysis

### Detect Suspicious Activity

```bash
#!/bin/bash
# detect-suspicious-activity.sh
# Check audit logs for suspicious patterns

echo "=== TFE Security Audit Report ==="
echo "Date: $(date)"
echo ""

# 1. Failed login attempts in the last hour
FAILED_LOGINS=$(curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  "${TFE_URL}/api/v2/organization/audit-trail?filter[type]=authentication&filter[action]=login_failed&page[size]=100" | \
  jq '.data | length')
echo "Failed login attempts (last fetch): ${FAILED_LOGINS}"

# 2. API tokens created
TOKEN_EVENTS=$(curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  "${TFE_URL}/api/v2/organization/audit-trail?filter[type]=token&page[size]=50" | \
  jq '[.data[] | select(.attributes.action == "created")] | length')
echo "API tokens created: ${TOKEN_EVENTS}"

# 3. Workspaces deleted
DELETED_WS=$(curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  "${TFE_URL}/api/v2/organization/audit-trail?filter[type]=workspace&filter[action]=deleted&page[size]=50" | \
  jq '.data | length')
echo "Workspaces deleted: ${DELETED_WS}"

# 4. Admin setting changes
ADMIN_CHANGES=$(curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  "${TFE_URL}/api/v2/organization/audit-trail?filter[type]=admin&page[size]=50" | \
  jq '.data | length')
echo "Admin setting changes: ${ADMIN_CHANGES}"

# Alert if thresholds are exceeded
if [ "${FAILED_LOGINS}" -gt 10 ]; then
  echo "ALERT: High number of failed login attempts!"
fi

if [ "${DELETED_WS}" -gt 5 ]; then
  echo "ALERT: Multiple workspace deletions detected!"
fi
```

### Compliance Reporting

```bash
#!/bin/bash
# compliance-report.sh
# Generate a compliance report from TFE audit logs

REPORT_FILE="/tmp/tfe-compliance-report-$(date +%Y%m%d).json"

# Collect all events for the reporting period
SINCE="2026-02-01T00:00:00Z"
BEFORE="2026-02-28T23:59:59Z"

ALL_EVENTS="[]"
PAGE=1

while true; do
  RESPONSE=$(curl -s \
    --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
    "${TFE_URL}/api/v2/organization/audit-trail?filter[since]=${SINCE}&filter[before]=${BEFORE}&page[number]=${PAGE}&page[size]=100")

  EVENTS=$(echo "${RESPONSE}" | jq '.data')
  COUNT=$(echo "${EVENTS}" | jq 'length')

  if [ "${COUNT}" -eq 0 ]; then
    break
  fi

  ALL_EVENTS=$(echo "${ALL_EVENTS}" "${EVENTS}" | jq -s 'add')
  PAGE=$((PAGE + 1))
done

# Generate summary
echo "${ALL_EVENTS}" | jq '{
  report_period: {since: "'"${SINCE}"'", before: "'"${BEFORE}"'"},
  total_events: length,
  events_by_type: (group_by(.attributes.type) | map({type: .[0].attributes.type, count: length})),
  unique_actors: ([.[].attributes.actor.email] | unique | length),
  apply_events: [.[] | select(.attributes.action == "applied")] | length,
  destroy_events: [.[] | select(.attributes["is-destroy"] == true)] | length
}' > "${REPORT_FILE}"

echo "Compliance report saved to ${REPORT_FILE}"
```

## Retention and Storage

Configure how long audit logs are retained:

```bash
# Set audit log retention via admin settings
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  "${TFE_URL}/api/v2/admin/general-settings" \
  --data '{
    "data": {
      "type": "general-settings",
      "attributes": {
        "audit-log-retention-days": 365
      }
    }
  }'
```

For long-term retention, forward logs to an external system (Splunk, CloudWatch, Elasticsearch) where you control the retention policy independently.

## Summary

Audit logging in Terraform Enterprise gives you a detailed record of every significant action. For compliance, forward these logs to your SIEM and set up automated reporting. For security, build alerts around suspicious patterns like failed logins, token creation, and workspace deletion. For operations, use audit logs to understand who changed what when something breaks. The TFE audit API makes it straightforward to extract, filter, and forward these events to whatever external systems your organization uses.

Use [OneUptime](https://oneuptime.com) alongside your audit logging to correlate infrastructure changes tracked in TFE with application performance and uptime metrics.
