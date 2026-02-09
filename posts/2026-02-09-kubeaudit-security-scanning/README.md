# How to Run Security Scanning Tests Against Kubernetes Clusters Using Kubeaudit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Testing

Description: Learn how to use Kubeaudit to automatically scan Kubernetes clusters for security misconfigurations, identify vulnerabilities, and enforce security best practices in your CI/CD pipeline.

---

Security misconfigurations in Kubernetes clusters are one of the most common causes of breaches and compliance failures. While manual security reviews can catch some issues, they are time-consuming, error-prone, and difficult to scale across multiple clusters and environments. Kubeaudit is an open-source tool that automatically audits Kubernetes clusters for common security concerns, helping teams identify and fix vulnerabilities before they reach production.

In this guide, you'll learn how to use Kubeaudit to scan your Kubernetes clusters, interpret the results, integrate security scanning into your CI/CD pipelines, and enforce security policies across your infrastructure.

## Understanding Kubeaudit and Its Security Checks

Kubeaudit is a command-line tool developed by Shopify that audits Kubernetes clusters for various security concerns. It checks your cluster configuration against security best practices and generates detailed reports about potential vulnerabilities.

Kubeaudit performs multiple types of security audits including privilege escalation risks, capabilities that should be dropped, security contexts, resource limits, network policies, service account configurations, and more. It can scan live clusters or analyze manifest files before deployment.

The tool checks for issues like containers running as root, missing read-only root filesystems, capabilities that should be dropped or added, missing resource limits that could lead to resource exhaustion, and inadequate network policies that could allow unwanted traffic.

## Installing and Running Basic Kubeaudit Scans

First, install Kubeaudit on your system. You can download pre-built binaries from the GitHub releases page or build from source.

```bash
# Download the latest release for Linux
curl -L https://github.com/Shopify/kubeaudit/releases/download/v0.22.0/kubeaudit_0.22.0_linux_amd64.tar.gz -o kubeaudit.tar.gz

# Extract the binary
tar -xzf kubeaudit.tar.gz

# Move to a directory in your PATH
sudo mv kubeaudit /usr/local/bin/

# Verify installation
kubeaudit version
```

To scan a live Kubernetes cluster, ensure your kubectl context is set to the cluster you want to audit:

```bash
# Check current context
kubectl config current-context

# Run a full audit of the cluster
kubeaudit all

# Run specific audit checks
kubeaudit apparmor
kubeaudit capabilities
kubeaudit hostns
kubeaudit limits
kubeaudit privileged
kubeaudit rootfs
kubeaudit seccomp
```

The output will show all detected security issues with severity levels and recommendations for fixing them.

## Auditing Kubernetes Manifest Files

You can audit manifest files before deploying them to catch security issues early in the development process:

```bash
# Audit a single manifest file
kubeaudit all -f deployment.yaml

# Audit all manifests in a directory
kubeaudit all -f ./k8s-manifests/

# Output results in JSON format for parsing
kubeaudit all -f deployment.yaml -o json > audit-results.json
```

Here's an example deployment manifest with security issues:

```yaml
# insecure-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: insecure-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: insecure-app
  template:
    metadata:
      labels:
        app: insecure-app
    spec:
      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 8080
```

Running Kubeaudit against this manifest will reveal multiple security issues:

```bash
kubeaudit all -f insecure-deployment.yaml
```

The audit will flag issues like the container running as root, missing resource limits, no read-only root filesystem, and dangerous capabilities not dropped.

## Creating a Secure Deployment with Kubeaudit Recommendations

Based on Kubeaudit's recommendations, here's a secure version of the deployment:

```yaml
# secure-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
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
      # Use a non-root service account
      serviceAccountName: secure-app-sa
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 10000
        fsGroup: 10000
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 8080
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 10000
          capabilities:
            drop:
            - ALL
            add:
            - NET_BIND_SERVICE
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /app/cache
      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
```

This deployment addresses all the security concerns that Kubeaudit would flag, including running as non-root, dropping all capabilities except necessary ones, setting a read-only root filesystem, defining resource limits, and using a secure seccomp profile.

## Integrating Kubeaudit into CI/CD Pipelines

Integrate Kubeaudit into your CI/CD pipeline to automatically scan manifests before deployment. Here's a GitHub Actions workflow example:

```yaml
# .github/workflows/security-audit.yaml
name: Kubernetes Security Audit

on:
  pull_request:
    paths:
    - 'k8s/**'
  push:
    branches:
    - main

jobs:
  kubeaudit:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Install Kubeaudit
      run: |
        curl -L https://github.com/Shopify/kubeaudit/releases/download/v0.22.0/kubeaudit_0.22.0_linux_amd64.tar.gz -o kubeaudit.tar.gz
        tar -xzf kubeaudit.tar.gz
        sudo mv kubeaudit /usr/local/bin/

    - name: Run Kubeaudit on manifests
      run: |
        kubeaudit all -f k8s/ -o json > audit-results.json

    - name: Check for critical issues
      run: |
        # Fail if critical security issues are found
        CRITICAL_COUNT=$(jq '[.[] | select(.AuditResultName != "")]' audit-results.json | jq length)
        echo "Found $CRITICAL_COUNT security issues"
        if [ "$CRITICAL_COUNT" -gt 0 ]; then
          echo "Security audit failed. Review the issues below:"
          cat audit-results.json
          exit 1
        fi

    - name: Upload audit results
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: kubeaudit-results
        path: audit-results.json
```

For GitLab CI, create a similar pipeline:

```yaml
# .gitlab-ci.yml
kubeaudit:
  stage: test
  image: ubuntu:22.04
  before_script:
    - apt-get update && apt-get install -y curl tar jq
    - curl -L https://github.com/Shopify/kubeaudit/releases/download/v0.22.0/kubeaudit_0.22.0_linux_amd64.tar.gz -o kubeaudit.tar.gz
    - tar -xzf kubeaudit.tar.gz
    - mv kubeaudit /usr/local/bin/
  script:
    - kubeaudit all -f k8s/ -o json > audit-results.json
    - |
      ISSUE_COUNT=$(jq '[.[] | select(.AuditResultName != "")]' audit-results.json | jq length)
      if [ "$ISSUE_COUNT" -gt 0 ]; then
        echo "Found $ISSUE_COUNT security issues"
        cat audit-results.json
        exit 1
      fi
  artifacts:
    when: always
    paths:
      - audit-results.json
```

## Using Kubeaudit Configuration Files

Create a configuration file to customize Kubeaudit's behavior and define exceptions for specific cases:

```yaml
# .kubeaudit.yaml
enabledAuditors:
  - apparmor
  - capabilities
  - hostns
  - limits
  - privileged
  - rootfs
  - seccomp

# Set minimum resource limits
limits:
  cpu: "100m"
  memory: "128Mi"

# Allow specific capabilities if needed
capabilities:
  allowAddList:
    - NET_BIND_SERVICE

# Define exceptions for specific workloads
auditResults:
  # Skip rootfs check for init containers
  - name: "ReadOnlyRootFilesystem"
    skipContainers:
      - init-*
```

Run Kubeaudit with the configuration file:

```bash
kubeaudit all -f k8s/ --config .kubeaudit.yaml
```

## Automating Cluster Audits with CronJobs

Set up regular security audits of your live clusters using Kubernetes CronJobs:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kubeaudit-scanner
  namespace: security
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kubeaudit-scanner
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kubeaudit-scanner
subjects:
- kind: ServiceAccount
  name: kubeaudit-scanner
  namespace: security
roleRef:
  kind: ClusterRole
  name: kubeaudit-scanner
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: kubeaudit-scan
  namespace: security
spec:
  schedule: "0 2 * * *"  # Run daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: kubeaudit-scanner
          containers:
          - name: kubeaudit
            image: shopify/kubeaudit:latest
            command:
            - /bin/sh
            - -c
            - |
              kubeaudit all -o json > /results/audit-$(date +%Y%m%d).json
              # Send results to monitoring system
              curl -X POST -H "Content-Type: application/json" \
                -d @/results/audit-$(date +%Y%m%d).json \
                http://monitoring-service/api/security-audit
            volumeMounts:
            - name: results
              mountPath: /results
          volumes:
          - name: results
            emptyDir: {}
          restartPolicy: OnFailure
```

## Analyzing and Acting on Audit Results

Parse Kubeaudit results programmatically to generate reports or trigger alerts:

```python
#!/usr/bin/env python3
import json
import sys

def analyze_audit_results(filename):
    """Parse Kubeaudit JSON output and categorize issues."""
    with open(filename, 'r') as f:
        results = json.load(f)

    issues_by_severity = {
        'critical': [],
        'high': [],
        'medium': [],
        'low': []
    }

    critical_checks = ['privileged', 'hostPID', 'hostNetwork']
    high_checks = ['runAsRoot', 'allowPrivilegeEscalation']

    for issue in results:
        if not issue.get('AuditResultName'):
            continue

        check_name = issue['AuditResultName']
        resource = f"{issue.get('ResourceNamespace', 'default')}/{issue.get('ResourceName', 'unknown')}"

        if check_name in critical_checks:
            issues_by_severity['critical'].append((resource, check_name))
        elif check_name in high_checks:
            issues_by_severity['high'].append((resource, check_name))
        else:
            issues_by_severity['medium'].append((resource, check_name))

    # Print summary
    print("Security Audit Summary")
    print("=" * 50)
    for severity, issues in issues_by_severity.items():
        if issues:
            print(f"\n{severity.upper()}: {len(issues)} issues")
            for resource, check in issues[:5]:  # Show first 5
                print(f"  - {resource}: {check}")

    # Return exit code based on critical issues
    return 1 if issues_by_severity['critical'] else 0

if __name__ == '__main__':
    exit_code = analyze_audit_results('audit-results.json')
    sys.exit(exit_code)
```

Security scanning with Kubeaudit provides automated, consistent security validation across your Kubernetes infrastructure. By integrating these scans into your development workflow and CI/CD pipelines, you can catch security misconfigurations early, enforce security best practices, and maintain a strong security posture across all your clusters and environments.
