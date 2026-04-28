# How to Troubleshoot NeuVector Scanner Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Scanner, Vulnerability Scanning, Troubleshooting, Kubernetes, Security, SUSE Rancher

Description: Learn how to diagnose and fix NeuVector scanner issues including scan failures, stale CVE databases, registry connectivity problems, and resource constraints.

---

NeuVector's scanner component performs vulnerability assessment on container images. When the scanner fails or produces inconsistent results, it can leave you without visibility into your security posture.

---

## Step 1: Check Scanner Pod Status

```bash
# Check if the NeuVector scanner pod is running

kubectl get pods -n neuvector -l app=neuvector-scanner-pod

# Check scanner logs for errors
kubectl logs -n neuvector \
  -l app=neuvector-scanner-pod \
  --tail=100

# Check controller logs which coordinates scans
kubectl logs -n neuvector \
  -l app=neuvector-controller-pod \
  --tail=100 | grep -i scanner
```

---

## Issue 1: Scanner Pod CrashLoopBackOff

**Cause**: Usually OOM kill or storage issues.

```bash
# Check pod events
kubectl describe pod -n neuvector \
  $(kubectl get pod -n neuvector -l app=neuvector-scanner-pod -o name)

# Check if it was OOM killed
kubectl get pod -n neuvector \
  -l app=neuvector-scanner-pod \
  -o jsonpath='{.items[0].status.containerStatuses[0].lastState.terminated.reason}'

# Fix: Increase scanner memory limits
kubectl patch deployment neuvector-scanner-pod -n neuvector --type merge -p '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "neuvector-scanner-pod",
          "resources": {
            "limits": {"memory": "2Gi"},
            "requests": {"memory": "512Mi"}
          }
        }]
      }
    }
  }
}'
```

---

## Issue 2: CVE Database Not Updating

```bash
# Check the last CVE database update time in NeuVector UI:
# Dashboard > CVE Database or Settings > Scanner

# Check network connectivity from scanner to update servers
kubectl exec -n neuvector \
  $(kubectl get pod -n neuvector -l app=neuvector-scanner-pod -o jsonpath='{.items[0].metadata.name}') \
  -- curl -s https://nvd.nist.gov --max-time 10

# If behind a proxy, configure scanner proxy in NeuVector settings:
# Settings > Configuration > Proxy
```

---

## Issue 3: Registry Scan Failing

```bash
# Test registry connectivity from the scanner pod
kubectl exec -n neuvector \
  $(kubectl get pod -n neuvector -l app=neuvector-scanner-pod -o jsonpath='{.items[0].metadata.name}') \
  -- curl -sk -I https://registry.example.com/v2/

# Check registry credentials in NeuVector
# Assets > Registries > [Registry Name] > Test Connection

# Common error: expired registry credentials
# Fix: Update the registry credentials in NeuVector UI
```

---

## Issue 4: Slow or Stalled Scans

```bash
# Check scan queue length
curl -sk \
  -H "X-Auth-Token: $TOKEN" \
  https://neuvector.example.com/v1/scan/status \
  | jq '.status'

# Increase scanner replica count to process scans in parallel
kubectl scale deployment neuvector-scanner-pod \
  -n neuvector --replicas=5

# Check if scans are CPU-bound
kubectl top pod -n neuvector -l app=neuvector-scanner-pod
```

---

## Issue 5: Scanner Shows "No CVEs Found" for Known-Vulnerable Images

```bash
# Verify the CVE database is current
# NeuVector UI: Dashboard > CVE Database Version

# Manually trigger a CVE database update via the updater CronJob
kubectl create job --from=cronjob/neuvector-updater-pod \
  manual-update-$(date +%s) \
  -n neuvector

# Force re-scan of a specific image
curl -sk -X POST \
  -H "X-Auth-Token: $TOKEN" \
  https://neuvector.example.com/v1/scan/workload/<workload-id>
```

---

## Best Practices

- Run at least 3 scanner replicas in production to handle concurrent scan requests.
- Ensure the scanner can reach `nvd.nist.gov` and `registry.hub.docker.com` for CVE updates.
- Set up alerts for CVE database staleness - if the DB hasn't updated in 24 hours, something is wrong.
- Allocate at least 1GB RAM per scanner pod - scanning large images requires significant memory.
