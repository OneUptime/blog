# How to Configure NeuVector Protect Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Protect Mode, Runtime Security, Container Security, Kubernetes

Description: Transition NeuVector workloads to Protect mode to actively block unauthorized processes, network connections, and file access in real time.

## Introduction

Protect mode is NeuVector's enforcement tier. When a workload is in Protect mode, NeuVector actively blocks any activity that violates the defined security policy - unauthorized processes are terminated, forbidden network connections are dropped, and policy-violating file access is denied. This is the end goal of the Discover → Monitor → Protect workflow.

## What Protect Mode Does

In Protect mode, NeuVector:

- **Blocks unauthorized processes**: Terminates processes not in the allow list
- **Drops forbidden connections**: Rejects TCP/UDP connections that violate network rules
- **Denies file access**: Prevents access to protected files and directories
- **Generates security events**: Creates high-priority alerts for every blocked action
- **Optionally quarantines containers**: Can isolate containers on severe violations

## Prerequisites

- Workloads have been in Monitor mode for at least 1-2 weeks
- All expected violations have been addressed in policies
- A rollback plan is in place (know how to revert to Monitor mode)
- Change management approval for production workloads

## Step 1: Final Policy Review Before Protect Mode

```bash
#!/bin/bash
# pre-protect-review.sh

GROUP="nv.webapp.production"

echo "=== Pre-Protect Mode Review for ${GROUP} ==="

echo ""
echo "--- Current Process Profile ---"
curl -sk \
  "https://neuvector-manager:8443/v1/process/profile/group/${GROUP}" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '.process_profile.process_list[] | {
    name: .name,
    path: .path,
    action: .action,
    type: .cfg_type
  }'

echo ""
echo "--- Current Network Rules ---"
curl -sk \
  "https://neuvector-manager:8443/v1/policy/rule?start=0&limit=100" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq --arg grp "$GROUP" \
  '.rules[] | select(.from == $grp or .to == $grp) | {
    id: .id,
    from: .from,
    to: .to,
    ports: .ports,
    action: .action,
    type: .cfg_type
  }'

echo ""
echo "--- Recent Monitor Mode Violations ---"
curl -sk \
  "https://neuvector-manager:8443/v1/event?type=security&start=0&limit=50" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq --arg grp "webapp" \
  '[.events[] | select(.workload_name | contains($grp))] | length'
```

## Step 2: Transition to Protect Mode

Move individual groups to Protect mode:

```bash
# Move a single group to Protect mode

curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/group/nv.webapp.production" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "mode": "Protect"
    }
  }'

# Verify the mode was applied
curl -sk \
  "https://neuvector-manager:8443/v1/group/nv.webapp.production" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '.group.policy_mode'
```

## Step 3: Staged Rollout to Protect Mode

Roll out Protect mode gradually across namespaces:

```bash
#!/bin/bash
# staged-protect-rollout.sh

# Stage 1: Non-critical namespaces first
STAGE_1_NAMESPACES=("development" "staging")

# Stage 2: Critical namespaces after validation
STAGE_2_NAMESPACES=("production")

enable_protect() {
  local NAMESPACE=$1
  echo "Enabling Protect mode for namespace: ${NAMESPACE}"

  curl -sk \
    "https://neuvector-manager:8443/v1/group?start=0&limit=100" \
    -H "X-Auth-Token: ${TOKEN}" | \
    jq -r --arg ns "$NAMESPACE" \
    '.groups[] | select(.name | endswith("." + $ns)) | .name' | \
  while read GROUP; do
    echo "  -> ${GROUP}"
    curl -sk -X PATCH \
      "https://neuvector-manager:8443/v1/group/${GROUP}" \
      -H "Content-Type: application/json" \
      -H "X-Auth-Token: ${TOKEN}" \
      -d '{"config": {"mode": "Protect"}}'
  done
}

# Stage 1
for NS in "${STAGE_1_NAMESPACES[@]}"; do
  enable_protect "$NS"
done

echo "Stage 1 complete. Monitor for 24 hours before Stage 2."
```

## Step 4: Configure Protect Mode via CRD

```yaml
# protect-mode-policy.yaml
apiVersion: neuvector.com/v1
kind: NvSecurityRule
metadata:
  name: webapp-protect-policy
  namespace: production
spec:
  target:
    # Set policymode to Protect
    policymode: Protect
    selector:
      name: nv.webapp.production
      criteria:
        - key: service
          op: =
          value: webapp
        - key: domain
          op: =
          value: production
  process:
    - name: node
      path: /usr/local/bin/node
      action: allow
    - name: sh
      action: deny
    - name: bash
      action: deny
  ingress:
    - action: allow
      name: allow-lb
      selector:
        name: nv.ingress-nginx.ingress-nginx
        criteria:
          - key: service
            op: =
            value: ingress-nginx
      ports: tcp/3000
  egress:
    - action: allow
      name: allow-api
      selector:
        name: nv.api.production
        criteria:
          - key: service
            op: =
            value: api
      ports: tcp/8080
    - action: allow
      name: allow-dns
      selector:
        name: nv.kube-dns.kube-system
        criteria:
          - key: service
            op: =
            value: kube-dns
      ports: udp/53
```

```bash
kubectl apply -f protect-mode-policy.yaml
```

## Step 5: Monitor Protect Mode Events

Watch for blocked events immediately after switching to Protect mode:

```bash
# Monitor for blocked events in real-time
watch -n 5 'curl -sk \
  "https://neuvector-manager:8443/v1/event?type=security&start=0&limit=20" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq "[.events[] | select(.action == \"deny\")] | length"'

# Get details of blocked events
curl -sk \
  "https://neuvector-manager:8443/v1/event?type=security&start=0&limit=50" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '.events[] | select(.action == "deny") | {
    time: .at,
    container: .workload_name,
    type: .type,
    name: .name,
    detail: .message
  }'
```

## Step 6: Quickly Revert to Monitor Mode if Needed

If protect mode causes application issues:

```bash
# Emergency: Revert to Monitor mode
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/group/nv.webapp.production" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{"config": {"mode": "Monitor"}}'

echo "Reverted to Monitor mode. Investigate and fix policy before re-enabling Protect."
```

## Step 7: Set Default Mode for New Services

```bash
# Set the default mode for newly discovered services (Discover, Monitor, or Protect)
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

Note: Setting new services directly to Protect mode is not recommended unless you have templates pre-configured.

## Conclusion

Protect mode is the culmination of NeuVector's security workflow. By following the Discover → Monitor → Protect progression, you build confidence in your security policies before enforcement begins. The key to a smooth Protect mode transition is thorough policy validation during Monitor mode and a clear rollback plan. Once in Protect mode, your containers have the strongest runtime protection available, blocking threats in real time without disrupting legitimate application behavior.
