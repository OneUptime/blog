# How to Schedule Recurring CIS Scans in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, CIS, Security, Compliance, Automation

Description: Learn how to configure recurring CIS benchmark scans in Rancher to continuously monitor your Kubernetes cluster security posture on a schedule.

Continuous compliance monitoring requires running CIS scans regularly, not just on-demand. Rancher Compliance supports scheduled scans using cron expressions, enabling automated security compliance checks that run daily, weekly, or on any custom schedule. This guide covers how to set up and manage recurring CIS scans.

## Prerequisites

- Rancher with Compliance installed
- Cluster Owner or global administrator permissions in Rancher
- Understanding of cron expressions
- `rancher-monitoring` installed with receivers and routes configured (optional, for alerts)

## Step 1: Configure a Scheduled Scan via Rancher UI

1. Navigate to your cluster in the Rancher UI
2. Go to **Compliance** → **Scan**
3. Click **Create**
4. Choose a cluster scan profile
5. Turn on **Run scan on a schedule**
6. Configure the cron schedule:
   - **Daily at midnight**: `0 0 * * *`
   - **Weekly on Monday at 2 AM**: `0 2 * * 1`
   - **Every 6 hours**: `0 */6 * * *`
7. Set the **Retention Count** (how many reports to keep)
8. Click **Create**

## Step 2: Configure a Scheduled Scan via kubectl

```yaml
# daily-compliance-scan.yaml - Run a compliance scan daily at midnight

apiVersion: compliance.cattle.io/v1
kind: ClusterScan
metadata:
  name: daily-compliance-scan
spec:
  scanProfileName: cis-1.12-profile
  scheduledScanConfig:
    # Run at midnight every day
    cronSchedule: "0 0 * * *"
    # Keep the last 7 reports
    retentionCount: 7
```

```bash
kubectl apply -f daily-compliance-scan.yaml

# Verify the scheduled scan was created
kubectl describe clusterscans.compliance.cattle.io daily-compliance-scan
```

## Step 3: Configure Multiple Scan Schedules

Run different scans at different frequencies. Rancher runs only one compliance scan at a time per cluster, so overlapping scans queue until the active scan finishes:

```yaml
# hourly-compliance-scan.yaml - Frequent recurring cluster-wide scan
apiVersion: compliance.cattle.io/v1
kind: ClusterScan
metadata:
  name: hourly-compliance-scan
spec:
  scanProfileName: cis-1.12-profile
  scheduledScanConfig:
    # Run every hour
    cronSchedule: "0 * * * *"
    retentionCount: 24
---
# weekly-compliance-scan.yaml - Comprehensive weekly scan
apiVersion: compliance.cattle.io/v1
kind: ClusterScan
metadata:
  name: weekly-compliance-scan
spec:
  scanProfileName: cis-1.12-profile
  scheduledScanConfig:
    # Run every Sunday at 1 AM
    cronSchedule: "0 1 * * 0"
    retentionCount: 52
```

## Step 4: Monitor Scheduled Scan Execution

```bash
# List all cluster scans and their last run time
kubectl get clusterscans.compliance.cattle.io

# Check the next scheduled run time
kubectl get clusterscans.compliance.cattle.io daily-compliance-scan \
  -o jsonpath='{.status.NextScanAt}'

# View the last scan run time
kubectl get clusterscans.compliance.cattle.io daily-compliance-scan \
  -o jsonpath='{.status.lastRunTimestamp}'

# Check scan history
kubectl get clusterscanreports.compliance.cattle.io --sort-by='.metadata.creationTimestamp'
```

## Step 5: Set Up Alerts for Scheduled Scans

Configure notifications when scheduled scans complete or fail:

```bash
# First, enable alerts in the rancher-compliance chart:
# alerts:
#   enabled: true
#
# Then configure receivers and routes in rancher-monitoring.

# Enable alerting on the scheduled scan
kubectl apply -f - <<EOF
apiVersion: compliance.cattle.io/v1
kind: ClusterScan
metadata:
  name: daily-compliance-scan
spec:
  scanProfileName: cis-1.12-profile
  scheduledScanConfig:
    cronSchedule: "0 0 * * *"
    retentionCount: 7
    scanAlertRule:
      alertOnComplete: true
      alertOnFailure: true
EOF
```

## Step 6: Automate Remediation Tracking

```bash
# Create a script to compare consecutive scan results
cat > /tmp/compare-scans.sh << 'EOF'
#!/bin/bash
# Compare two CIS scan reports and show regressions

REPORT1=$1
REPORT2=$2

echo "=== CIS Scan Comparison ==="
echo "Previous: $REPORT1"
echo "Current: $REPORT2"
echo ""

# Get non-passing checks from each report
FAILS1=$(kubectl get clusterscanreports.compliance.cattle.io "$REPORT1" -o json | \
  python3 -c "
import json,sys
outer=json.load(sys.stdin)
r=json.loads(outer['spec']['reportJSON'])
fails=set()
for result in r.get('results',[]):
    for check in result.get('checks',[]):
        if check.get('state') in {'fail','mixed','warn'}:
            fails.add(check['id'])
print('\n'.join(sorted(fails)))
")

FAILS2=$(kubectl get clusterscanreports.compliance.cattle.io "$REPORT2" -o json | \
  python3 -c "
import json,sys
outer=json.load(sys.stdin)
r=json.loads(outer['spec']['reportJSON'])
fails=set()
for result in r.get('results',[]):
    for check in result.get('checks',[]):
        if check.get('state') in {'fail','mixed','warn'}:
            fails.add(check['id'])
print('\n'.join(sorted(fails)))
")

echo "=== New Failures (regressions) ==="
comm -13 <(echo "$FAILS1" | sort) <(echo "$FAILS2" | sort)

echo ""
echo "=== Fixed Issues ==="
comm -23 <(echo "$FAILS1" | sort) <(echo "$FAILS2" | sort)
EOF

chmod +x /tmp/compare-scans.sh
```

## Step 7: Integrate with CI/CD Pipeline

```yaml
# .github/workflows/cis-scan.yaml - GitHub Actions workflow to trigger scans
name: CIS Compliance Check

on:
  push:
    branches: [main]
  schedule:
    # Also run on a schedule
    - cron: '0 2 * * *'

jobs:
  cis-scan:
    runs-on: ubuntu-latest
    steps:
    - name: Trigger Compliance Scan
      run: |
        # Trigger a new scan through Rancher's downstream cluster Kubernetes API proxy
        curl -X POST \
          -H "Authorization: Bearer ${{ secrets.RANCHER_TOKEN }}" \
          -H "Content-Type: application/json" \
          "${{ secrets.RANCHER_URL }}/k8s/clusters/${{ secrets.RANCHER_CLUSTER_ID }}/apis/compliance.cattle.io/v1/clusterscans" \
          -d '{
            "apiVersion": "compliance.cattle.io/v1",
            "kind": "ClusterScan",
            "metadata": {"generateName": "ci-scan-"},
            "spec": {
              "scanProfileName": "cis-1.12-profile"
            }
          }'
```

## Conclusion

Scheduling recurring CIS scans in Rancher provides continuous visibility into your cluster's security posture. By combining automated scans with alerting and automated remediation tracking, you can maintain a proactive security stance and quickly identify when new configuration changes introduce compliance violations. Regular scans are a key component of any mature security and compliance program for Kubernetes environments.
