# How to Set Up NeuVector Container Quarantine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Quarantine, Incident Response, Container Security, Kubernetes

Description: Configure NeuVector's container quarantine feature to automatically isolate compromised containers from network access while preserving them for forensic investigation.

## Introduction

Container quarantine is NeuVector's incident response capability that isolates a compromised container by blocking all its network traffic. Unlike deleting a container, quarantine preserves the container in place for forensic investigation while immediately stopping any lateral movement or data exfiltration. This guide explains how to configure automatic quarantine and manage quarantined containers.

## How Quarantine Works

When a container is quarantined:

1. NeuVector's enforcer blocks all inbound and outbound network traffic for the container
2. The container remains running (processes continue) but cannot communicate
3. Security events continue to be generated
4. The container stays on the node for forensic analysis
5. The isolation can be lifted manually when investigation is complete

## Prerequisites

- NeuVector with Enforcer running on all nodes
- Workloads in Monitor or Protect mode
- Response rules configured
- NeuVector Manager access

## Step 1: Configure Automatic Quarantine via Response Rules

Set up automatic quarantine for specific security events:

```bash
# Quarantine on reverse shell detection

curl -sk -X POST \
  "https://neuvector-manager:8443/v1/response/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "event": "security-event",
      "comment": "Auto-quarantine: Reverse shell detected",
      "conditions": [
        {"type": "name", "value": "reverse-shell"}
      ],
      "actions": ["quarantine", "webhook"],
      "webhooks": ["pagerduty-critical"],
      "disable": false,
      "cfg_type": "user"
    }
  }'
```

```bash
# Quarantine on privilege escalation
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/response/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "event": "security-event",
      "comment": "Auto-quarantine: Privilege escalation attempt",
      "conditions": [
        {"type": "name", "value": "privilege-escalation"}
      ],
      "actions": ["quarantine"],
      "disable": false
    }
  }'
```

## Step 2: Manually Quarantine a Container

For manual incident response:

```bash
# Get the workload ID
curl -sk \
  "https://neuvector-manager:8443/v1/workload?brief=true" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '.workloads[] | select(.display_name == "compromised-webapp") | {id: .id, name: .display_name}'

# Quarantine the container
WORKLOAD_ID="abc123def456"
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/workload/${WORKLOAD_ID}" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{"config": {"quarantine": true}}'

# Verify quarantine status
curl -sk \
  "https://neuvector-manager:8443/v1/workload/${WORKLOAD_ID}" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.workload.quarantine'
```

In the UI:
1. Navigate to **Assets** > **Containers**
2. Find the container to quarantine
3. Click the container name
4. Click **Quarantine** button (lock icon)
5. Confirm the quarantine action

## Step 3: Investigate a Quarantined Container

After quarantine, investigate the container:

```bash
# Get all security events for the quarantined container
curl -sk \
  "https://neuvector-manager:8443/v1/log/event?category=security&start=0&limit=100" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq --arg id "${WORKLOAD_ID}" \
  '[.events[] | select(.workload_id == $id)] | {
    event_count: length,
    events: .
  }'

# Check process activity on the container (if still running)
kubectl exec -it <pod-name> -n <namespace> -- ps aux

# Capture the container state for forensics
kubectl exec <pod-name> -n <namespace> -- tar -czf /tmp/forensics.tar.gz /app /var/log /tmp 2>/dev/null
kubectl cp <namespace>/<pod-name>:/tmp/forensics.tar.gz ./forensics-$(date +%s).tar.gz
```

## Step 4: Configure Quarantine Notifications

Alert your team when quarantine is triggered:

```bash
# Configure Slack notification for critical security events
# (NeuVector does not emit a separate "quarantine" event, so notify on the
# critical security events that quarantine rules typically match on)
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/response/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "event": "security-event",
      "comment": "Alert on critical security events (covers quarantine triggers)",
      "conditions": [
        {"type": "level", "value": "critical"}
      ],
      "actions": ["webhook"],
      "webhooks": ["slack-security-oncall", "pagerduty-critical"],
      "disable": false
    }
  }'
```

## Step 5: View All Quarantined Containers

```bash
# List all currently quarantined containers
curl -sk \
  "https://neuvector-manager:8443/v1/workload?start=0&limit=1000" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '[.workloads[] | select(.quarantine == true) | {
    name: .display_name,
    namespace: .namespace,
    node: .host_name,
    quarantine: .quarantine,
    started_at: .started_at
  }]'
```

## Step 6: Handle Mass Quarantine

For incidents affecting multiple containers:

```bash
#!/bin/bash
# quarantine-namespace.sh
# Emergency: Quarantine all containers in a namespace

NAMESPACE="$1"

echo "WARNING: Quarantining all containers in namespace: ${NAMESPACE}"
read -p "Confirm (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
  echo "Cancelled"
  exit 0
fi

# Get all workload IDs in the namespace
curl -sk \
  "https://neuvector-manager:8443/v1/workload?start=0&limit=500" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq -r --arg ns "$NAMESPACE" \
  '.workloads[] | select(.namespace == $ns) | .id' | \
while read -r WORKLOAD_ID; do
  echo "Quarantining workload: ${WORKLOAD_ID}"
  curl -sk -X PATCH \
    "https://neuvector-manager:8443/v1/workload/${WORKLOAD_ID}" \
    -H "Content-Type: application/json" \
    -H "X-Auth-Token: ${TOKEN}" \
    -d '{"config": {"quarantine": true}}'
done

echo "All containers in ${NAMESPACE} have been quarantined"
```

## Step 7: Release a Container from Quarantine

After investigation and remediation:

```bash
# Release quarantine on a specific container
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/workload/${WORKLOAD_ID}" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{"config": {"quarantine": false}}'

echo "Container ${WORKLOAD_ID} has been released from quarantine"

# Recommended: Delete and redeploy the container from a clean image
kubectl delete pod <compromised-pod> -n <namespace>
```

## Step 8: Post-Quarantine Remediation

After investigation, remediate the root cause:

```bash
# 1. Identify the vulnerability
# Review scan results for the quarantined container

# 2. Update the image
docker build -t myapp:patched --build-arg BASE_IMAGE=nginx:latest-patched .
docker push myapp:patched

# 3. Update the Kubernetes deployment
kubectl set image deployment/webapp webapp=myapp:patched -n production

# 4. Review and update policies to prevent recurrence
# 5. Document the incident for compliance purposes
```

## Conclusion

NeuVector's container quarantine provides a surgical incident response capability that contains threats immediately without disrupting other services. By combining automatic quarantine rules for high-confidence threat detections with manual quarantine for human-initiated investigations, you create a complete incident response workflow. Always follow quarantine with forensic investigation and root cause analysis to prevent recurrence.
