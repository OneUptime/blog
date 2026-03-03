# How to Set Up Container Image Scanning on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Container Security, Image Scanning, Trivy, Kubernetes

Description: A practical guide to setting up automated container image scanning on Talos Linux using Trivy Operator and other scanning tools in Kubernetes.

---

Container images are one of the most common attack vectors in Kubernetes environments. A single vulnerable library in a base image can expose your entire cluster to exploitation. Running automated image scanning on Talos Linux adds a strong layer of defense to an already hardened platform. While Talos takes care of operating system security with its immutable design, you still need to verify that the containers running on top of it are free from known vulnerabilities.

This guide walks through setting up automated container image scanning on Talos Linux using the Trivy Operator and related tools.

## Why Image Scanning Matters on Talos Linux

Talos Linux provides an extremely secure foundation. The OS is read-only, there is no shell access, and the attack surface is minimal. But the containers you deploy are a different story. They bring their own operating system libraries, language runtimes, and application dependencies. Each of these components could contain vulnerabilities that attackers can exploit.

Image scanning catches these vulnerabilities before they make it into production. By running scans automatically as part of your Kubernetes workflow, you create a continuous security feedback loop that complements Talos Linux's built-in protections.

## Prerequisites

You will need the following:

- A running Talos Linux cluster with kubectl configured
- Helm v3 installed
- Sufficient cluster resources for the scanning operator (at least 512MB RAM)
- Optional: A container registry with webhook support for pre-deployment scanning

## Installing Trivy Operator

The Trivy Operator by Aqua Security is the most popular choice for in-cluster vulnerability scanning. It automatically scans container images in your running workloads and stores the results as Kubernetes custom resources.

```bash
# Add the Aqua Security Helm repository
helm repo add aqua https://aquasecurity.github.io/helm-charts/

# Update the chart cache
helm repo update

# Install the Trivy Operator
helm install trivy-operator \
  aqua/trivy-operator \
  --namespace trivy-system \
  --create-namespace \
  --set trivy.ignoreUnfixed=true \
  --set operator.scanJobTimeout=10m
```

Verify the installation.

```bash
# Check the operator pod
kubectl get pods -n trivy-system

# Verify the CRDs are installed
kubectl get crds | grep aquasecurity

# You should see vulnerabilityreports.aquasecurity.github.io
```

## How the Trivy Operator Works

Once installed, the Trivy Operator watches for new pods and deployments. When it detects a new workload, it creates a scan job that pulls the container image, analyzes it for known vulnerabilities (CVEs), and stores the results as a VulnerabilityReport custom resource.

```bash
# View all vulnerability reports in the cluster
kubectl get vulnerabilityreports -A

# Get a detailed report for a specific workload
kubectl get vulnerabilityreports -n default -o wide

# View the full vulnerability details for a report
kubectl describe vulnerabilityreport -n default <report-name>
```

## Configuring Scan Policies

You can customize what the operator scans and how it reports findings.

```yaml
# trivy-operator-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: trivy-operator-trivy-config
  namespace: trivy-system
data:
  # Skip vulnerabilities without fixes
  trivy.ignoreUnfixed: "true"

  # Set severity threshold
  trivy.severity: "CRITICAL,HIGH,MEDIUM"

  # Scan timeout
  trivy.timeout: "10m0s"

  # Use a mirror for the vulnerability database
  # Useful if your Talos nodes have limited internet access
  trivy.dbRepository: "ghcr.io/aquasecurity/trivy-db"

  # Resource limits for scan jobs
  trivy.resources.requests.cpu: "100m"
  trivy.resources.requests.memory: "256Mi"
  trivy.resources.limits.cpu: "500m"
  trivy.resources.limits.memory: "512Mi"
```

```bash
# Apply the configuration
kubectl apply -f trivy-operator-config.yaml

# Restart the operator to pick up changes
kubectl rollout restart deployment trivy-operator -n trivy-system
```

## Setting Up Pre-Deployment Scanning

For a shift-left approach, scan images before they reach your cluster. You can run Trivy as part of your CI pipeline or as an admission webhook.

```yaml
# admission-webhook.yaml
# Deploy Trivy as a validating webhook
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: image-scan-webhook
webhooks:
  - name: image-scan.security.example.com
    rules:
      - apiGroups: ["apps"]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["deployments", "statefulsets", "daemonsets"]
    clientConfig:
      service:
        name: trivy-webhook
        namespace: trivy-system
        path: "/validate"
    failurePolicy: Fail
    sideEffects: None
    admissionReviewVersions: ["v1"]
```

## Scanning Images in Your CI Pipeline

For teams that want to catch vulnerabilities before images are pushed to a registry, run Trivy in your CI pipeline.

```bash
# Scan a local image during CI build
trivy image --severity CRITICAL,HIGH --exit-code 1 myapp:latest

# Scan with a specific format for CI integration
trivy image --format json --output results.json myapp:latest

# Scan a container image from a registry
trivy image --severity CRITICAL --exit-code 1 registry.example.com/myapp:v1.2.3
```

## Viewing and Acting on Scan Results

The Trivy Operator stores results as Kubernetes resources, making them easy to query and integrate with alerting systems.

```bash
# List all critical vulnerabilities across the cluster
kubectl get vulnerabilityreports -A -o json | \
  jq '.items[] | select(.report.summary.criticalCount > 0) |
  {namespace: .metadata.namespace, name: .metadata.name, critical: .report.summary.criticalCount}'

# Get a summary of vulnerabilities per namespace
kubectl get vulnerabilityreports -A -o json | \
  jq '[.items[] | {namespace: .metadata.namespace, critical: .report.summary.criticalCount, high: .report.summary.highCount}] | group_by(.namespace) | map({namespace: .[0].namespace, total_critical: map(.critical) | add, total_high: map(.high) | add})'
```

## Integrating with Prometheus and Alerting

The Trivy Operator exports metrics that you can scrape with Prometheus.

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: trivy-operator
  namespace: trivy-system
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: trivy-operator
  endpoints:
    - port: metrics
      interval: 60s
```

Create alerts for critical vulnerabilities.

```yaml
# alert-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: trivy-vulnerability-alerts
  namespace: trivy-system
spec:
  groups:
    - name: trivy.rules
      rules:
        - alert: CriticalVulnerabilityDetected
          expr: trivy_image_vulnerabilities{severity="Critical"} > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Critical vulnerability found in image"
            description: "Image {{ $labels.image_repository }}:{{ $labels.image_tag }} has {{ $value }} critical vulnerabilities"
```

## Talos-Specific Considerations

On Talos Linux, the operator runs entirely within Kubernetes, so there are no special OS-level configurations needed. However, keep these points in mind:

- Trivy scan jobs need to pull images, so make sure your Talos network configuration allows access to your container registries
- If you use a private registry, configure image pull secrets in the Trivy Operator configuration
- The vulnerability database needs periodic updates, so outbound internet access from the trivy-system namespace is required

```bash
# Verify the operator can reach the vulnerability database
kubectl logs -n trivy-system -l app.kubernetes.io/name=trivy-operator | grep "database"
```

## Wrapping Up

Container image scanning on Talos Linux closes the gap between OS-level security and application-level security. Talos handles the infrastructure side with its immutable design, and the Trivy Operator handles the container side by continuously scanning for vulnerabilities. Together, they create a defense-in-depth approach where both the platform and the workloads are monitored for security issues. Set up the operator, configure your severity thresholds, integrate with your alerting system, and make vulnerability scanning a standard part of your deployment workflow.
