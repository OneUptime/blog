# How to Set Up Image Scanning in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Security, Image Scanning

Description: Learn how to set up container image vulnerability scanning in Rancher-managed clusters using Trivy and other scanning tools.

Container images can contain known vulnerabilities in their base OS packages, language libraries, and application dependencies. Scanning images before and during deployment helps you identify and mitigate these risks. This guide covers setting up image scanning in Rancher-managed clusters.

## Prerequisites

- A Rancher-managed Kubernetes cluster
- kubectl access with admin privileges
- Helm 3 installed
- A container registry accessible from the cluster

## Step 1: Deploy Trivy as a Vulnerability Scanner

Trivy is an open-source vulnerability scanner that integrates well with Kubernetes. Install it using Helm:

```bash
helm repo add aquasecurity https://aquasecurity.github.io/helm-charts/
helm repo update

helm install trivy-operator aquasecurity/trivy-operator \
  -n trivy-system \
  --create-namespace \
  --set trivy.ignoreUnfixed=true
```

Verify the installation:

```bash
kubectl get pods -n trivy-system
```

## Step 2: Configure Trivy Operator for Automatic Scanning

The Trivy Operator automatically scans workloads running in the cluster and generates VulnerabilityReport resources.

Configure scan settings:

```bash
kubectl patch cm trivy-operator -n trivy-system --type merge \
  -p '{"data":{"scanJob.tolerations":"[]","vulnerabilityReports.scanner":"Trivy","configAuditReports.scanner":"Trivy"}}'

kubectl patch cm trivy-operator-trivy-config -n trivy-system --type merge \
  -p '{"data":{"trivy.severity":"CRITICAL,HIGH,MEDIUM","trivy.timeout":"10m0s"}}'
```

## Step 3: View Vulnerability Reports

After the operator scans your workloads, view the results:

```bash
kubectl get vulnerabilityreports -A
```

Get detailed results for a specific workload:

```bash
kubectl get vulnerabilityreport -n production \
  -l trivy-operator.resource.name=my-deployment -o yaml
```

Summarize vulnerabilities across the cluster:

```bash
kubectl get vulnerabilityreports -A -o json | \
  jq '[.items[].report.vulnerabilities[]?.severity] | group_by(.) | map({(.[0]): length}) | add'
```

## Step 4: Scan Images Before Deployment

Install the Trivy CLI on your workstation or CI/CD pipeline:

```bash
# Install Trivy CLI

curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
```

Scan an image before deploying:

```bash
trivy image nginx:1.25
trivy image --severity HIGH,CRITICAL your-registry/your-app:latest
```

Integrate into CI/CD pipelines:

```yaml
# GitLab CI example
scan_image:
  stage: security
  image:
    name: aquasec/trivy:latest
    entrypoint: [""]
  script:
    - trivy image --exit-code 1 --severity HIGH,CRITICAL $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

## Step 5: Set Up Admission Control for Image Scanning

Trivy Operator does not provide a built-in admission controller that blocks pods based on vulnerability severity. Use Trivy Operator to generate `VulnerabilityReport` resources, and add a separate Kubernetes admission policy layer if you need deployment-time enforcement.

## Step 6: Configure Private Registry Scanning

If your images are in a private registry, configure an image pull secret in the workload namespace:

```bash
kubectl create secret docker-registry registry-creds \
  -n production \
  --docker-server=your-registry.example.com \
  --docker-username=scanner \
  --docker-password=YOUR_PASSWORD
```

Reference that secret from the workload or its ServiceAccount. With the default configuration, Trivy Operator will reuse image pull secrets referenced by the workload:

```yaml
spec:
  template:
    spec:
      imagePullSecrets:
        - name: registry-creds
```

## Step 7: Monitor Scanning Results in Rancher

View scan results through the Rancher UI by exploring the cluster's custom resources, including `VulnerabilityReport`. Rancher can display Kubernetes custom resources and CRDs in the cluster UI. You can also expose Trivy metrics to Prometheus and Grafana:

```bash
helm upgrade trivy-operator aquasecurity/trivy-operator \
  -n trivy-system \
  --reuse-values \
  --set serviceMonitor.enabled=true \
  --set service.headless=false
```

Then import the published Trivy Operator Grafana dashboard with ID `17813`.

## Step 8: Set Up Alerting for Critical Vulnerabilities

If Rancher Monitoring is installed in `cattle-monitoring-system`, create alerts when critical vulnerabilities are detected:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: trivy-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
  - name: image-scanning
    rules:
    - alert: CriticalVulnerabilityFound
      expr: |
        trivy_image_vulnerabilities{severity="Critical"} > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Critical vulnerability found in image {{ $labels.image_repository }}"
    - alert: HighVulnerabilityCount
      expr: |
        trivy_image_vulnerabilities{severity="High"} > 10
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "More than 10 high vulnerabilities in {{ $labels.image_repository }}"
```

## Step 9: Generate Compliance Reports

Export vulnerability data for compliance reporting:

```bash
# Export all vulnerability reports as JSON
kubectl get vulnerabilityreports -A -o json > vulnerability-report.json

# Generate a summary report
kubectl get vulnerabilityreports -A -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.labels.trivy-operator\\.resource\\.name,\
CRITICAL:.report.summary.criticalCount,\
HIGH:.report.summary.highCount,\
MEDIUM:.report.summary.mediumCount
```

## Step 10: Schedule Regular Full Scans

Configure the operator to expire and regenerate vulnerability reports periodically:

```bash
helm upgrade trivy-operator aquasecurity/trivy-operator \
  -n trivy-system \
  --reuse-values \
  --set operator.scanJobTimeout=15m \
  --set operator.scanJobsConcurrentLimit=3 \
  --set operator.scannerReportTTL=24h
```

When a report expires, the operator recreates it and triggers a fresh scan.

## Best Practices

- Scan images in your CI/CD pipeline before pushing to the registry.
- If you need enforcement, pair image scanning with a separate admission policy engine.
- Regularly update the vulnerability database for accurate scanning.
- Set up alerts for newly discovered critical vulnerabilities.
- Maintain a vulnerability remediation SLA (e.g., critical within 24 hours, high within 7 days).
- Use image signing and verification to ensure only scanned images are deployed.

## Conclusion

Container image scanning is a critical component of Kubernetes security. By deploying the Trivy Operator in your Rancher-managed clusters, scanning images in CI/CD pipelines, and, where needed, enforcing separate admission policies, you can detect and reduce the risk of vulnerable images running in production. Combined with monitoring and alerting, image scanning provides continuous visibility into your application security posture.
