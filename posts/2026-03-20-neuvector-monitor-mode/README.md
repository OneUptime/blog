# How to Configure NeuVector Monitor Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Monitor Mode, Container Security, Policy Validation, Kubernetes

Description: Configure NeuVector's Monitor mode to detect policy violations and generate security alerts without blocking traffic, enabling policy validation before enforcement.

## Introduction

Monitor mode is NeuVector's middle tier between the permissive Discover mode and the enforcing Protect mode. In Monitor mode, NeuVector actively detects policy violations and generates security events - but does not block any traffic or processes. This makes Monitor mode ideal for validating your security policies without risking application disruption.

## What Monitor Mode Does

In Monitor mode, NeuVector:

- **Detects violations**: Identifies unauthorized processes, network connections, and file access
- **Generates security events**: Creates alerts visible in the UI and forwarded to syslog/webhooks
- **Does NOT block**: All detected violations are logged but not prevented
- **Counts violations**: Provides statistics on how often policies would trigger
- **Validates policies**: Helps identify false positives before switching to Protect mode

## Prerequisites

- NeuVector installed and running
- Workloads that have completed Discover mode
- Security policies reviewed and refined
- NeuVector Manager access

## Step 1: Transition Groups to Monitor Mode

Move services from Discover to Monitor mode. Policy mode is set on services
via `PATCH /v1/service/config` (the `RESTServiceBatchConfig` schema), not on
the group config:

```bash
# Move a specific service to Monitor mode

curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/service/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "services": ["nv.webapp.production"],
      "policy_mode": "Monitor"
    }
  }'

# Move all services in the "production" namespace to Monitor mode in one batch.
# Service groups expose a "domain" field that matches the Kubernetes namespace.
SERVICES=$(curl -sk \
  "https://neuvector-manager:8443/v1/group" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq -r '.groups[] | select(.domain == "production") | .name')

SERVICE_JSON=$(echo "${SERVICES}" | jq -R . | jq -s .)

echo "Moving services in production to Monitor..."
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/service/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d "$(jq -n --argjson services "${SERVICE_JSON}" \
    '{config: {services: $services, policy_mode: "Monitor"}}')"
```

## Step 2: Set Default Mode for New Services

Configure Monitor mode as the default for newly discovered services:

```bash
# Set new services to start in Monitor mode
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/system/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "new_service_policy_mode": "Monitor"
    }
  }'
```

## Step 3: Monitor for Security Events

With Monitor mode active, watch for generated events:

```bash
# View security events from the last hour - events are at /v1/log/event
curl -sk \
  "https://neuvector-manager:8443/v1/log/event?start=0&limit=100" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '.events[] | {
    time: .at,
    container: .workload_name,
    namespace: .namespace,
    name: .name,
    action: .action,
    level: .level
  }'
```

## Step 4: Analyze Violation Patterns

Use Monitor mode data to understand your violation patterns:

```bash
#!/bin/bash
# analyze-violations.sh
# Run after 24+ hours in Monitor mode

echo "=== Monitor Mode Violation Analysis ==="
echo ""

# Count violations by event name
echo "--- Violations by Name ---"
curl -sk \
  "https://neuvector-manager:8443/v1/log/event?start=0&limit=1000" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '[.events[] | .name] | group_by(.) | map({name: .[0], count: length}) | sort_by(.count) | reverse'

echo ""
echo "--- Top Violating Containers ---"
curl -sk \
  "https://neuvector-manager:8443/v1/log/event?start=0&limit=1000" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '[.events[] | .workload_name] | group_by(.) | map({container: .[0], violations: length}) | sort_by(.violations) | reverse | .[0:10]'

echo ""
echo "--- Process Violations ---"
curl -sk \
  "https://neuvector-manager:8443/v1/log/event?start=0&limit=1000" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '[.events[] | select(.name == "Process.Profile.Violation") | {
    container: .workload_name,
    process: .proc_name,
    path: .proc_path
  }] | unique | .[0:20]'
```

## Step 5: Handle False Positives

When Monitor mode reveals false positives, update your policies:

```bash
# If a process violation is expected, add it to the allow list
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/process_profile/nv.webapp.production" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "process_profile_config": {
      "group": "nv.webapp.production",
      "process_change_list": [
        {
          "name": "healthcheck.sh",
          "path": "/app/scripts/healthcheck.sh",
          "action": "allow"
        }
      ]
    }
  }'

# If a network connection is expected, add it to the allow rules.
# Network rules are created via PATCH on /v1/policy/rule with insert.rules.
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/policy/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "insert": {
      "rules": [
        {
          "id": 0,
          "comment": "Allow health check from monitoring",
          "from": "nv.prometheus.monitoring",
          "to": "nv.webapp.production",
          "ports": "tcp/9090",
          "applications": [],
          "action": "allow",
          "cfg_type": "user_created"
        }
      ]
    }
  }'
```

## Step 6: Configure Alerts for Monitor Mode Events

Ensure your team receives alerts during the validation period:

```bash
# Create a response rule to notify on all Monitor mode violations.
# Response rules are created via PATCH on /v1/response/rule with insert.rules.
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/response/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "insert": {
      "rules": [
        {
          "id": 0,
          "event": "security-event",
          "comment": "Notify on all policy violations during validation",
          "group": "containers",
          "conditions": [{"name": "level", "value": "warning"}],
          "actions": ["webhook"],
          "webhooks": ["slack-security-validation"],
          "disable": false,
          "cfg_type": "user_created"
        }
      ]
    }
  }'
```

## Step 7: Assess Readiness for Protect Mode

Use this checklist before transitioning to Protect mode:

```bash
#!/bin/bash
# protect-readiness-check.sh

echo "Checking Monitor mode readiness for Protect mode transition..."

# Check violation count over last 24h
VIOLATION_COUNT=$(curl -sk \
  "https://neuvector-manager:8443/v1/log/event?start=0&limit=1000" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '[.events[]] | length')

echo "Total violations in period: ${VIOLATION_COUNT}"

if [ "${VIOLATION_COUNT}" -gt "10" ]; then
  echo "WARNING: High violation count. Review before switching to Protect mode."
  echo "Action: Review and remediate false positives in policies"
else
  echo "OK: Violation count is acceptable for Protect mode transition"
fi

# Check for any critical violations
CRITICAL=$(curl -sk \
  "https://neuvector-manager:8443/v1/log/event?start=0&limit=1000" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '[.events[] | select(.level == "Critical")] | length')

echo "Critical violations: ${CRITICAL}"
if [ "${CRITICAL}" -gt "0" ]; then
  echo "REVIEW REQUIRED: Critical violations detected. Investigate before protecting."
fi
```

## Conclusion

Monitor mode is the safety net between learning and enforcement. Spending adequate time in Monitor mode - typically 1-2 weeks for production workloads - dramatically reduces the risk of false positives disrupting your applications when you switch to Protect mode. Use the violation data to progressively refine your policies until you're confident that only genuine threats will be blocked.
