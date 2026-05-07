# How to Run CIS Benchmark Scans in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Security, CIS Benchmark

Description: Learn how to run CIS Kubernetes Benchmark scans in Rancher to assess and improve the security posture of your clusters.

The CIS (Center for Internet Security) Kubernetes Benchmark provides a set of security recommendations for hardening Kubernetes clusters. Rancher versions that ship the `rancher-cis-benchmark` application include a built-in CIS scanning feature that evaluates your clusters against these benchmarks and reports on compliance. In Rancher v2.12 and later, this capability is documented as `rancher-compliance` under **Compliance** scans. This guide shows you how to run scans and remediate findings.

## Prerequisites

- Rancher v2.10 or v2.11 when using `rancher-cis-benchmark`
- Admin access to Rancher
- A downstream cluster supported by the benchmark profile you plan to use
- A compatible `rancher-cis-benchmark` chart version for your Rancher and Kubernetes versions

## Step 1: Install the CIS Benchmark Application

### Via the Rancher UI

1. Navigate to the downstream cluster where you want to run scans.
2. Go to **Apps** > **Charts**.
3. Search for **CIS Benchmark**.
4. Click **Install**.
5. Accept the default settings or customize the namespace.
6. Click **Install** to deploy.

### Via Helm

```bash
helm repo add rancher-charts https://charts.rancher.io
helm repo update

CHART_VERSION=<compatible-chart-version>

helm install rancher-cis-benchmark-crd rancher-charts/rancher-cis-benchmark-crd \
  -n cis-operator-system \
  --create-namespace \
  --version "${CHART_VERSION}"

helm install rancher-cis-benchmark rancher-charts/rancher-cis-benchmark \
  -n cis-operator-system \
  --version "${CHART_VERSION}"
```

Verify the installation:

```bash
kubectl get pods -n cis-operator-system
```

## Step 2: Run a CIS Benchmark Scan

### Via the Rancher UI

1. In the upper left corner, click ☰ > **Cluster Management**.
2. On the Clusters page, go to the cluster where you want to run a CIS scan and click **Explore**.
3. Click **CIS Benchmark** > **Scan**.
4. Click **Create**.
5. Choose a cluster scan profile. If you choose the default profile, Rancher selects the built-in profile that matches the cluster type and Kubernetes version.
6. Click **Create**.

### Via kubectl

Create a ClusterScan resource:

```yaml
apiVersion: cis.cattle.io/v1
kind: ClusterScan
metadata:
  name: cis-scan-1
spec: {}
```

Apply it:

```bash
kubectl apply -f cis-scan.yaml
```

## Step 3: Monitor Scan Progress

Watch the scan status:

```bash
kubectl get clusterscan cis-scan-1 -o yaml
```

Only one CIS scan runs at a time per cluster. If you create multiple `ClusterScan` resources, Rancher queues the additional scans in the `Pending` state until the active scan finishes. You can also watch progress in the Rancher UI under the CIS Benchmark section.

## Step 4: Review Scan Results

### In the Rancher UI

1. Go to **CIS Benchmark** > **Scan**.
2. On the Scans page, click the completed scan.
3. Review results categorized as:
   - **Pass**: The check passed.
   - **Fail**: The check failed and needs remediation.
   - **Skip**: The check was skipped (not applicable or manually exempted).
   - **Not Applicable**: The check does not apply to this cluster type.

### Via kubectl

```bash
kubectl get clusterscanreports -o yaml
```

Get a summary:

```bash
kubectl get clusterscan cis-scan-1 -o jsonpath='{.status.summary}'
```

## Step 5: Understand Common Failures

Exact control IDs and remediations vary by benchmark version and cluster type. Here are example controls and remediations for Rancher-managed clusters:

### 1.2.6 - Ensure that the --kubelet-certificate-authority argument is set

In RKE2, this is normally configured by default. If it has been overridden, add the kubelet certificate authority back to the API server configuration:

```yaml
# RKE2 config.yaml

kube-apiserver-arg:
  - "kubelet-certificate-authority=/var/lib/rancher/rke2/server/tls/server-ca.crt"
```

### 4.2.6 - Ensure that the --protect-kernel-defaults argument is set to true

On each node, configure RKE2 using its top-level `protect-kernel-defaults` setting:

```yaml
# RKE2 config.yaml
protect-kernel-defaults: true
```

Set the required kernel parameters first:

```bash
cat >> /etc/sysctl.d/90-kubelet.conf << 'EOF'
vm.overcommit_memory=1
vm.panic_on_oom=0
kernel.panic=10
kernel.panic_on_oops=1
EOF

sysctl -p /etc/sysctl.d/90-kubelet.conf
```

### 5.2.2 - Minimize the admission of containers with allowPrivilegeEscalation

On Kubernetes v1.25 and later, use Pod Security Admission / Pod Security Standards instead of PodSecurityPolicy:

```bash
kubectl label --overwrite ns <namespace> \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest
```

## Step 6: Schedule Recurring Scans

Create a scheduled scan to run weekly:

```yaml
apiVersion: cis.cattle.io/v1
kind: ClusterScan
metadata:
  name: weekly-cis-scan
spec:
  scheduledScanConfig:
    cronSchedule: "0 6 * * 1"
    retentionCount: 10
```

Apply it:

```bash
kubectl apply -f weekly-scan.yaml
```

## Step 7: Create Custom Scan Profiles

If certain checks are not applicable to your environment, create a custom profile that skips them:

```yaml
apiVersion: cis.cattle.io/v1
kind: ClusterScanProfile
metadata:
  name: custom-cis-profile
spec:
  benchmarkVersion: cis-1.9
  skipTests:
  - "1.1.20"
  - "1.1.21"
```

Apply the custom profile:

```bash
kubectl apply -f custom-profile.yaml
```

Use it in a scan:

```yaml
apiVersion: cis.cattle.io/v1
kind: ClusterScan
metadata:
  name: custom-scan
spec:
  scanProfileName: custom-cis-profile
```

## Step 8: Export Scan Reports

Export scan results for compliance documentation:

### Via the Rancher UI

1. Go to the completed scan.
2. Click **Download Report** to get a CSV export.

### Via kubectl

```bash
export REPORT="scan-report-name"
kubectl get clusterscanreport "$REPORT" -o json \
  | jq '.spec.reportJSON | fromjson' > cis-report.json
```

## Step 9: Set Up Alerting on Scan Failures

Alerts are supported for scans that run on a schedule. Before enabling them, make sure `rancher-monitoring` is installed and your Receivers and Routes are configured. Then enable alerts on the chart:

```bash
helm upgrade rancher-cis-benchmark rancher-charts/rancher-cis-benchmark \
  -n cis-operator-system \
  --version "${CHART_VERSION}" \
  --set alerts.enabled=true
```

Add alert rules to a scheduled scan:

```yaml
apiVersion: cis.cattle.io/v1
kind: ClusterScan
metadata:
  name: weekly-cis-scan
spec:
  scheduledScanConfig:
    cronSchedule: "0 6 * * 1"
    retentionCount: 10
    scanAlertRule:
      alertOnFailure: true
      alertOnComplete: true
```

## Best Practices

- Run CIS scans before deploying a cluster to production.
- Schedule weekly or monthly recurring scans.
- Create custom profiles to skip checks that are genuinely not applicable, but document why each is skipped.
- Track compliance improvement over time by comparing scan results.
- Integrate scan results into your compliance reporting workflow.
- Remediate critical failures immediately and plan fixes for warnings.

## Conclusion

CIS benchmark scanning in Rancher provides visibility into the security posture of your Kubernetes clusters. By running regular scans, understanding the results, and systematically remediating failures, you can maintain compliance with industry security standards and reduce the risk of security incidents.
