# How to Run CIS Scans on Clusters in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, CIS, Security, Compliance, Benchmark

Description: Learn how to run CIS (Center for Internet Security) benchmark scans on your Kubernetes clusters using Rancher's built-in CIS scanning tool.

The Center for Internet Security (CIS) provides Kubernetes benchmarks that define security best practices for Kubernetes cluster configuration. On Rancher v2.11 and earlier, Rancher exposes CIS scanning through the CIS Benchmark app and related Kubernetes CRDs, making it easy to assess your cluster's security posture against these benchmarks. Rancher v2.12 and later use the Compliance app instead. This guide walks you through running CIS scans in a Rancher environment.

## Prerequisites

- Rancher v2.11 or earlier
- A Kubernetes cluster managed by Rancher
- Cluster Owner or Global Administrator permissions in Rancher (or equivalent `cis-admin` access)
- The CIS Benchmark app installed from Rancher Apps

## Understanding CIS Kubernetes Benchmarks

The CIS Kubernetes Benchmark provides prescriptive guidance for:

- **Control Plane Components**: API server, controller manager, scheduler
- **etcd**: Configuration and security settings
- **Control Plane Configurations**: Network policies, admission controllers
- **Worker Node Components**: Kubelet configuration
- **Kubernetes Policies**: RBAC, Pod Security, Network Policies

## Step 1: Install the CIS Benchmark App

```bash
# The CIS Benchmark app is available in Rancher's Apps catalog

# Navigate to: Apps -> Charts -> CIS Benchmark

# Verify the CIS Benchmark CRDs are installed
kubectl get crd | grep cis

# Expected output:
# clusterscanbenchmarks.cis.cattle.io
# clusterscanprofiles.cis.cattle.io
# clusterscanreports.cis.cattle.io
# clusterscans.cis.cattle.io
```

## Step 2: Run a CIS Scan via Rancher UI

1. Navigate to your cluster in the Rancher UI
2. Go to **CIS Benchmark > Scan** in the left sidebar
3. Click **Create** to start a new scan
4. Select the appropriate benchmark profile:
   - **Default**: Rancher chooses a compatible profile for the cluster type and Kubernetes version
   - Or select a built-in **ClusterScanProfile** that matches your cluster type and Kubernetes version
5. Click **Create** to start the scan

## Step 3: Run a CIS Scan via kubectl

```bash
# List the available built-in scan profiles on this cluster
kubectl get clusterscanprofile

# Create a ClusterScan to run the CIS benchmark
kubectl apply -f - <<EOF
apiVersion: cis.cattle.io/v1
kind: ClusterScan
metadata:
  name: my-cis-scan
spec:
  # Replace this with a profile from 'kubectl get clusterscanprofile'
  scanProfileName: "<clusterscanprofile-name>"
  # Scheduled scan (optional)
  # scheduledScanConfig:
  #   cronSchedule: "0 0 * * *"
  #   retentionCount: 3
EOF

# Monitor the scan progress
kubectl get clusterscan my-cis-scan -w

# Check the scan status
kubectl describe clusterscan my-cis-scan
```

## Step 4: View Scan Results

```bash
# List all cluster scans
kubectl get clusterscan

# Get the scan profile used for the last run
kubectl get clusterscan my-cis-scan \
  -o jsonpath='{.status.lastRunScanProfileName}'

# List the generated scan reports
kubectl get clusterscanreport

# Get detailed report
kubectl describe clusterscanreport <report-name>
```

## Step 5: Understand the Scan Results

The scan report categorizes findings as:

- **Pass**: The check passed (configuration meets the benchmark)
- **Fail**: The check failed (configuration does not meet the benchmark)
- **Skip**: The check was skipped by the selected scan profile
- **Warn**: The check requires manual verification
- **Not Applicable**: The check doesn't apply to this cluster type or profile
- **Mixed**: The check did not produce the same result on every node

```bash
# Get a summary of pass/fail/skip/warn counts
kubectl get clusterscan my-cis-scan \
  -o jsonpath='{.status.summary}'

# View failed checks specifically
kubectl get clusterscanreport <report-name> \
  -o jsonpath='{.spec.reportJSON}' | \
  python3 -c "
import json, sys
report = json.load(sys.stdin)
for result in report['results']:
    for check in result.get('checks', []):
        if check['state'] == 'fail':
            print(f\"FAIL: {check['id']} - {check['description']}\")
"
```

## Step 6: Export the Scan Report

```bash
# Export the report as JSON for further processing
kubectl get clusterscanreport <report-name> \
  -o jsonpath='{.spec.reportJSON}' > cis-report.json

# Generate a summary CSV
kubectl get clusterscanreport <report-name> \
  -o jsonpath='{.spec.reportJSON}' | \
  python3 -c "
import json, sys, csv
report = json.load(sys.stdin)
writer = csv.writer(sys.stdout)
writer.writerow(['Check ID', 'Description', 'State', 'Remediation'])
for result in report['results']:
    for check in result.get('checks', []):
        writer.writerow([
            check.get('id', ''),
            check.get('description', ''),
            check.get('state', ''),
            check.get('remediation', '')
        ])
" > cis-report.csv
```

## Step 7: Automated Scanning Best Practices

```yaml
# scheduled-scan.yaml - Configure a daily CIS scan
apiVersion: cis.cattle.io/v1
kind: ClusterScan
metadata:
  name: daily-cis-scan
spec:
  # Replace this with a profile from 'kubectl get clusterscanprofile'
  scanProfileName: "<clusterscanprofile-name>"
  scheduledScanConfig:
    # Run scan at midnight every day
    cronSchedule: "0 0 * * *"
    # Keep last 5 scan reports
    retentionCount: 5
```

```bash
kubectl apply -f scheduled-scan.yaml
```

## Conclusion

Running CIS scans in Rancher provides a quick, automated way to assess your Kubernetes cluster's security posture against industry-standard benchmarks. By regularly scanning your clusters and tracking the results over time, you can ensure continuous compliance and quickly identify new security misconfigurations. The next step is to create custom scan profiles tailored to your organization's specific security requirements.
