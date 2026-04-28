# How to Set Up Runtime Container Security with NeuVector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Runtime Security, Container Security, Kubernetes, Security

Description: Learn how to configure NeuVector's runtime container security to detect and prevent threats in running containers using behavioral analysis.

## Introduction

Runtime security is NeuVector's most powerful capability. Unlike static image scanning, runtime security monitors container behavior in real time - detecting unauthorized process execution, unexpected network connections, file access violations, and malicious activity patterns. This guide explains how to set up comprehensive runtime protection.

## How NeuVector Runtime Security Works

NeuVector uses a behavioral learning approach:

1. **Discover Mode**: Learns normal behavior by observing processes, network connections, and file access patterns
2. **Monitor Mode**: Alerts on behavior that deviates from the learned baseline without blocking
3. **Protect Mode**: Blocks unauthorized actions and enforces the security policy

This zero-trust approach means you start permissive and tighten over time based on observed behavior.

## Prerequisites

- NeuVector installed with Enforcer DaemonSet running on all nodes
- Understanding of your application's normal behavior patterns
- NeuVector Manager access

## Step 1: Understand the Enforcer

The NeuVector Enforcer is a privileged DaemonSet that uses eBPF and kernel capabilities to inspect container activity:

```bash
# Verify enforcers are running on all nodes

kubectl get daemonset neuvector-enforcer-pod -n neuvector

# Check enforcer logs for runtime events
kubectl logs -n neuvector \
  -l app=neuvector-enforcer-pod \
  --tail=50 \
  --follow
```

## Step 2: Review Discovered Behavior

After NeuVector has been running in Discover mode for at least 24-48 hours, review what it has learned:

1. Navigate to **Policy** > **Groups** in the NeuVector UI
2. Select a workload group (e.g., `nv.nginx.default`)
3. Review the **Process Profile** tab - discovered processes
4. Review the **Network Rules** tab - learned connections
5. Review the **File Access** tab - accessed files

Via API:

```bash
# Get process profile for a group
curl -sk \
  "https://neuvector-controller:10443/v1/process_profile/nv.nginx.default" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.process_profile.process_list'
```

## Step 3: Configure Process Profile Rules

Define which processes are allowed to run inside containers:

```bash
# Allow specific processes
curl -sk -X PATCH \
  "https://neuvector-controller:10443/v1/process_profile/nv.nginx.default" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "process_profile_config": {
      "group": "nv.nginx.default",
      "process_change_list": [
        {
          "name": "nginx",
          "path": "/usr/sbin/nginx",
          "action": "allow",
          "group": "nv.nginx.default"
        },
        {
          "name": "sh",
          "path": "/bin/sh",
          "action": "deny",
          "group": "nv.nginx.default"
        }
      ]
    }
  }'
```

## Step 4: Set Up Network Rules

Define allowed inbound and outbound network connections:

```yaml
# neuvector-network-policy.yaml
apiVersion: neuvector.com/v1
kind: NvSecurityRule
metadata:
  name: nv.nginx.default
  namespace: default
spec:
  target:
    selector:
      name: nv.nginx.default
      criteria:
        - key: service
          op: "="
          value: nginx.default
        - key: domain
          op: "="
          value: default
    policymode: Monitor
  ingress:
    - name: nv.nginx.default-ingress-0
      selector:
        name: nv.frontend.default
        criteria:
          - key: service
            op: "="
            value: frontend.default
      action: allow
      applications:
        - HTTP
      ports: "tcp/80"
  egress:
    - name: nv.nginx.default-egress-0
      selector:
        name: nv.backend-api.default
        criteria:
          - key: service
            op: "="
            value: backend-api.default
      action: allow
      ports: "tcp/8080"
  process: []
  file: []
```

In Protect mode, NeuVector blocks any network traffic that does not match an allow rule, so an explicit deny-all rule is not required.

```bash
kubectl apply -f neuvector-network-policy.yaml
```

## Step 5: Transition from Monitor to Protect Mode

Protect mode enforces the policy by blocking violations. Transition carefully:

```bash
# First, set a service to Monitor mode to test without blocking
curl -sk -X PATCH \
  "https://neuvector-controller:10443/v1/service/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "services": ["nginx.default"],
      "policy_mode": "Monitor"
    }
  }'

# After validating no false positives, switch to Protect
curl -sk -X PATCH \
  "https://neuvector-controller:10443/v1/service/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "services": ["nginx.default"],
      "policy_mode": "Protect"
    }
  }'
```

## Step 6: Respond to Runtime Violations

When NeuVector detects a violation in Protect mode, it generates a security event and takes action:

```bash
# View recent security events via API (returns threats, incidents, and violations)
curl -sk \
  "https://neuvector-controller:10443/v1/log/security" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.threats[] | {
    name: .name,
    severity: .severity,
    target: .target,
    action: .action,
    timestamp: .reported_at
  }'
```

In the UI:
1. Go to **Notifications** > **Security Events**
2. Filter by event type: **Process**, **Network**, or **File**
3. Click an event to see:
   - Container and namespace
   - Process name and path
   - Action taken (alert or blocked)
   - Parent process

## Step 7: Handle Common Runtime Threats

Configure specific responses to common runtime threats. To quarantine a workload that exhibits malicious behavior, patch the workload directly:

```bash
# Quarantine a specific workload by ID
curl -sk -X PATCH \
  "https://neuvector-controller:10443/v1/workload/${WORKLOAD_ID}" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "quarantine": true,
      "quarantine_reason": "suspicious behavior"
    }
  }'

# Enable service mesh monitoring at the system level
curl -sk -X PATCH \
  "https://neuvector-controller:10443/v1/system/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "monitor_service_mesh": true
    }
  }'
```

To trigger quarantine automatically on specific events, configure Response Rules in the NeuVector UI under **Policy** > **Response Rules**.

## Step 8: Test Your Runtime Protection

Validate that runtime protection works correctly:

```bash
# Test: attempt to run an unauthorized process inside a protected container
kubectl exec -it <nginx-pod> -n default -- /bin/bash

# Expected: connection refused or process terminated
# NeuVector generates a security event visible in the UI

# Check generated events
kubectl logs -n neuvector -l app=neuvector-controller-pod --tail=20
```

## Conclusion

NeuVector's runtime security provides a behavioral defense that static scanning cannot match. By learning your application's normal behavior and then enforcing it, NeuVector can detect and block zero-day attacks, container escapes, and post-exploitation activity. The key to success is allowing sufficient time in Discover mode before transitioning to Protect mode, and regularly reviewing generated events to tune your policies.
