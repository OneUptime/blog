# How to Implement Security Benchmarking with Kubescape

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubescape, Kubernetes, Security, Compliance, NSA, MITRE ATT&CK, CIS Benchmark

Description: Learn how to implement comprehensive security benchmarking in Kubernetes using Kubescape. This guide covers scanning, compliance frameworks, CI/CD integration, and continuous monitoring.

---

> Kubescape is an open-source Kubernetes security platform that scans clusters, YAML manifests, and Helm charts against multiple security frameworks. It provides actionable insights for hardening your Kubernetes security posture.

Kubernetes security involves multiple dimensions: configuration hardening, vulnerability management, compliance with industry standards, and runtime protection. Kubescape addresses these through comprehensive scanning against frameworks like NSA/CISA, MITRE ATT&CK, and CIS Benchmarks.

---

## Understanding Security Frameworks

Kubescape supports multiple security frameworks:

**NSA/CISA Kubernetes Hardening Guide**: Government recommendations for securing Kubernetes deployments.

**MITRE ATT&CK for Containers**: Maps threats to specific attack techniques, helping prioritize defenses.

**CIS Kubernetes Benchmark**: Industry-standard configuration guidelines with detailed remediation steps.

**SOC 2**: Controls relevant for service organizations.

---

## Prerequisites

Before starting:

- Kubernetes cluster (v1.21+)
- kubectl configured with cluster access
- Helm 3.x (for operator installation)
- CI/CD pipeline access (for integration)

---

## Installing Kubescape CLI

Install the Kubescape CLI for local and CI/CD scanning:

```bash
# Install on Linux/macOS
curl -s https://raw.githubusercontent.com/kubescape/kubescape/master/install.sh | /bin/bash

# Verify installation
kubescape version

# Install via Homebrew (macOS)
brew install kubescape

# Windows (via scoop)
scoop install kubescape
```

---

## Running Your First Scan

Scan your cluster against all supported frameworks:

```bash
# Scan entire cluster against all frameworks
kubescape scan --submit --enable-host-scan

# Scan against specific framework
kubescape scan framework nsa

# Scan against multiple frameworks
kubescape scan framework nsa,mitre,cis-v1.23-t1.0.1

# Scan specific namespace
kubescape scan --include-namespaces production,staging

# Exclude system namespaces
kubescape scan --exclude-namespaces kube-system,kube-public
```

Sample output:

```
+--------------------+------------------+--------------------+---------------+
|    CONTROL NAME    | FAILED RESOURCES | EXCLUDED RESOURCES | ALL RESOURCES |
+--------------------+------------------+--------------------+---------------+
| Privileged pods    |         3        |         0          |      45       |
| Host network       |         2        |         0          |      45       |
| Writable hostPath  |         5        |         0          |      45       |
| Run as root        |        12        |         0          |      45       |
+--------------------+------------------+--------------------+---------------+

Overall compliance score: 72%
```

---

## Scanning YAML Manifests

Scan manifests before deployment:

```bash
# Scan a single file
kubescape scan deployment.yaml

# Scan a directory
kubescape scan ./kubernetes/

# Scan Helm chart
kubescape scan helm-chart/

# Scan with specific framework
kubescape scan framework nsa ./manifests/

# Output to JSON for CI/CD processing
kubescape scan ./manifests/ --format json --output results.json
```

Example CI/CD integration script:

```bash
#!/bin/bash
# scan-manifests.sh
# Scans Kubernetes manifests and fails if compliance is below threshold

MANIFEST_DIR="${1:-.}"
THRESHOLD="${2:-80}"

echo "Scanning manifests in ${MANIFEST_DIR}..."
echo "Compliance threshold: ${THRESHOLD}%"

# Run scan and capture output
RESULT=$(kubescape scan framework nsa,cis-v1.23-t1.0.1 "${MANIFEST_DIR}" \
  --format json \
  --output /tmp/scan-results.json 2>&1)

# Extract compliance score
SCORE=$(jq '.summaryDetails.complianceScore' /tmp/scan-results.json)
SCORE_INT=${SCORE%.*}

echo "Compliance score: ${SCORE}%"

# Check against threshold
if [ "$SCORE_INT" -lt "$THRESHOLD" ]; then
    echo "FAILED: Compliance score ${SCORE}% is below threshold ${THRESHOLD}%"

    # Show failed controls
    echo ""
    echo "Failed controls:"
    jq -r '.results[] | select(.resourcesResult.failedResources > 0) | "\(.controlID): \(.name) - \(.resourcesResult.failedResources) failures"' \
      /tmp/scan-results.json

    exit 1
fi

echo "PASSED: Compliance score meets threshold"
exit 0
```

---

## Installing Kubescape Operator

Deploy Kubescape as an operator for continuous monitoring:

```yaml
# kubescape-values.yaml
# Helm values for Kubescape operator

# Account configuration (optional - for cloud features)
account: "your-account-id"
clusterName: "production-cluster"

# Enable all capabilities
capabilities:
  # Continuous posture scanning
  continuousScan:
    enabled: true
    scheduleTime: "0 */4 * * *"  # Every 4 hours

  # Vulnerability scanning
  vulnerabilityScanning:
    enabled: true
    registry:
      # Scan images from these registries
      include:
      - "docker.io"
      - "gcr.io"
      - "ghcr.io"

  # Runtime detection
  runtimeDetection:
    enabled: true

  # Network policy generation
  networkPolicyService:
    enabled: true

  # Node scanning
  nodeScan:
    enabled: true

# Scanning configuration
scanner:
  # Frameworks to scan against
  frameworks:
  - nsa
  - mitre
  - cis-v1.23-t1.0.1

  # Exclude certain controls
  excludedControls: []

  # Resource limits
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi

# Storage for scan results
storage:
  enabled: true
  storageClassName: standard
  size: 10Gi

# Prometheus metrics
prometheus:
  enabled: true
  serviceMonitor:
    enabled: true
```

Deploy the operator:

```bash
# Add Kubescape Helm repository
helm repo add kubescape https://kubescape.github.io/helm-charts
helm repo update

# Install operator
helm install kubescape kubescape/kubescape-operator \
  --namespace kubescape \
  --create-namespace \
  --values kubescape-values.yaml

# Verify deployment
kubectl get pods -n kubescape

# Check scan status
kubectl get vulnerabilitymanifests -n kubescape
kubectl get configurationscansummaries -n kubescape
```

---

## Understanding Scan Results

Analyze scan results for prioritized remediation:

```bash
# Get detailed control failures
kubescape scan framework nsa --verbose

# Export results for analysis
kubescape scan framework nsa --format json --output results.json

# View specific failed control details
kubescape scan control "C-0002" --verbose
```

Parse results programmatically:

```python
# analyze_results.py
# Analyze Kubescape scan results

import json
import sys

def analyze_results(results_file):
    """Analyze Kubescape scan results and prioritize findings"""

    with open(results_file) as f:
        data = json.load(f)

    print("=== Kubescape Scan Analysis ===\n")

    # Overall score
    score = data.get('summaryDetails', {}).get('complianceScore', 0)
    print(f"Overall Compliance Score: {score:.1f}%\n")

    # Categorize by severity
    critical = []
    high = []
    medium = []
    low = []

    for result in data.get('results', []):
        control_id = result.get('controlID', '')
        name = result.get('name', '')
        failed = result.get('resourcesResult', {}).get('failedResources', 0)
        score_factor = result.get('scoreFactor', 0)

        if failed > 0:
            finding = {
                'id': control_id,
                'name': name,
                'failed': failed,
                'score': score_factor
            }

            # Categorize by score factor
            if score_factor >= 9:
                critical.append(finding)
            elif score_factor >= 7:
                high.append(finding)
            elif score_factor >= 4:
                medium.append(finding)
            else:
                low.append(finding)

    # Print findings by severity
    for severity, findings in [
        ('CRITICAL', critical),
        ('HIGH', high),
        ('MEDIUM', medium),
        ('LOW', low)
    ]:
        if findings:
            print(f"=== {severity} ({len(findings)} issues) ===")
            for f in sorted(findings, key=lambda x: -x['score']):
                print(f"  [{f['id']}] {f['name']}")
                print(f"    Failed resources: {f['failed']}")
            print()

    # Summary
    total = len(critical) + len(high) + len(medium) + len(low)
    print(f"Total issues: {total}")
    print(f"  Critical: {len(critical)}")
    print(f"  High: {len(high)}")
    print(f"  Medium: {len(medium)}")
    print(f"  Low: {len(low)}")

if __name__ == '__main__':
    analyze_results(sys.argv[1] if len(sys.argv) > 1 else 'results.json')
```

---

## CI/CD Integration

Integrate Kubescape into your deployment pipeline:

```yaml
# .github/workflows/security-scan.yaml
name: Kubernetes Security Scan

on:
  pull_request:
    paths:
    - 'kubernetes/**'
    - 'helm/**'
  push:
    branches: [main]

jobs:
  kubescape-scan:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Install Kubescape
      run: |
        curl -s https://raw.githubusercontent.com/kubescape/kubescape/master/install.sh | /bin/bash

    - name: Scan Kubernetes manifests
      run: |
        kubescape scan framework nsa,cis-v1.23-t1.0.1 \
          ./kubernetes/ \
          --format junit \
          --output kubescape-results.xml \
          --compliance-threshold 80

    - name: Upload scan results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: kubescape-results
        path: kubescape-results.xml

    - name: Publish test results
      uses: mikepenz/action-junit-report@v4
      if: always()
      with:
        report_paths: kubescape-results.xml
        fail_on_failure: true

  helm-chart-scan:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Install Kubescape
      run: |
        curl -s https://raw.githubusercontent.com/kubescape/kubescape/master/install.sh | /bin/bash

    - name: Scan Helm charts
      run: |
        for chart in helm/*/; do
          echo "Scanning chart: $chart"
          kubescape scan "$chart" \
            --format sarif \
            --output "${chart}kubescape.sarif"
        done

    - name: Upload SARIF results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: helm/
```

---

## Custom Exception Handling

Configure exceptions for known acceptable deviations:

```yaml
# kubescape-exceptions.yaml
# Exception configuration for Kubescape

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
          "name": "system-privileged-pods",
          "description": "System pods that require privileged access",
          "controls": ["C-0057", "C-0013"],
          "resources": [
            {
              "namespace": "kube-system",
              "kind": "DaemonSet",
              "name": "kube-proxy"
            },
            {
              "namespace": "kube-system",
              "kind": "DaemonSet",
              "name": "calico-node"
            }
          ]
        },
        {
          "name": "monitoring-host-network",
          "description": "Monitoring agents that need host network",
          "controls": ["C-0041"],
          "resources": [
            {
              "namespace": "monitoring",
              "kind": "DaemonSet",
              "name": "node-exporter"
            }
          ]
        },
        {
          "name": "cert-manager-root",
          "description": "cert-manager needs root for certificate management",
          "controls": ["C-0013"],
          "resources": [
            {
              "namespace": "cert-manager",
              "kind": "Deployment",
              "name": "*"
            }
          ]
        }
      ]
    }
```

Apply exceptions in scans:

```bash
# Scan with exceptions file
kubescape scan framework nsa \
  --exceptions exceptions.json

# Scan with inline exception
kubescape scan framework nsa \
  --exclude-namespaces kube-system,cert-manager
```

---

## Monitoring and Alerting

Create Prometheus alerts for security compliance:

```yaml
# kubescape-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: kubescape-alerts
  namespace: monitoring
spec:
  groups:
  - name: kubescape
    rules:
    # Alert on low compliance score
    - alert: KubescapeComplianceLow
      expr: |
        kubescape_compliance_score < 70
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Kubernetes compliance score below threshold"
        description: "Compliance score {{ $value }}% is below 70%"

    # Alert on critical control failures
    - alert: KubescapeCriticalFailure
      expr: |
        kubescape_control_failed{severity="critical"} > 0
      for: 15m
      labels:
        severity: critical
      annotations:
        summary: "Critical security control failing"
        description: "Control {{ $labels.control_name }} has {{ $value }} failures"

    # Alert on increasing failures
    - alert: KubescapeFailuresIncreasing
      expr: |
        increase(kubescape_control_failed[24h]) > 5
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Security failures increasing"
        description: "Security control failures increased by {{ $value }} in 24h"
```

---

## Remediation Examples

Fix common security findings:

```yaml
# secure-deployment.yaml
# Example deployment following security best practices

apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: secure-app
  template:
    metadata:
      labels:
        app: secure-app
    spec:
      # Run as non-root user
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault

      # Use non-root service account
      serviceAccountName: secure-app
      automountServiceAccountToken: false

      containers:
      - name: app
        image: myapp:1.0@sha256:abc123...
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
        ports:
        - containerPort: 8080
          protocol: TCP
        # Writable directories as emptyDir
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /var/cache

      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
```

---

## Conclusion

Kubescape provides comprehensive security benchmarking that helps identify and remediate Kubernetes misconfigurations before they become vulnerabilities. By integrating scans into CI/CD pipelines and running continuous monitoring, you maintain visibility into your security posture.

Start by scanning your cluster to establish a baseline, then focus on critical and high-severity findings. Use exceptions judiciously for legitimate deviations, and track your compliance score over time to measure improvement.

---

*Want complete visibility into your Kubernetes security posture? [OneUptime](https://oneuptime.com) provides monitoring and alerting that integrates with security tools, helping you correlate security findings with application performance and incidents.*
