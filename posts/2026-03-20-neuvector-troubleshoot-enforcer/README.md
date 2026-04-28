# How to Troubleshoot NeuVector Enforcer Issues - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Troubleshooting, Enforcer, Runtime Security, Kubernetes

Description: Diagnose and resolve NeuVector Enforcer issues including pod startup failures, connectivity problems, and policy enforcement errors.

## Introduction

The NeuVector Enforcer is the most critical component for runtime security enforcement. It runs as a privileged DaemonSet on every node and intercepts container activity. When enforcers have issues, runtime security, network policy enforcement, and behavioral monitoring are all affected. This guide covers systematic troubleshooting for enforcer problems.

## Common Enforcer Problems

1. Enforcer pod failing to start (CrashLoopBackOff)
2. Enforcer not appearing in the NeuVector dashboard
3. Process violations blocking legitimate application traffic
4. Enforcer disconnected from controller
5. High CPU usage on nodes
6. Compatibility issues with node kernel or container runtime

## Prerequisites

- Kubectl access to all cluster nodes
- Admin access to NeuVector Manager
- SSH access to nodes (for advanced debugging)

## Step 1: Check Enforcer Pod Status

```bash
# Check all enforcer pods across nodes

kubectl get pods -n neuvector -l app=neuvector-enforcer-pod -o wide

# Check for pods not running
kubectl get pods -n neuvector \
  -l app=neuvector-enforcer-pod \
  --field-selector=status.phase!=Running

# Describe a problematic enforcer pod
kubectl describe pod <enforcer-pod-name> -n neuvector

# View enforcer logs
kubectl logs <enforcer-pod-name> -n neuvector --tail=100

# Follow logs in real time
kubectl logs <enforcer-pod-name> -n neuvector -f
```

## Step 2: Diagnose Enforcer Startup Failures

Common startup errors and their causes:

```bash
# Error: "Failed to connect to host"
# Cause: Privileged mode not enabled or securityContext issue
kubectl describe pod <enforcer-pod> -n neuvector | grep -A20 "securityContext"

# Error: "Failed to mount /proc"
# Cause: hostPath volumes not accessible
kubectl get pod <enforcer-pod> -n neuvector \
  -o jsonpath='{.spec.volumes[*]}' | python3 -m json.tool

# Error: "runtime.sock not found"
# Cause: Incorrect container runtime socket path
# Check the actual socket path on the node:
ssh node1 "ls -la /run/containerd/containerd.sock /var/run/docker.sock /run/crio/crio.sock 2>/dev/null"
```

Fix incorrect container runtime socket:

```yaml
# Update the enforcer DaemonSet with correct socket path
# For containerd:
volumes:
  - name: runtime-sock
    hostPath:
      path: /run/containerd/containerd.sock

# For Docker:
volumes:
  - name: runtime-sock
    hostPath:
      path: /var/run/docker.sock

# For CRI-O:
volumes:
  - name: runtime-sock
    hostPath:
      path: /run/crio/crio.sock
```

```bash
# Apply the fix
kubectl patch daemonset neuvector-enforcer-pod \
  -n neuvector \
  --patch '{
    "spec": {
      "template": {
        "spec": {
          "volumes": [{
            "name": "runtime-sock",
            "hostPath": {
              "path": "/run/containerd/containerd.sock"
            }
          }]
        }
      }
    }
  }'
```

## Step 3: Fix Controller-Enforcer Connectivity

If enforcers aren't connecting to the controller:

```bash
# Check controller service
kubectl get svc neuvector-svc-controller -n neuvector

# Test connectivity from an enforcer pod
kubectl exec -it <enforcer-pod> -n neuvector -- \
  curl -v telnet://neuvector-svc-controller.neuvector:18300 || \
  echo "Cannot reach controller on port 18300"

# Check controller pod logs for enforcer connections
kubectl logs -n neuvector \
  -l app=neuvector-controller-pod \
  --tail=50 | grep -i "enforcer\|join\|disconnect"

# Verify CLUSTER_JOIN_ADDR is correct
kubectl get daemonset neuvector-enforcer-pod -n neuvector \
  -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="CLUSTER_JOIN_ADDR")].value}'
```

## Step 4: Handle Policy-Caused Application Breakage

If protect mode is blocking legitimate application traffic:

```bash
# Identify which violations are blocking the application
curl -sk \
  "https://neuvector-manager:8443/v1/log/violation?start=0&limit=50" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '.violations[] | {
    time: .reported_at,
    client: .client_name,
    server: .server_name,
    application: .applications,
    detail: .message
  }'

# Quick fix: Move the affected service to Monitor mode
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/service/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{"config": {"services": ["myapp.production"], "policy_mode": "Monitor"}}'

echo "Group moved to Monitor mode. Application should recover."
echo "Review the violations and update policies, then switch back to Protect."
```

## Step 5: Debug High CPU Usage

If enforcer pods are consuming excessive CPU:

```bash
# Check current resource usage
kubectl top pods -n neuvector -l app=neuvector-enforcer-pod

# Check node CPU usage
kubectl top nodes

# View enforcer CPU metrics over time
kubectl logs <enforcer-pod> -n neuvector --tail=200 | grep -i "cpu\|performance"

# Profile the enforcer pod
kubectl exec -it <enforcer-pod> -n neuvector -- top
```

Potential causes and solutions:

```bash
# Cause 1: Too many processes being monitored
# Solution: Reduce process monitoring scope

# Cause 2: DPI on high-traffic services
# Solution: Move low-risk, high-traffic services to Discover mode
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/service/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{"config": {"services": ["batch-processor.default"], "policy_mode": "Discover"}}'
```

## Step 6: Verify Enforcer on All Nodes

Ensure enforcers are running on every node:

```bash
# Compare nodes vs enforcer pods
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
ENFORCER_COUNT=$(kubectl get pods -n neuvector \
  -l app=neuvector-enforcer-pod \
  --field-selector=status.phase=Running \
  --no-headers | wc -l)

echo "Nodes: ${NODE_COUNT}"
echo "Running Enforcers: ${ENFORCER_COUNT}"

if [ "${NODE_COUNT}" != "${ENFORCER_COUNT}" ]; then
  echo "WARNING: Missing enforcers on some nodes!"

  # Find nodes without an enforcer
  kubectl get pods -n neuvector \
    -l app=neuvector-enforcer-pod \
    -o jsonpath='{.items[*].spec.nodeName}' | tr ' ' '\n' | sort > nodes-with-enforcer.txt

  kubectl get nodes \
    -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | sort > all-nodes.txt

  diff all-nodes.txt nodes-with-enforcer.txt
fi
```

## Step 7: Collect Enforcer Diagnostics

For escalation to support:

```bash
#!/bin/bash
# collect-enforcer-diag.sh

mkdir -p nv-enforcer-diag

# Get all enforcer pod logs
for POD in $(kubectl get pods -n neuvector \
  -l app=neuvector-enforcer-pod -o name); do
  NODE=$(kubectl get ${POD} -n neuvector \
    -o jsonpath='{.spec.nodeName}')
  kubectl logs ${POD} -n neuvector \
    --tail=500 > "nv-enforcer-diag/enforcer-${NODE}.log"
done

# Get events
kubectl get events -n neuvector \
  --sort-by='.lastTimestamp' > nv-enforcer-diag/events.txt

# Get node info
kubectl get nodes -o wide > nv-enforcer-diag/nodes.txt

tar -czf enforcer-diagnostics.tar.gz nv-enforcer-diag/
echo "Diagnostics: enforcer-diagnostics.tar.gz"
```

## Conclusion

Enforcer troubleshooting requires a systematic approach starting with pod health, moving to connectivity, then examining specific error patterns. The most critical skill is knowing how to quickly move groups back to Monitor mode when protect mode causes application disruption. This emergency rollback ensures business continuity while you diagnose the root cause and update your security policies.
