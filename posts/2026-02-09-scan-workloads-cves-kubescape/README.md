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

The operator deploys several components including the scanner, storage, and gateway for receiving scan results.

## Running Your First Vulnerability Scan

Scan all workloads in a namespace:

```bash
# Install Kubescape CLI
curl -s https://raw.githubusercontent.com/kubescape/kubescape/master/install.sh | /bin/bash

# Scan a specific namespace for vulnerabilities
kubescape scan --format json --output results.json \
  --include-namespaces production

# View summary of findings
kubescape scan --format pretty-printer \
  --include-namespaces production | less
```

The scan examines all container images in running pods, analyzing them for known CVEs. Results show vulnerability severity, affected packages, and available fixes.

## Understanding Scan Results

Kubescape categorizes vulnerabilities by severity:

```bash
# Scan and filter by severity
kubescape scan --severity-threshold critical \
  --include-namespaces production

# Export detailed CVE report
kubescape scan --format json --output cve-report.json \
  --include-namespaces production

# Parse critical CVEs from JSON report
jq '.results[] | select(.severity == "Critical")' cve-report.json
```

Each vulnerability includes:
- CVE identifier
- Affected package and version
- Fixed version (if available)
- CVSS score
- Exploit availability

## Configuring Continuous Scanning

Set up scheduled scans that run automatically:

```yaml
# Create scan schedule ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubescape-scheduler
  namespace: kubescape
data:
  config.json: |
    {
      "scan": {
        "scanSchedule": "0 2 * * *",
        "namespaces": ["production", "staging"],
        "frameworks": ["NSA", "MITRE"],
        "vulnerabilityScan": {
          "enabled": true,
          "schedule": "0 */6 * * *"
        }
      }
    }
```

This configuration runs vulnerability scans every 6 hours and full security scans daily at 2 AM. Apply the configuration:

```bash
kubectl apply -f kubescape-scheduler.yaml

# Trigger immediate scan
kubectl exec -n kubescape deployment/kubescape-operator -- \
  kubescape scan --enable-host-scan --verbose
```

## Scanning Specific Workloads

Target individual deployments, daemonsets, or statefulsets:

```bash
# Scan a specific deployment
kubescape scan workload deployment/web-app -n production

# Scan all workloads with a label
kubescape scan --include-labels app=frontend

# Scan only images from specific registry
kubescape scan --include-image-registry gcr.io/myproject
```

This focused scanning helps when investigating specific security concerns or validating fixes.

## Excluding Known False Positives

Not all CVEs are exploitable in your environment. Create exceptions for false positives:

```yaml
# exceptions.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubescape-exceptions
  namespace: kubescape
data:
  exceptions.json: |
    {
      "exceptions": [
        {
          "name": "CVE-2023-12345-false-positive",
          "policyName": "C-0050",
          "resources": [
            {
              "kind": "Deployment",
              "name": "web-app",
              "namespace": "production"
            }
          ],
          "justification": "Package not used in production code path"
        }
      ]
    }
```

Apply exceptions:

```bash
kubectl apply -f exceptions.yaml

# Verify exceptions are loaded
kubectl get configmap kubescape-exceptions -n kubescape -o yaml
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
      - uses: actions/checkout@v3

      - name: Install Kubescape
        run: |
          curl -s https://raw.githubusercontent.com/kubescape/kubescape/master/install.sh | /bin/bash

      - name: Scan Kubernetes manifests
        run: |
          kubescape scan *.yaml \
            --severity-threshold high \
            --fail-threshold 0

      - name: Upload scan results
        uses: actions/upload-artifact@v3
        with:
          name: kubescape-results
          path: results.json
```

This prevents deploying workloads with critical vulnerabilities.

## Setting Up Alerting

Configure alerts for newly discovered CVEs:

```yaml
# Alert configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubescape-alerts
  namespace: kubescape
data:
  alerts.json: |
    {
      "alerts": {
        "vulnerabilities": {
          "enabled": true,
          "severity": ["Critical", "High"],
          "webhooks": [
            {
              "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
              "headers": {
                "Content-Type": "application/json"
              }
            }
          ]
        }
      }
    }
```

You'll receive notifications when scans detect new critical or high-severity CVEs in running workloads.

## Generating Compliance Reports

Create reports showing CVE status across your cluster:

```bash
# Generate PDF compliance report
kubescape scan --format pdf --output security-report.pdf \
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
kubectl exec -n kubescape deployment/kubescape-storage -- \
  curl -s http://localhost:8080/v1/scans | jq '.scans[] | {date, criticalCount}'

# Export metrics to Prometheus
helm upgrade kubescape kubescape/kubescape-operator \
  --namespace kubescape \
  --reuse-values \
  --set prometheus.enabled=true
```

Monitor these Prometheus metrics:
- `kubescape_vulnerabilities_total` - Total CVEs by severity
- `kubescape_vulnerability_age_days` - How long CVEs have existed
- `kubescape_fixable_vulnerabilities` - CVEs with available patches

## Remediating Vulnerabilities

When scans find CVEs, follow this workflow:

```bash
# Get detailed CVE information
kubescape scan deployment/web-app -n production --format json | \
  jq '.results[] | select(.severity == "Critical") | {cve, package, fixVersion}'

# Example output:
# {
#   "cve": "CVE-2023-45678",
#   "package": "openssl",
#   "fixVersion": "1.1.1w"
# }

# Update base image or dependencies to fixed version
# Rebuild and redeploy the image

# Verify fix with new scan
kubescape scan deployment/web-app -n production --format json | \
  jq '.results[] | select(.cve == "CVE-2023-45678")'
```

Prioritize fixing critical and high-severity CVEs with known exploits. Track remediation progress with tickets linked to CVE identifiers.

## Scanning Node Host Systems

Kubescape can also scan the host OS running your Kubernetes nodes:

```bash
# Enable host scanning
helm upgrade kubescape kubescape/kubescape-operator \
  --namespace kubescape \
  --reuse-values \
  --set capabilities.nodeScan=enable

# Trigger host scan
kubescape scan --enable-host-scan --format json
```

This detects vulnerabilities in the node's operating system, kernel, and system packages that could affect container security.

## Best Practices for CVE Scanning

Scan frequently but not excessively. Every 6 hours catches new CVEs quickly without overwhelming your cluster. Focus on critical and high-severity vulnerabilities first, as these pose the greatest risk. Use severity thresholds to filter noise from low-priority issues.

Integrate scanning into your deployment pipeline to prevent introducing new vulnerabilities. Combine CVE scanning with configuration analysis for comprehensive security coverage. Keep your Kubescape operator updated to ensure access to the latest vulnerability databases.

Document exceptions thoroughly with business justification for why certain CVEs are acceptable in your environment. Set up alerting for new critical findings but avoid alert fatigue by properly tuning thresholds.

## Performance Considerations

Vulnerability scanning is resource-intensive. Consider these optimization strategies:

```bash
# Limit concurrent scans to reduce cluster load
helm upgrade kubescape kubescape/kubescape-operator \
  --namespace kubescape \
  --reuse-values \
  --set scanner.maxConcurrentScans=3

# Cache image layers to speed up repeated scans
helm upgrade kubescape kubescape/kubescape-operator \
  --namespace kubescape \
  --reuse-values \
  --set scanner.cacheEnabled=true \
  --set scanner.cacheSize=10Gi
```

Schedule heavy scans during off-peak hours to minimize impact on production workloads.

## Conclusion

Kubescape provides comprehensive vulnerability scanning for running Kubernetes workloads, helping you maintain security posture as new CVEs emerge. By continuously scanning production clusters, you can detect and remediate vulnerabilities before they're exploited.

Start with scheduled scans of critical namespaces, then expand coverage and integrate with CI/CD pipelines. Combine CVE scanning with configuration analysis and runtime security for defense in depth. Regular scanning and prompt remediation keep your Kubernetes clusters secure against known vulnerabilities.

The operator-based deployment makes continuous scanning straightforward to implement and maintain, giving you ongoing visibility into your cluster's security status without manual intervention.
