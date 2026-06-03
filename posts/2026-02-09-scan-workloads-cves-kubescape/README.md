# How to Scan Running Kubernetes Workloads for CVEs with Kubescape

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Vulnerability-Scanning

Description: Learn how to use Kubescape to continuously scan running Kubernetes workloads for CVEs, misconfigurations, and security risks in production clusters.

---

Security scanning shouldn't stop after deploying containers to Kubernetes. New vulnerabilities are discovered daily, and images that were clean at deployment time may contain critical CVEs weeks later. Kubescape is an open-source security platform that scans running Kubernetes workloads for vulnerabilities, misconfigurations, and compliance violations directly in your cluster.

This guide will show you how to deploy Kubescape and configure continuous vulnerability scanning for your production workloads.

## Understanding Kubescape Capabilities

Kubescape goes beyond simple image scanning. It analyzes your entire Kubernetes security posture including container images, Kubernetes configurations, RBAC policies, and network settings. The tool uses multiple security frameworks including NSA-CISA guidelines, MITRE ATT&CK, and CIS Kubernetes Benchmark.

For CVE scanning specifically, Kubescape integrates with vulnerability databases to detect known security issues in both OS packages and application dependencies. Unlike registry-based scanning, Kubescape scans images actually running in your cluster, ensuring you know exactly what's deployed.

## Installing Kubescape Operator

The Kubescape operator runs continuously in your cluster, performing scheduled scans and reporting results to a dashboard or external systems:

```bash
# Install using Helm

helm repo add kubescape https://kubescape.github.io/helm-charts/
helm repo update

# Install with vulnerability scanning enabled
helm install kubescape kubescape/kubescape-operator \
  --namespace kubescape \
  --create-namespace \
  --set clusterName="production-cluster" \
  --set capabilities.vulnerabilityScan=enable \
  --set capabilities.continuousScan=enable
```

Verify the installation:

```bash
# Check operator pods are running
kubectl get pods -n kubescape

# View operator logs
kubectl logs -n kubescape deployment/kubescape-operator
```

The operator deploys several components including the Kubescape scanner, Kubevuln vulnerability scanner, storage, and synchronizer for exposing and exporting scan results.

## Running Your First Vulnerability Scan

Scan all workloads in a namespace:

```bash
# Install Kubescape CLI
curl -s https://raw.githubusercontent.com/kubescape/kubescape/master/install.sh | /bin/bash

# Scan a specific namespace for vulnerabilities
kubescape scan --format json --output results.json \
  --include-namespaces production \
  --scan-images

# View summary of findings
kubescape scan --format pretty-printer \
  --include-namespaces production \
  --scan-images | less
```

The scan examines all container images in running pods, analyzing them for known CVEs. Results show vulnerability severity, affected packages, and available fixes.

## Understanding Scan Results

Kubescape categorizes vulnerabilities by severity:

```bash
# Scan and filter by severity
kubescape scan --severity-threshold critical \
  --include-namespaces production \
  --scan-images

# Export detailed CVE report
kubescape scan --format json --output cve-report.json \
  --include-namespaces production \
  --scan-images

# View critical vulnerability summaries from operator results
kubectl get vulnerabilitymanifestsummaries -n production -o json | \
  jq '.items[] | select(.spec.severities.critical.all > 0) | {name: .metadata.name, critical: .spec.severities.critical.all}'
```

Each vulnerability includes:
- CVE identifier
- Affected package and version
- Fixed version (if available)
- CVSS score
- Link to the full vulnerability manifest

## Configuring Continuous Scanning

Set up scheduled scans that run automatically:

```bash
# Configure recurring image vulnerability scanning
helm upgrade kubescape kubescape/kubescape-operator \
  --namespace kubescape \
  --reuse-values \
  --set kubevulnScheduler.scanSchedule="0 */6 * * *"

# Keep continuous configuration scanning enabled
helm upgrade kubescape kubescape/kubescape-operator \
  --namespace kubescape \
  --reuse-values \
  --set capabilities.continuousScan=enable
```

This configuration runs recurring vulnerability scans every 6 hours and keeps continuous configuration scanning enabled. Confirm the configuration:

```bash
# Confirm the vulnerability scanner schedule
kubectl get cronjob -n kubescape kubevuln-scheduler

# Run an immediate CLI scan when you need an on-demand result
kubescape scan --include-namespaces production --scan-images --verbose
```

## Scanning Specific Workloads

Target individual deployments, daemonsets, or statefulsets:

```bash
# Scan a specific deployment
kubescape scan workload deployment/web-app -n production

# Scan all workloads in a namespace
kubescape scan --include-namespaces production --scan-images

# Scan a specific image from a registry
kubescape scan image gcr.io/myproject/web-app:1.2.3
```

This focused scanning helps when investigating specific security concerns or validating fixes.

## Excluding Known False Positives

Not all findings are exploitable in your environment. Create exceptions for accepted posture risks:

```json
[
  {
    "name": "accepted-risk-web-app-control",
    "policyType": "postureExceptionPolicy",
    "actions": [
      "alertOnly"
    ],
    "resources": [
      {
        "designatorType": "Attributes",
        "attributes": {
          "kind": "Deployment",
          "name": "web-app",
          "namespace": "production"
        }
      }
    ],
    "posturePolicies": [
      {
        "controlID": "C-0050"
      }
    ]
  }
]
```

Use exceptions during a CLI scan:

```bash
kubescape scan --exceptions exceptions.json \
  --include-namespaces production
```

## Integrating with CI/CD Pipelines

Shift left by scanning in CI/CD before deployment:

```yaml
# GitHub Actions example
name: Kubernetes Security Scan
on: [push, pull_request]

jobs:
  kubescape-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Install Kubescape
        run: |
          curl -s https://raw.githubusercontent.com/kubescape/kubescape/master/install.sh | /bin/bash

      - name: Scan Kubernetes manifests
        run: |
          kubescape scan *.yaml \
            --severity-threshold high \
            --scan-images \
            --format json \
            --output results.json

      - name: Upload scan results
        uses: actions/upload-artifact@v7
        with:
          name: kubescape-results
          path: results.json
```

This prevents deploying workloads with critical vulnerabilities.

## Setting Up Alerting

Configure alerts for newly discovered CVEs from the Prometheus metrics produced by the Kubescape exporter:

```yaml
# PrometheusRule example for Kubescape vulnerability metrics
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: kubescape-vulnerability-alerts
  namespace: monitoring
spec:
  groups:
    - name: kubescape-vulnerabilities
      rules:
        - alert: KubescapeCriticalVulnerabilities
          expr: kubescape_vulnerabilities_total_cluster_critical > 0
          for: 15m
          labels:
            severity: critical
          annotations:
            summary: Critical vulnerabilities detected by Kubescape
```

Route the alert through Alertmanager to Slack, PagerDuty, or your existing incident channel.

## Generating Compliance Reports

Create reports showing CVE status across your cluster:

```bash
# Generate PDF compliance report
kubescape scan framework NSA --format pdf --output security-report.pdf \
  --compliance-threshold 80

# Generate SARIF format for GitHub Security tab
kubescape scan --format sarif --output results.sarif

# Upload to GitHub (if running in Actions)
# Results appear in Security > Code scanning alerts
```

Reports help demonstrate security posture to auditors and stakeholders.

## Monitoring Scan History

Track vulnerability trends over time:

```bash
# Query Kubescape storage for historical scans
kubectl get vulnerabilitymanifestsummaries -A -o json | \
  jq '.items[] | {namespace: .metadata.namespace, name: .metadata.name, critical: .spec.severities.critical.all, high: .spec.severities.high.all}'

# Export metrics to Prometheus
helm upgrade kubescape kubescape/kubescape-operator \
  --namespace kubescape \
  --reuse-values \
  --set capabilities.prometheusExporter=enable
```

Monitor these Prometheus metrics:
- `kubescape_vulnerabilities_total_cluster_critical` - Total critical CVEs in the cluster
- `kubescape_vulnerabilities_total_namespace_high` - Total high CVEs by namespace
- `kubescape_vulnerabilities_total_workload_critical` - Total critical CVEs by workload
- Node-agent metrics such as `node_agent_alert_counter` when runtime detection is enabled

## Remediating Vulnerabilities

When scans find CVEs, follow this workflow:

```bash
# Get detailed CVE information
kubescape scan workload deployment/web-app -n production --format json | \
  jq '.. | objects | select(.severity? == "Critical") | {id: .id, package: .package, fixVersion: .fixVersion}'

# Example output:
# {
#   "id": "CVE-2023-45678",
#   "package": "openssl",
#   "fixVersion": "1.1.1w"
# }

# Update base image or dependencies to fixed version
# Rebuild and redeploy the image

# Verify fix with new scan
kubescape scan workload deployment/web-app -n production --format json | \
  jq '.. | objects | select(.id? == "CVE-2023-45678")'
```

Prioritize fixing critical and high-severity CVEs with known exploits. Track remediation progress with tickets linked to CVE identifiers.

## Scanning Node Host Systems

Kubescape can also run host-scanner-backed controls that inspect node and kubelet configuration:

```bash
# Enable host scanning
helm upgrade kubescape kubescape/kubescape-operator \
  --namespace kubescape \
  --reuse-values \
  --set capabilities.nodeScan=enable

# Trigger host scan
kubescape scan --format json --output node-controls.json
```

This supports controls that require node-level data, such as kubelet configuration checks.

## Best Practices for CVE Scanning

Scan frequently but not excessively. Every 6 hours catches new CVEs quickly without overwhelming your cluster. Focus on critical and high-severity vulnerabilities first, as these pose the greatest risk. Use severity thresholds to filter noise from low-priority issues.

Integrate scanning into your deployment pipeline to prevent introducing new vulnerabilities. Combine CVE scanning with configuration analysis for comprehensive security coverage. Keep your Kubescape operator updated to ensure access to the latest vulnerability databases.

Document exceptions thoroughly with business justification for why certain CVEs are acceptable in your environment. Set up alerting for new critical findings but avoid alert fatigue by properly tuning thresholds.

## Performance Considerations

Vulnerability scanning is resource-intensive. Consider these optimization strategies:

```bash
# Reduce cluster load by spacing out recurring vulnerability scans
helm upgrade kubescape kubescape/kubescape-operator \
  --namespace kubescape \
  --reuse-values \
  --set kubevulnScheduler.scanSchedule="0 2 * * *"

# Bound long-running CLI scans
kubescape scan --scan-timeout 30m --scan-images
```

Schedule heavy scans during off-peak hours to minimize impact on production workloads.

## Conclusion

Kubescape provides comprehensive vulnerability scanning for running Kubernetes workloads, helping you maintain security posture as new CVEs emerge. By continuously scanning production clusters, you can detect and remediate vulnerabilities before they're exploited.

Start with scheduled scans of critical namespaces, then expand coverage and integrate with CI/CD pipelines. Combine CVE scanning with configuration analysis and runtime security for defense in depth. Regular scanning and prompt remediation keep your Kubernetes clusters secure against known vulnerabilities.

The operator-based deployment makes continuous scanning straightforward to implement and maintain, giving you ongoing visibility into your cluster's security status without manual intervention.
