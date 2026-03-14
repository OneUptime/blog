# How to Implement Automated Compliance Scanning with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Compliance Scanning, Security, Trivy, Falco

Description: Run automated compliance scans as part of the Flux CD GitOps pipeline to continuously verify that your cluster meets security and compliance benchmarks.

---

## Introduction

Automated compliance scanning continuously verifies that your Kubernetes infrastructure meets defined security and regulatory benchmarks. Rather than relying on periodic manual audits, automated scans run on every deployment and on a recurring schedule, catching compliance drift as it happens.

In a GitOps workflow with Flux CD, compliance scanning operates at two layers. Pre-deployment scanning in CI checks manifests and container images before they are committed to the Flux-watched branch. Post-deployment scanning runs in the cluster on a schedule using tools like Trivy (for vulnerability scanning), Falco (for runtime compliance), and kube-bench (for CIS benchmark verification). Both layers are managed by Flux.

This guide shows how to configure both scanning layers and integrate the results into your compliance reporting workflow.

## Prerequisites

- Flux CD bootstrapped on a Kubernetes cluster
- CI system (GitHub Actions) for pre-deployment scanning
- Container image registry accessible from CI
- `flux` CLI and `kubectl` installed

## Step 1: Pre-Deployment Image Scanning in CI

Scan container images for CVEs before they are referenced in your GitOps repository:

```yaml
# .github/workflows/image-scan.yaml
name: Container Image Compliance Scan

on:
  pull_request:
    branches: [main]
    paths:
      - 'apps/**/**.yaml'

jobs:
  scan-images:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Extract image references from changed manifests
        id: extract-images
        run: |
          # Find all image references in changed YAML files
          IMAGES=$(git diff --name-only origin/main...HEAD \
            | xargs grep -h 'image:' \
            | grep -v '#' \
            | awk '{print $2}' \
            | sort -u)
          echo "images<<EOF" >> $GITHUB_OUTPUT
          echo "$IMAGES" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Install Trivy
        run: |
          curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh \
            | sh -s -- -b /usr/local/bin

      - name: Scan images for vulnerabilities
        run: |
          while IFS= read -r image; do
            if [ -z "$image" ]; then continue; fi
            echo "Scanning: $image"

            trivy image \
              --exit-code 1 \
              --severity CRITICAL \
              --ignore-unfixed \
              --format table \
              "$image"
          done <<< "${{ steps.extract-images.outputs.images }}"

      - name: Scan manifests for misconfigurations
        run: |
          trivy config \
            --exit-code 1 \
            --severity HIGH,CRITICAL \
            --format table \
            apps/
```

## Step 2: Deploy In-Cluster Compliance Scanner via Flux

Run Trivy as an in-cluster operator to continuously scan running workloads:

```yaml
# infrastructure/scanning/trivy-operator.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: aquasecurity
  namespace: flux-system
spec:
  interval: 24h
  url: https://aquasecurity.github.io/helm-charts/
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: trivy-operator
  namespace: trivy-system
spec:
  interval: 10m
  chart:
    spec:
      chart: trivy-operator
      version: ">=0.20.0"
      sourceRef:
        kind: HelmRepository
        name: aquasecurity
        namespace: flux-system
  values:
    trivy:
      ignoreUnfixed: true
      severity: CRITICAL,HIGH,MEDIUM
    operator:
      # Scan all namespaces
      targetNamespaces: ""
      # Generate compliance reports
      complianceEnabled: true
      # Run scans on this schedule
      scanJobTimeout: 5m
    compliance:
      # Enable CIS Kubernetes Benchmark compliance report
      specs:
        - k8s-cis-1.23
        - nsa-1.0
```

## Step 3: Run CIS Kubernetes Benchmark with kube-bench

Deploy kube-bench as a Flux-managed Job to verify CIS compliance:

```yaml
# infrastructure/scanning/kube-bench-job.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: kube-bench
  namespace: compliance
  annotations:
    description: "CIS Kubernetes Benchmark scan — runs weekly"
spec:
  schedule: "0 4 * * 0"    # Every Sunday at 04:00 UTC
  jobTemplate:
    spec:
      template:
        spec:
          hostPID: true
          restartPolicy: OnFailure
          containers:
            - name: kube-bench
              image: aquasec/kube-bench:latest
              command: ["kube-bench"]
              args:
                - run
                - --targets=node
                - --json
                - --outputfile=/reports/kube-bench-$(date +%Y%m%d).json
              volumeMounts:
                - name: var-lib-kubelet
                  mountPath: /var/lib/kubelet
                  readOnly: true
                - name: etc-systemd
                  mountPath: /etc/systemd
                  readOnly: true
                - name: etc-kubernetes
                  mountPath: /etc/kubernetes
                  readOnly: true
                - name: reports
                  mountPath: /reports
          volumes:
            - name: var-lib-kubelet
              hostPath:
                path: /var/lib/kubelet
            - name: etc-systemd
              hostPath:
                path: /etc/systemd
            - name: etc-kubernetes
              hostPath:
                path: /etc/kubernetes
            - name: reports
              persistentVolumeClaim:
                claimName: compliance-reports-pvc
```

## Step 4: Configure Runtime Compliance Monitoring with Falco

Deploy Falco for runtime policy violation detection:

```yaml
# infrastructure/scanning/falco.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: falcosecurity
  namespace: flux-system
spec:
  interval: 24h
  url: https://falcosecurity.github.io/charts
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: falco
  namespace: falco
spec:
  interval: 10m
  chart:
    spec:
      chart: falco
      version: ">=4.0.0"
      sourceRef:
        kind: HelmRepository
        name: falcosecurity
        namespace: flux-system
  values:
    driver:
      kind: modern_ebpf
    falco:
      rules_file:
        - /etc/falco/falco_rules.yaml
        - /etc/falco/k8s_audit_rules.yaml
        - /etc/falco/custom_rules.yaml
      json_output: true
      log_stderr: true
      log_syslog: false
    falcosidekick:
      enabled: true
      config:
        slack:
          webhookurl: ""    # Set via Sealed Secret
          channel: "#security-alerts"
          minimumpriority: warning
```

Custom Falco rules for GitOps compliance:

```yaml
# infrastructure/scanning/falco-custom-rules.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: falco-custom-rules
  namespace: falco
data:
  custom_rules.yaml: |
    # Alert if any process writes to a Kubernetes config file
    - rule: Write to Kubernetes Configuration
      desc: Detects writes to Kubernetes configuration files outside of Flux reconciliation
      condition: >
        open_write and
        fd.name startswith /etc/kubernetes and
        not proc.name in (kube-apiserver, kube-controller-manager, kube-scheduler)
      output: >
        Unexpected write to Kubernetes config
        (user=%user.name command=%proc.cmdline file=%fd.name)
      priority: WARNING
      tags: [compliance, configuration-management]

    # Alert on kubectl exec into production pods
    - rule: Kubectl Exec to Production Pod
      desc: Detects exec into pods in production namespace
      condition: >
        k8s_audit and
        ka.verb=create and
        ka.target.resource=pods/exec and
        ka.target.namespace=production
      output: >
        kubectl exec into production pod
        (user=%ka.user.name pod=%ka.target.name namespace=%ka.target.namespace)
      priority: WARNING
      tags: [compliance, access-control]
```

## Step 5: Aggregate and Report Scan Results

Collect scan results from all tools and generate a unified compliance report:

```bash
#!/bin/bash
# scripts/compliance-scan-report.sh

REPORT_DATE=$(date +%Y-%m-%d)
OUTPUT="compliance-reports/scan-report-$REPORT_DATE.md"
mkdir -p compliance-reports

cat > "$OUTPUT" << EOF
# Automated Compliance Scan Report
Date: $REPORT_DATE
Generated: $(date -u)

## Trivy Vulnerability Summary
EOF

# Get Trivy vulnerability reports from the cluster
kubectl get vulnerabilityreports \
  --all-namespaces \
  -o json \
  | jq -r '.items[] |
      "- \(.metadata.namespace)/\(.metadata.name): \
      Critical: \(.report.summary.criticalCount), \
      High: \(.report.summary.highCount)"' \
  >> "$OUTPUT"

cat >> "$OUTPUT" << 'EOF'

## CIS Benchmark Status
EOF

kubectl get compliancereports \
  --all-namespaces \
  -o json \
  | jq -r '.items[] | "\(.metadata.name): \(.report.summary.passCount) pass, \(.report.summary.failCount) fail"' \
  >> "$OUTPUT"

echo "Report generated: $OUTPUT"
```

## Step 6: Alert on Critical Compliance Findings

```yaml
# clusters/production/monitoring/compliance-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: compliance-scan-failure
  namespace: flux-system
spec:
  summary: "Compliance scan detected critical finding"
  providerRef:
    name: pagerduty-critical
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: trivy-operator
    - kind: Kustomization
      name: falco
  inclusionList:
    - ".*critical.*"
    - ".*compliance.*fail.*"
```

## Best Practices

- Block PRs that introduce images with CRITICAL CVEs by setting `--exit-code 1` in the CI Trivy scan — never allow known critical vulnerabilities into your GitOps repository.
- Run kube-bench monthly at minimum, and within 48 hours of any Kubernetes version upgrade.
- Treat Falco `WARNING` priority alerts as security incidents requiring investigation — do not let them accumulate without review.
- Archive compliance scan reports for the retention period required by your compliance framework.
- Use `--ignore-unfixed` in Trivy to focus on vulnerabilities that have available patches — this reduces noise from theoretical vulnerabilities without available fixes.

## Conclusion

Automated compliance scanning integrated with Flux CD creates a continuous assurance loop: new deployments are scanned before reaching Git, running workloads are scanned by in-cluster operators, and runtime behavior is monitored by Falco. All scanning tools are managed by Flux, so the scanning configuration is itself version-controlled and auditable. The result is a compliance posture that is actively monitored rather than periodically assessed — providing much stronger assurance that your cluster meets its compliance obligations at any point in time.
