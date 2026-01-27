# How to Use Trivy for Kubernetes Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Trivy, Vulnerability Scanning, Compliance, DevSecOps, Container Security, Admission Controller

Description: A comprehensive guide to using Trivy and the Trivy Operator for Kubernetes security, covering vulnerability scanning, compliance checks, and admission controller integration.

---

> Security scanning should not be an afterthought. With Trivy, you can shift security left and catch vulnerabilities before they reach production - all without leaving the Kubernetes ecosystem.

## What is Trivy?

Trivy is an open-source security scanner from Aqua Security. It scans container images, filesystems, Git repositories, and Kubernetes clusters for vulnerabilities, misconfigurations, secrets, and license violations. Unlike heavyweight commercial tools, Trivy is fast, accurate, and integrates seamlessly into CI/CD pipelines and Kubernetes clusters.

Key capabilities:
- **Vulnerability scanning** for OS packages and language dependencies
- **Misconfiguration detection** for Kubernetes manifests, Dockerfiles, and Terraform
- **Secret scanning** to catch leaked credentials
- **SBOM generation** for software supply chain visibility
- **Compliance checking** against CIS benchmarks and custom policies

## Installing the Trivy Operator

The Trivy Operator runs inside your cluster and continuously scans workloads. It creates Kubernetes custom resources (CRDs) with scan results that you can query, alert on, and integrate into dashboards.

### Install via Helm

```bash
# Add the Aqua Security Helm repository
helm repo add aqua https://aquasecurity.github.io/helm-charts/
helm repo update

# Install the Trivy Operator in its own namespace
helm install trivy-operator aqua/trivy-operator \
  --namespace trivy-system \
  --create-namespace \
  --set trivy.ignoreUnfixed=true
```

### Verify the Installation

```bash
# Check the operator pod is running
kubectl get pods -n trivy-system

# List the CRDs created by the operator
kubectl get crds | grep aquasecurity
```

Expected CRDs include:
- `vulnerabilityreports.aquasecurity.github.io`
- `configauditreports.aquasecurity.github.io`
- `exposedsecretreports.aquasecurity.github.io`
- `rbacassessmentreports.aquasecurity.github.io`

## Scanning Workloads for Vulnerabilities

Once installed, the operator automatically scans every workload in your cluster. Scans trigger on:
- New pod creation
- Image tag changes
- Scheduled rescans (configurable interval)

### View Vulnerability Reports

```bash
# List all vulnerability reports across namespaces
kubectl get vulnerabilityreports -A

# Get detailed report for a specific workload
kubectl describe vulnerabilityreport -n production \
  deployment-api-server-api-server
```

### Filter by Severity

```bash
# Find workloads with critical vulnerabilities
kubectl get vulnerabilityreports -A -o json | \
  jq -r '.items[] |
    select(.report.summary.criticalCount > 0) |
    "\(.metadata.namespace)/\(.metadata.name): \(.report.summary.criticalCount) critical"'
```

### Sample VulnerabilityReport Output

```yaml
apiVersion: aquasecurity.github.io/v1alpha1
kind: VulnerabilityReport
metadata:
  name: deployment-nginx-nginx
  namespace: default
  labels:
    trivy-operator.resource.kind: Deployment
    trivy-operator.resource.name: nginx
    trivy-operator.container.name: nginx
report:
  summary:
    criticalCount: 2
    highCount: 15
    mediumCount: 42
    lowCount: 18
    unknownCount: 0
  vulnerabilities:
    - vulnerabilityID: CVE-2023-44487
      severity: CRITICAL
      title: "HTTP/2 Rapid Reset Attack"
      resource: "libnghttp2"
      installedVersion: "1.43.0-1"
      fixedVersion: "1.43.0-1+deb11u1"
      primaryLink: "https://avd.aquasec.com/nvd/cve-2023-44487"
```

## Configuration Audit Reports

Beyond vulnerabilities, the Trivy Operator checks workload configurations against security best practices.

### View ConfigAuditReports

```bash
# List configuration audit reports
kubectl get configauditreports -A

# Describe a specific report
kubectl describe configauditreport -n production deployment-api-server
```

### Common Misconfigurations Detected

- Containers running as root
- Missing resource limits
- Privileged containers
- Missing security context
- Writable root filesystem
- Missing network policies

### Sample ConfigAuditReport

```yaml
apiVersion: aquasecurity.github.io/v1alpha1
kind: ConfigAuditReport
metadata:
  name: deployment-api-server
  namespace: production
report:
  summary:
    criticalCount: 1
    highCount: 3
    mediumCount: 5
    lowCount: 2
  checks:
    - checkID: KSV001
      severity: MEDIUM
      title: "Process can elevate its own privileges"
      description: "Container should set allowPrivilegeEscalation to false"
      success: false
    - checkID: KSV003
      severity: HIGH
      title: "Default capabilities not dropped"
      description: "Container should drop all capabilities"
      success: false
    - checkID: KSV021
      severity: LOW
      title: "Runs with low user ID"
      description: "Container runs with a UID < 10000"
      success: false
```

## Compliance Checks with Built-in Benchmarks

Trivy supports compliance scanning against industry standards. The operator can generate compliance reports for:
- CIS Kubernetes Benchmark
- NSA Kubernetes Hardening Guide
- Pod Security Standards (Baseline, Restricted)

### Enable Compliance Scanning

```bash
# Update Helm release to enable compliance reports
helm upgrade trivy-operator aqua/trivy-operator \
  --namespace trivy-system \
  --set compliance.cron="0 */6 * * *" \
  --set compliance.reportType="summary"
```

### View Cluster Compliance Reports

```bash
# List compliance reports
kubectl get clustercompliancereports

# Get detailed compliance status
kubectl describe clustercompliancereport cis
```

### Sample Compliance Report Summary

```yaml
apiVersion: aquasecurity.github.io/v1alpha1
kind: ClusterComplianceReport
metadata:
  name: cis
spec:
  compliance:
    id: cis
    title: CIS Kubernetes Benchmark v1.7.0
    description: CIS Kubernetes Benchmark
status:
  summary:
    passCount: 78
    failCount: 12
  detailReport:
    - id: "1.1.1"
      name: "Ensure API server pod specification file permissions"
      status: PASS
    - id: "1.2.1"
      name: "Ensure anonymous authentication is disabled"
      status: FAIL
      description: "API server has --anonymous-auth=true"
```

## Admission Controller Integration

Prevent vulnerable or misconfigured workloads from being deployed by integrating Trivy with an admission controller. This shifts security left to deployment time.

### Option 1: Kyverno with Trivy

Kyverno can reference VulnerabilityReports to block deployments.

```yaml
# kyverno-policy-block-critical-vulns.yaml
# Block deployments with critical vulnerabilities
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: block-critical-vulnerabilities
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: check-vulnerabilities
      match:
        any:
          - resources:
              kinds:
                - Pod
      preconditions:
        all:
          # Only check pods that have been scanned
          - key: "{{ request.object.metadata.labels.\"trivy-operator.scanned\" || '' }}"
            operator: Equals
            value: "true"
      validate:
        message: "Pod has critical vulnerabilities. Check VulnerabilityReport for details."
        deny:
          conditions:
            any:
              - key: "{{ vulnerabilityreports.report.summary.criticalCount }}"
                operator: GreaterThan
                value: 0
```

### Option 2: OPA Gatekeeper with Trivy

Use Gatekeeper constraints to enforce vulnerability thresholds.

```yaml
# gatekeeper-constraint-template.yaml
# Define a constraint template for vulnerability checks
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8svulnerabilitylimit
spec:
  crd:
    spec:
      names:
        kind: K8sVulnerabilityLimit
      validation:
        openAPIV3Schema:
          type: object
          properties:
            maxCritical:
              type: integer
            maxHigh:
              type: integer
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8svulnerabilitylimit

        violation[{"msg": msg}] {
          # Get the vulnerability report for this container image
          input.review.object.kind == "Pod"
          container := input.review.object.spec.containers[_]

          # Check against threshold
          critical_count > input.parameters.maxCritical
          msg := sprintf("Container %v exceeds critical vulnerability limit (%v > %v)",
                        [container.name, critical_count, input.parameters.maxCritical])
        }
---
# gatekeeper-constraint.yaml
# Apply the constraint with specific thresholds
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sVulnerabilityLimit
metadata:
  name: production-vulnerability-limit
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces:
      - production
  parameters:
    maxCritical: 0
    maxHigh: 5
```

### Option 3: Trivy Admission Webhook (Native)

Aqua provides a standalone admission webhook that scans images at deploy time.

```bash
# Install the Trivy admission webhook
helm install trivy-admission aqua/trivy \
  --namespace trivy-system \
  --set trivy.mode=admission \
  --set trivy.severity="CRITICAL,HIGH" \
  --set trivy.ignoreUnfixed=true
```

```yaml
# Configure webhook behavior
# trivy-admission-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: trivy-admission-config
  namespace: trivy-system
data:
  config.yaml: |
    # Block images with critical vulnerabilities
    block:
      severities:
        - CRITICAL
      # Allow specific images to bypass checks
      allowlist:
        - "gcr.io/distroless/*"
        - "registry.k8s.io/pause:*"
    # Warn but allow high severity
    warn:
      severities:
        - HIGH
```

## CI/CD Integration

Scan images in your pipeline before they reach the cluster.

### GitHub Actions Example

```yaml
# .github/workflows/security-scan.yaml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  trivy-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'myapp:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          # Fail the build if critical vulnerabilities found
          exit-code: '1'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
```

### GitLab CI Example

```yaml
# .gitlab-ci.yml
stages:
  - build
  - scan
  - deploy

trivy-scan:
  stage: scan
  image:
    name: aquasec/trivy:latest
    entrypoint: [""]
  script:
    # Scan the built image
    - trivy image --exit-code 1 --severity CRITICAL,HIGH $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    # Generate SBOM for supply chain visibility
    - trivy image --format cyclonedx --output sbom.json $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  artifacts:
    paths:
      - sbom.json
    reports:
      cyclonedx: sbom.json
  allow_failure: false
```

## Monitoring and Alerting

Export Trivy metrics to Prometheus and create alerts for security issues.

### Enable Prometheus Metrics

```bash
# Enable metrics in the operator
helm upgrade trivy-operator aqua/trivy-operator \
  --namespace trivy-system \
  --set serviceMonitor.enabled=true \
  --set trivy.metrics.enabled=true
```

### Prometheus Alert Rules

```yaml
# trivy-alerts.yaml
# Alert on critical vulnerabilities in production
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: trivy-alerts
  namespace: monitoring
spec:
  groups:
    - name: trivy.rules
      rules:
        - alert: CriticalVulnerabilitiesDetected
          expr: |
            sum by (namespace, resource_name) (
              trivy_vulnerability_id{severity="Critical"}
            ) > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Critical vulnerabilities found in {{ $labels.namespace }}/{{ $labels.resource_name }}"
            description: "Workload has critical vulnerabilities that need immediate attention."

        - alert: HighVulnerabilityCount
          expr: |
            sum by (namespace) (
              trivy_vulnerability_id{severity=~"Critical|High"}
            ) > 50
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "High number of vulnerabilities in namespace {{ $labels.namespace }}"
            description: "Namespace has more than 50 critical/high vulnerabilities."

        - alert: ConfigAuditFailures
          expr: |
            sum by (namespace, resource_name) (
              trivy_configaudit_info{severity="Critical"}
            ) > 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Critical misconfigurations in {{ $labels.namespace }}/{{ $labels.resource_name }}"
            description: "Workload has critical security misconfigurations."
```

## Best Practices Summary

1. **Shift left**: Scan images in CI/CD before they reach the cluster. Catching vulnerabilities early is cheaper than fixing them in production.

2. **Use the operator for continuous scanning**: Images can become vulnerable over time as new CVEs are discovered. The Trivy Operator rescans automatically.

3. **Set severity thresholds**: Block critical vulnerabilities but allow lower severities with a remediation timeline. Zero-tolerance policies can grind deployments to a halt.

4. **Ignore unfixed vulnerabilities**: Use `--ignore-unfixed` to focus on actionable issues. You cannot fix what upstream has not patched.

5. **Integrate with admission controllers**: Prevent vulnerable workloads from deploying in the first place. This is your last line of defense.

6. **Generate SBOMs**: Software Bill of Materials helps track dependencies and respond quickly to supply chain incidents like Log4Shell.

7. **Monitor and alert**: Connect Trivy metrics to your observability stack. Security findings should create incidents, not just reports.

8. **Baseline and improve**: Start by understanding your current vulnerability posture, then set incremental improvement targets.

9. **Exempt with care**: When you must allow a vulnerable image, document the reason and set a remediation date. Audit exemptions regularly.

10. **Keep Trivy updated**: New vulnerability databases and detection capabilities are released frequently. Run the latest version.

---

Security is not a feature you ship once. It is a continuous process that requires visibility, automation, and clear ownership. Trivy gives you the scanning capabilities; combine it with proper incident management and monitoring to close the loop.

For comprehensive visibility into your Kubernetes security posture alongside uptime monitoring, incident management, and status pages, check out [OneUptime](https://oneuptime.com). Connect your Trivy alerts to OneUptime incidents and ensure security findings get the same attention as availability issues.
