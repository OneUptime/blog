# How to Configure Terraform Enterprise Audit Logging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, Audit Logging, Compliance, Security, Governance

Description: Learn how to configure and use Terraform Enterprise audit logging for compliance, security monitoring, and operational visibility into who changed what and when.

---

When your infrastructure is managed through Terraform Enterprise, every security-relevant action matters - who logged in, who failed authentication, who accessed the admin console, and which system API endpoints were called. Audit logging captures these events and gives your security and compliance teams the visibility they need. Whether you are meeting SOC 2 requirements, investigating an incident, or just want to understand who did what, TFE audit logs are an important source of operational evidence.

This guide covers enabling log forwarding, understanding the log format, forwarding logs to external systems, and building useful queries.

## What TFE Audit Logs Capture

Terraform Enterprise tracks several audit event types:

- **Authentication success events**: Successful logins and logouts through the admin console
- **Authentication failure events**: Failed login attempts, invalid tokens, and expired sessions
- **CSRF violation events**: Cross-site request forgery attempts detected by Terraform Enterprise
- **Admin console access**: Requests to admin console endpoints
- **System API access**: Requests to system API endpoints

Audit logs include fields such as `timestamp`, `level`, `component`, `event_type`, `method`, `resource`, `source_ip`, `user_agent`, `status_code`, `request_id`, and `actor_id`.

## Accessing Audit Logs from Service Logs

Terraform Enterprise writes service logs to standard output and standard error. It also stores individual service logs inside the Terraform Enterprise container under `/var/log/terraform-enterprise`.

### List Audit Log Events

```bash
# Get the most recent audit log events from the Terraform Enterprise container logs
docker logs terraform-enterprise 2>&1 | \
  grep 'terraform-enterprise.audit: audit event:' | \
  tail -20
```

### Filter by Event Type

```bash
# Get failed admin login requests by looking for non-2xx login responses
docker logs terraform-enterprise 2>&1 | \
  grep 'terraform-enterprise.audit: audit event:' | \
  grep 'resource=/api/v1/admin/login' | \
  grep -Ev 'status_code=2[0-9][0-9]'

# Get admin console requests
docker logs terraform-enterprise 2>&1 | \
  grep 'terraform-enterprise.audit: audit event:' | \
  grep 'resource=/api/v1/admin/'
```

### Filter by Date Range

```bash
# Get events from a specific time period
# Useful for incident investigation
docker logs terraform-enterprise 2>&1 | \
  grep 'terraform-enterprise.audit: audit event:' | \
  awk '$1 >= "2026-02-20T00:00:00.000Z" && $1 <= "2026-02-23T23:59:59.999Z"'
```

## Configuring Log Forwarding

Terraform Enterprise can forward logs using native platform tooling, such as Docker logging drivers or Kubernetes logging architectures. Docker-deployed Terraform Enterprise installations can also use Terraform Enterprise's built-in Fluent Bit integration by mounting a Fluent Bit `[OUTPUT]` configuration file into the container and setting `TFE_LOG_FORWARDING_CONFIG_PATH` to that file path.

### Stream to Splunk

```conf
# fluent-bit.conf
# Forward TFE logs to Splunk via HEC (HTTP Event Collector)

[OUTPUT]
    Name          splunk
    Match         *
    Host          splunk.example.com
    Port          8088
    Splunk_Token  your-hec-token
```

After forwarding, filter audit events in Splunk by the `terraform-enterprise.audit` component or the `audit event` message.

### Stream to CloudWatch Logs

```conf
# fluent-bit.conf
# Forward TFE logs to AWS CloudWatch Logs

[OUTPUT]
    Name               cloudwatch_logs
    Match              *
    region             us-east-1
    log_group_name     /tfe/audit-logs
    log_stream_name    tfe
    auto_create_group  On
```

Sending to CloudWatch Logs through the built-in Fluent Bit integration is supported when Terraform Enterprise is located within AWS, because Fluent Bit reads AWS credentials from the Terraform Enterprise environment.

### Stream to Elasticsearch

```conf
# fluent-bit.conf
# Forward TFE logs to a downstream Fluent Bit or Fluentd collector
# that can route audit events to Elasticsearch

[OUTPUT]
    Name   forward
    Match  *
    Host   fluent.example.com
    Port   24224
```

Terraform Enterprise's documented native destinations do not include a direct Elasticsearch output. If you need Elasticsearch, forward logs to a supported downstream Fluent Bit or Fluentd collector and route the filtered audit events from there.

## Automated Audit Log Analysis

### Detect Suspicious Activity

```bash
#!/bin/bash
# detect-suspicious-activity.sh
# Check audit logs for suspicious patterns

LOG_FILE="${1:-/var/log/tfe/audit.log}"

echo "=== TFE Security Audit Report ==="
echo "Date: $(date)"
echo ""

# 1. Failed admin login attempts in the collected logs
FAILED_LOGINS=$(grep 'resource=/api/v1/admin/login' "${LOG_FILE}" | grep -Evc 'status_code=2[0-9][0-9]' || true)
echo "Failed login attempts: ${FAILED_LOGINS}"

# 2. Invalid or expired token activity
TOKEN_FAILURES=$(grep -Ec 'invalid token|expired session' "${LOG_FILE}" || true)
echo "Invalid or expired token events: ${TOKEN_FAILURES}"

# 3. Admin console access
ADMIN_REQUESTS=$(grep -c 'resource=/api/v1/admin/' "${LOG_FILE}" || true)
echo "Admin console requests: ${ADMIN_REQUESTS}"

# 4. CSRF violations
CSRF_VIOLATIONS=$(grep -ic 'csrf' "${LOG_FILE}" || true)
echo "CSRF violations: ${CSRF_VIOLATIONS}"

# Alert if thresholds are exceeded
if [ "${FAILED_LOGINS}" -gt 10 ]; then
  echo "ALERT: High number of failed login attempts!"
fi

if [ "${CSRF_VIOLATIONS}" -gt 0 ]; then
  echo "ALERT: CSRF violations detected!"
fi
```

### Compliance Reporting

```bash
#!/bin/bash
# compliance-report.sh
# Generate a compliance report from TFE audit logs

LOG_FILE="${1:-/var/log/tfe/audit.log}"
REPORT_FILE="/tmp/tfe-compliance-report-$(date +%Y%m%d).json"

# Collect all events for the reporting period
SINCE="2026-02-01T00:00:00.000Z"
BEFORE="2026-02-28T23:59:59.999Z"

awk -v since="${SINCE}" -v before="${BEFORE}" '
  /terraform-enterprise.audit: audit event:/ && $1 >= since && $1 <= before
' "${LOG_FILE}" | jq -R -s --arg since "${SINCE}" --arg before "${BEFORE}" '
  split("\n") | map(select(length > 0)) as $events |
  {
    report_period: {since: $since, before: $before},
    total_events: ($events | length),
    failed_admin_logins: ($events | map(select(contains("resource=/api/v1/admin/login") and (contains("status_code=2") | not))) | length),
    successful_logins: ($events | map(select(contains("event_type=auth.login.success"))) | length),
    csrf_violations: ($events | map(select(test("csrf"; "i"))) | length),
    admin_requests: ($events | map(select(contains("resource=/api/v1/admin/"))) | length)
  }
' > "${REPORT_FILE}"

echo "Compliance report saved to ${REPORT_FILE}"
```

## Retention and Storage

Terraform Enterprise automatically rotates log files, and HashiCorp does not guarantee a specific retention period for audit logs stored locally. For long-term retention, forward logs to an external system (Splunk, CloudWatch Logs, Elasticsearch through a downstream collector, or another supported destination) where you control the retention policy independently.

For Docker-deployed Terraform Enterprise installations that use the built-in Fluent Bit integration, provide the Fluent Bit `[OUTPUT]` configuration in a file mounted into the Terraform Enterprise container and set `TFE_LOG_FORWARDING_CONFIG_PATH` to the path of that file. For Kubernetes deployments, use your cluster's standard log forwarding architecture instead of the built-in Fluent Bit integration.

## Summary

Audit logging in Terraform Enterprise gives you a detailed record of security-relevant activity. For compliance, forward these logs to your SIEM and set up automated reporting. For security, build alerts around suspicious patterns like failed logins, invalid tokens, CSRF violations, and admin console access. For operations, use audit logs to understand when sensitive endpoints were accessed. Terraform Enterprise does not expose the HCP Terraform Audit Trails API; use service logs and log forwarding for Terraform Enterprise audit data.

Use [OneUptime](https://oneuptime.com) alongside your audit logging to correlate infrastructure changes tracked in TFE with application performance and uptime metrics.
