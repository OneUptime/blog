# How to Automate Security Scanning in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Security Scanning, Trivy, Falco, CIS, Kubernetes, Vulnerability Management

Description: Automate security scanning in Rancher using Trivy for container image vulnerabilities, CIS benchmark scanning for cluster hardening, NeuVector for runtime scanning, and integrate findings into...

## Introduction

Security scanning in Rancher must be continuous-new CVEs emerge daily, configurations drift, and new images are deployed constantly. Automating security scanning at multiple layers (images in CI/CD, running containers, cluster configuration) creates a continuous security posture that catches vulnerabilities before they become incidents.

## Step 1: Image Scanning with Trivy Operator

```bash
# Install Trivy Operator for continuous image scanning

helm repo add aqua https://aquasecurity.github.io/helm-charts/
helm install trivy-operator aqua/trivy-operator \
  --namespace trivy-system \
  --create-namespace \
  --set trivy.ignoreUnfixed=true \
  --set operator.scanJobTimeout=5m \
  --set operator.scanJobsConcurrentLimit=10 \
  --set compliance.failEntriesLimit=10
```

```yaml
# Configure scan job template
apiVersion: v1
kind: ConfigMap
metadata:
  name: trivy-operator-trivy-config
  namespace: trivy-system
data:
  scanJob.tolerations: '[{"operator":"Exists"}]'
  # Severity thresholds
  trivy.severity: "MEDIUM,HIGH,CRITICAL"
  # Compliance standards
  compliance.failEntriesLimit: "10"
```

## Step 2: Automated CIS Benchmark Scanning

```yaml
# Schedule weekly compliance scans using the CIS benchmark profile
apiVersion: compliance.cattle.io/v1
kind: ClusterScan
metadata:
  name: weekly-cis
spec:
  scanProfileName: cis-1.10-profile
  scheduledScanConfig:
    cronSchedule: "0 6 * * 0"    # Every Sunday at 6 AM
    retentionCount: 3
```

## Step 3: CI/CD Pipeline Image Scanning

```yaml
# GitHub Actions: scan images before push to registry
name: Container Security Scan
on:
  push:
    paths:
      - 'Dockerfile*'

jobs:
  scan-image:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Run Trivy scan
        uses: aquasecurity/trivy-action@v0.36.0
        with:
          scan-type: 'image'
          image-ref: myapp:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          exit-code: '1'              # Fail build on HIGH/CRITICAL
          ignore-unfixed: true
          severity: 'CRITICAL,HIGH'

      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v4
        if: always()
        with:
          sarif_file: trivy-results.sarif
```

## Step 4: Runtime Security with Falco

```bash
# Install Falco for runtime threat detection
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm install falco falcosecurity/falco \
  --namespace falco-system \
  --create-namespace \
  --set tty=true \
  -f falco-values.yaml
```

```yaml
# falco-values.yaml: custom Falco rules for Rancher environment
customRules:
  rancher-rules.yaml: |-
    # Alert on privilege escalation
    - rule: Privilege Escalation via sudo
      desc: Detect sudo usage in containers
      condition: spawned_process and proc.name = sudo and container
      output: "Privilege escalation in container (user=%user.name cmd=%proc.cmdline)"
      priority: WARNING

    # Alert on sensitive file reads
    - rule: Read Sensitive Files
      desc: Detect reading of certificates and keys
      condition: >
        open_read and fd.name startswith /etc/ssl and
        not proc.name in (nginx, apache2, envoy) and container
      output: "Sensitive file read in container (file=%fd.name user=%user.name)"
      priority: WARNING

    # Alert on network scanning tools
    - rule: Network Scanning Tool Launched
      desc: Detect common network scanning tools started in containers
      condition: spawned_process and container and proc.name in (nmap, masscan, zmap)
      output: "Network scanning tool launched in container (user=%user.name cmd=%proc.cmdline)"
      priority: WARNING
```

## Step 5: Vulnerability Reports Dashboard

```yaml
# Grafana dashboard for vulnerability metrics
# Using Trivy Operator Prometheus metrics

# PrometheusRule for vulnerability alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: vulnerability-alerts
  namespace: trivy-system
spec:
  groups:
    - name: vulnerabilities
      rules:
        - alert: CriticalVulnerabilityDetected
          expr: |
            sum(trivy_image_vulnerabilities{severity="Critical"}) > 0
          for: 0m
          annotations:
            summary: "Critical vulnerability detected in deployed images"
          labels:
            severity: critical

        - alert: HighVulnerabilityCount
          expr: |
            sum(trivy_image_vulnerabilities{severity="High"}) > 20
          for: 1h
          annotations:
            summary: "High vulnerability count exceeds threshold"
          labels:
            severity: warning
```

## Step 6: Automated Remediation

```bash
#!/bin/bash
# auto_remediate.sh - Label pods with critical vulnerabilities for quarantine

# Get pods with critical vulnerabilities
CRITICAL_PODS=$(kubectl get vulnerabilityreports -A -o json | \
  jq -r '.items[]
    | select(.report.summary.criticalCount > 0)
    | select(.metadata.labels["trivy-operator.resource.kind"] == "Pod")
    | "\(.metadata.namespace)/\(.metadata.labels["trivy-operator.resource.name"])"')

for pod_ref in $CRITICAL_PODS; do
  NAMESPACE=$(echo $pod_ref | cut -d'/' -f1)
  POD=$(echo $pod_ref | cut -d'/' -f2)

  echo "CRITICAL vulnerability in pod $POD (namespace: $NAMESPACE)"

  # Add label to quarantine. Pair this with a NetworkPolicy that isolates
  # pods matching security-quarantine=true.
  kubectl label pod "$POD" -n "$NAMESPACE" \
    security-quarantine=true \
    --overwrite

  # Notify security team
  curl -X POST "$SLACK_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"Security quarantine: pod $POD in $NAMESPACE has CRITICAL vulnerabilities\"}"
done
```

## Conclusion

Automated security scanning in Rancher creates continuous visibility into vulnerabilities across the entire Kubernetes environment. Trivy Operator automatically scans deployed workloads as cluster state changes, scheduled compliance scans catch configuration drift, and CI/CD pipeline scanning blocks critical vulnerabilities before deployment. Falco provides runtime threat detection for active attack indicators. Feed all findings into a central dashboard and alert on critical issues immediately-automated remediation (quarantine) for pods with critical CVEs reduces exposure time.
