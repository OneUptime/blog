# How to Troubleshoot NeuVector Scanner Issues - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Troubleshooting, Scanner, Container Security, Kubernetes

Description: Diagnose and resolve common NeuVector Scanner issues including scan failures, CVE database problems, and connectivity errors.

## Introduction

NeuVector Scanner issues can prevent vulnerability scanning from functioning correctly, leaving your environment without visibility into CVE exposure. This guide covers the most common scanner problems and their solutions, including scan failures, outdated CVE databases, registry connectivity issues, and resource constraints.

## Common Scanner Problems

1. Scans not completing or timing out
2. CVE database not updating
3. Scanner pods in CrashLoopBackOff
4. Registry authentication failures
5. Scanner not receiving scan requests
6. High memory usage during scanning

## Prerequisites

- Kubectl access to the cluster
- NeuVector Manager access
- Admin permissions

## Step 1: Check Scanner Pod Status

Start by verifying the scanner pods are healthy:

```bash
# Check scanner pod status

kubectl get pods -n neuvector -l app=neuvector-scanner-pod

# Look for common issues
kubectl describe pod <scanner-pod-name> -n neuvector

# Check scanner pod logs
kubectl logs -n neuvector -l app=neuvector-scanner-pod --tail=100

# Follow logs in real time during a scan
kubectl logs -n neuvector -l app=neuvector-scanner-pod -f
```

Common log patterns to look for:
```text
# Good - scanner is working
"Scanner connected to controller"
"Scanning image: nginx:latest"

# Bad - database issue
"Failed to load CVE database"

# Bad - connectivity issue
"Failed to connect to controller: connection refused"
```

## Step 2: Diagnose CVE Database Issues

If the CVE database is outdated or not loading:

```bash
# Check the updater CronJob status
kubectl get cronjob neuvector-updater-pod -n neuvector

# Check if the last update job succeeded
kubectl get jobs -n neuvector | grep updater

# View updater logs
kubectl logs -n neuvector \
  -l job-name=$(kubectl get jobs -n neuvector | grep updater | head -1 | awk '{print $1}') \
  --tail=50

# Manually trigger a database update
kubectl create job --from=cronjob/neuvector-updater-pod \
  manual-update-$(date +%s) \
  -n neuvector

# Wait and check if update succeeded
kubectl get jobs -n neuvector | grep manual-update
```

Check the CVE database version via API:

```bash
# Check scanner database version
curl -sk \
  "https://neuvector-manager:8443/v1/scan/scanner" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.scanners[] | {
    id: .id,
    cvedb_version: .cvedb_version,
    cvedb_create_time: .cvedb_create_time,
    server: .server
  }'
```

## Step 3: Fix Scanner Not Connecting to Controller

If the scanner can't connect to the controller:

```bash
# Verify controller service exists
kubectl get svc neuvector-svc-controller -n neuvector

# Test connectivity from scanner pod
kubectl exec -it <scanner-pod> -n neuvector -- \
  wget -O- http://neuvector-svc-controller.neuvector:18300 || \
  echo "Cannot reach controller"

# Check controller logs for connection issues
kubectl logs -n neuvector \
  -l app=neuvector-controller-pod \
  --tail=50 | grep -i "scanner\|error\|fail"

# Verify the CLUSTER_JOIN_ADDR environment variable
kubectl get pod <scanner-pod> -n neuvector \
  -o jsonpath='{.spec.containers[0].env[?(@.name=="CLUSTER_JOIN_ADDR")].value}'
```

## Step 4: Fix Registry Authentication Failures

When registry scans fail due to authentication errors:

```bash
# Check registry scan status
curl -sk \
  "https://neuvector-manager:8443/v1/scan/registry" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.registries[] | {
    name: .config.name,
    status: .status.status,
    error: .status.error_message
  }'

# Common error messages and solutions:
# "unauthorized: authentication required" -> Update credentials
# "connection refused" -> Check registry URL and network policies
# "x509: certificate signed by unknown authority" -> Add CA certificate

# Update registry credentials
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/scan/registry/my-registry" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "username": "updated-user",
      "password": "updated-password"
    }
  }'
```

## Step 5: Handle Scanner Resource Issues

If scanners are OOMKilled or hitting CPU limits:

```bash
# Check resource usage
kubectl top pods -n neuvector -l app=neuvector-scanner-pod

# Check for OOMKilled events
kubectl describe pod <scanner-pod> -n neuvector | grep -A5 "OOMKilled\|Limits"

# Increase scanner resource limits
kubectl patch deployment neuvector-scanner-pod \
  -n neuvector \
  --patch '{
    "spec": {
      "template": {
        "spec": {
          "containers": [{
            "name": "neuvector-scanner-pod",
            "resources": {
              "limits": {
                "memory": "4Gi",
                "cpu": "2000m"
              },
              "requests": {
                "memory": "512Mi",
                "cpu": "200m"
              }
            }
          }]
        }
      }
    }
  }'

# Reduce concurrent scans if resources are constrained
# Scale down scanner replicas
kubectl scale deployment neuvector-scanner-pod \
  --replicas=1 \
  -n neuvector
```

## Step 6: Debug Scan Failures via API

Get detailed scan failure information:

```bash
# Get failed scan details for a container
WORKLOAD_ID="abc123"
curl -sk \
  "https://neuvector-manager:8443/v1/workload/${WORKLOAD_ID}" \
  -H "X-Auth-Token: ${TOKEN}" | jq '{
    name: .workload.name,
    scan_summary: .workload.scan_summary,
    scan_status: .workload.scan_summary.status
  }'

# Common scan statuses:
# scheduled - waiting to be scanned
# scanning - scan in progress
# finished - scan complete
# failed - scan failed
# unsupported - image format not supported
```

## Step 7: Fix Network Policy Blocking Scanner Access

NeuVector's own network policies may block scanner access to registries:

```bash
# Check if network policies are blocking registry access
# Scanner pods need to reach external registries

# Check NeuVector network rules for scanner group
curl -sk \
  "https://neuvector-manager:8443/v1/policy/rule?start=0&limit=100" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '.rules[] | select(.from | contains("scanner"))'

# Add a rule to allow scanner to reach external registries
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/policy/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "insert": {
      "after": 0,
      "rules": [
        {
          "comment": "Allow scanner to reach external registries",
          "from": "nv.neuvector-scanner-pod.neuvector",
          "to": "external",
          "ports": "tcp/443",
          "action": "allow"
        }
      ]
    }
  }'
```

## Step 8: Collect Diagnostic Information

For escalating issues to NeuVector support:

```bash
#!/bin/bash
# collect-scanner-diagnostics.sh

echo "Collecting NeuVector Scanner diagnostics..."

mkdir -p nv-diag/scanner

# Pod status
kubectl get pods -n neuvector > nv-diag/pod-status.txt

# Scanner pod logs
kubectl logs -n neuvector \
  -l app=neuvector-scanner-pod \
  --tail=500 > nv-diag/scanner/scanner-logs.txt

# Controller logs (relevant to scanning)
kubectl logs -n neuvector \
  -l app=neuvector-controller-pod \
  --tail=200 | grep -i scan > nv-diag/scanner/controller-scan-logs.txt

# Events
kubectl get events -n neuvector \
  --sort-by='.lastTimestamp' > nv-diag/events.txt

# Resource usage
kubectl top pods -n neuvector > nv-diag/resource-usage.txt

tar -czf neuvector-scanner-diagnostics.tar.gz nv-diag/
echo "Diagnostics collected: neuvector-scanner-diagnostics.tar.gz"
```

## Conclusion

Scanner issues in NeuVector typically fall into four categories: connectivity problems, database issues, resource constraints, and authentication failures. By systematically checking pod status, logs, database currency, and network connectivity, you can diagnose and resolve most scanner problems. Maintaining sufficient scanner resources and regularly verifying CVE database update schedules prevents most scanning issues from occurring in the first place.
