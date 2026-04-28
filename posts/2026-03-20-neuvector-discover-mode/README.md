# How to Configure NeuVector Discover Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Discover Mode, Container Security, Policy Learning, Kubernetes

Description: Understand and configure NeuVector's Discover mode to automatically learn your application's normal behavior before enforcing security policies.

## Introduction

Discover mode is NeuVector's learning phase - it observes container activity without enforcing any rules or generating blocking actions. During Discover mode, NeuVector builds a comprehensive picture of your application's normal behavior: which processes run, what network connections are made, and which files are accessed. This baseline becomes the foundation for your security policies.

## What Discover Mode Does

In Discover mode, NeuVector:

- **Learns processes**: Records every process that runs inside containers
- **Learns network connections**: Maps all TCP/UDP connections between containers and to external endpoints
- **Learns file access patterns**: Observes which files and directories are accessed
- **Builds network topology**: Creates a visual map of service communication
- **Generates auto-policy rules**: Creates suggested rules based on observed behavior

No traffic is blocked or alerts generated during Discover mode.

## Prerequisites

- NeuVector installed with Enforcer running on all nodes
- Workloads deployed and actively running
- NeuVector Manager access

## Step 1: Verify Groups Are in Discover Mode

All newly discovered groups start in Discover mode by default:

```bash
# Check which groups are in Discover mode

curl -sk \
  "https://neuvector-manager:8443/v1/group?start=0&limit=100" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '.groups[] | select(.policy_mode == "Discover") | {
    name: .name,
    mode: .policy_mode,
    members: (.members | length)
  }'
```

In the UI:
1. Go to **Policy** > **Groups**
2. Groups in Discover mode show a blue indicator
3. The mode column shows "Discover"

## Step 2: Configure the Default Discovery Mode

Set the default mode for newly discovered services:

```bash
# Set new services to automatically start in Discover mode
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/system/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "new_service_policy_mode": "Discover"
    }
  }'
```

## Step 3: Run Your Application's Full Workflow

For accurate learning, exercise all application paths during the discovery period:

```bash
# Example: Run end-to-end tests against your application
# This ensures NeuVector learns all legitimate traffic patterns

# 1. Run normal user workflows
curl -s http://webapp.company.com/api/users
curl -s -X POST http://webapp.company.com/api/orders -d '{"product": "test"}'

# 2. Run batch jobs
kubectl create job manual-batch --from=cronjob/nightly-batch -n production

# 3. Run health checks and monitoring
curl -s http://webapp.company.com/health
curl -s http://webapp.company.com/metrics

# 4. Simulate admin operations
kubectl exec -it admin-pod -- /app/maintenance.sh
```

## Step 4: Review Discovered Connections

After 24-48 hours, review what NeuVector has learned:

```bash
# View all learned network connections for a group
GROUP_NAME="nv.webapp.production"
curl -sk \
  "https://neuvector-manager:8443/v1/policy/rule?start=0&limit=200" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq --arg group "$GROUP_NAME" \
  '[.rules[] | select(.cfg_type == "learned" and (.from == $group or .to == $group))]'
```

## Step 5: Review Discovered Processes

```bash
# Get all discovered processes for a group.
# The process profile endpoint is /v1/process_profile/{group} (single segment, underscore).
curl -sk \
  "https://neuvector-manager:8443/v1/process_profile/nv.webapp.production" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '.process_profile.process_list[] | {
    name: .name,
    path: .path,
    type: .cfg_type
  }'
```

In the UI:
1. Go to **Policy** > **Groups**
2. Click the group name
3. Click **Process Profile** tab
4. Review and remove any unexpected processes

## Step 6: View the Network Visualization

The Network Map provides a visual representation of discovered connections:

1. Navigate to **Network Activity** in the NeuVector UI
2. Select the namespace or group to visualize
3. Review:
   - Container-to-container connections
   - External IP connections
   - Service communication patterns
4. Identify any unexpected connections to external IPs

## Step 7: Manually Add Discover Mode Groups

Force-add a specific service to Discover mode if it was previously in Monitor or Protect.
Policy mode is set on services via `PATCH /v1/service/config` (the
`RESTServiceBatchConfig` schema), not on the group config:

```bash
# Move a service back to Discover mode for re-learning
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/service/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "services": ["nv.webapp.production"],
      "policy_mode": "Discover"
    }
  }'
```

Use this when:
- Deploying a new version of an application
- Adding new features with different network requirements
- After significant application refactoring

## Step 8: Set Auto-Promotion Schedule

Configure how long to stay in Discover mode before auto-promoting:

```bash
# Note: NeuVector doesn't have built-in auto-promotion timing
# Use a script to transition services after a defined period

#!/bin/bash
# auto-promote.sh
# Run this after 48+ hours in Discover mode

# Collect all service groups currently in Discover mode (auto-discovered groups
# carry the "nv." prefix; "containers", "nodes", "external" etc. are reserved
# groups that should not be promoted).
SERVICES=$(curl -sk \
  "https://neuvector-manager:8443/v1/group" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq -r '.groups[] | select(.policy_mode == "Discover" and (.name | startswith("nv."))) | .name')

if [ -z "${SERVICES}" ]; then
  echo "No Discover-mode services to promote."
  exit 0
fi

# Build a JSON array of service names and submit a single batched mode change.
# Policy mode is set via PATCH /v1/service/config (RESTServiceBatchConfig).
SERVICE_JSON=$(echo "${SERVICES}" | jq -R . | jq -s .)

echo "Promoting the following services to Monitor mode:"
echo "${SERVICES}"

curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/service/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d "$(jq -n --argjson services "${SERVICE_JSON}" \
    '{config: {services: $services, policy_mode: "Monitor"}}')"

echo "All services promoted to Monitor mode. Watch for alerts before switching to Protect."
```

## Conclusion

Discover mode is the critical first phase of NeuVector deployment. The quality of your security policy depends on the completeness of the learning period. Allow sufficient time (at least 48 hours for most applications) and exercise all application workflows during discovery. A thorough Discover phase means less tuning needed when you transition to Monitor and Protect modes, and fewer false positives to manage in production.
