# How to Run NIST Compliance Checks on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, NIST, Compliance, Security, CIS Benchmark

Description: A practical guide to running NIST compliance checks on Talos Linux clusters covering the NIST Cybersecurity Framework, SP 800-53 controls, and automated scanning tools.

---

The National Institute of Standards and Technology (NIST) publishes frameworks and guidelines that define security controls for information systems. If your organization handles federal data, works with government agencies, or simply wants a rigorous security baseline, NIST compliance is likely on your radar. Talos Linux has built-in characteristics that satisfy many NIST requirements out of the box, but you still need to verify and document compliance.

This guide covers running NIST compliance checks on Talos Linux clusters and mapping Talos security features to NIST controls.

## NIST Frameworks Overview

There are two main NIST documents relevant to Kubernetes and infrastructure security:

**NIST Cybersecurity Framework (CSF) 2.0**: A high-level framework organized around six functions - Govern, Identify, Protect, Detect, Respond, and Recover. CSF 2.0 (released February 2024) added Govern as the sixth function alongside the original five. It provides a strategic view of cybersecurity risk management.

**NIST SP 800-53**: A detailed catalog of security controls organized into families like Access Control (AC), Audit and Accountability (AU), Configuration Management (CM), and System and Information Integrity (SI). This is where the specific technical requirements live.

## How Talos Linux Helps

Talos Linux addresses many NIST controls by design:

- **Immutable OS**: No shell access, no package manager, no ability to install unauthorized software (CM-7, CM-11)
- **API-driven management**: All changes are through authenticated APIs with audit capability (AC-3, AU-2)
- **Minimal attack surface**: No unnecessary services, no SSH (CM-7, SC-7)
- **Secure boot support**: Verified boot chain (SI-7)
- **Encrypted communications**: TLS for all API communications (SC-8, SC-13)
- **Automatic updates**: Controlled, API-driven OS updates (SI-2)

## Running CIS Kubernetes Benchmarks

The CIS Kubernetes Benchmark is commonly used as a bridge between NIST controls and specific Kubernetes settings. Run kube-bench to check your cluster:

```bash
# Deploy kube-bench as a Job

kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: kube-bench
  namespace: default
spec:
  template:
    spec:
      hostPID: true
      containers:
        - name: kube-bench
          image: aquasec/kube-bench:latest
          command: ["kube-bench", "run", "--targets", "node,policies"]
          volumeMounts:
            - name: var-lib-kubelet
              mountPath: /var/lib/kubelet
              readOnly: true
            - name: etc-kubernetes
              mountPath: /etc/kubernetes
              readOnly: true
      restartPolicy: Never
      volumes:
        - name: var-lib-kubelet
          hostPath:
            path: /var/lib/kubelet
        - name: etc-kubernetes
          hostPath:
            path: /etc/kubernetes
  backoffLimit: 0
EOF

# Check results
kubectl logs job/kube-bench
```

Note that Talos Linux is not a standard Linux distribution, so some CIS checks will not apply or will need interpretation. Talos does not have traditional file permissions or service managers - its security model is fundamentally different.

## Automated NIST Compliance Scanning

### Using Trivy for Vulnerability Scanning (SI-2, SI-5)

NIST requires identifying and remediating vulnerabilities. Trivy scans container images and Kubernetes configurations:

```bash
# Install Trivy Operator for continuous scanning
helm install trivy-operator aquasecurity/trivy-operator \
  --namespace trivy-system \
  --create-namespace \
  --set operator.scanJobsConcurrentLimit=3 \
  --set operator.vulnerabilityReports.scanner=Trivy
```

Check vulnerability reports:

```bash
# View vulnerability reports
kubectl get vulnerabilityreports -A -o wide

# Get detailed results for a specific workload
kubectl get vulnerabilityreport -n production \
  deployment-api-server-api -o yaml
```

### Using Kubescape for NIST-Adjacent Mapping

The open-source Kubescape CLI does not ship a built-in NIST 800-53 framework. Its built-in frameworks are NSA-CISA Kubernetes Hardening, MITRE ATT&CK, and several CIS Benchmarks. The NSA-CISA hardening guidance overlaps heavily with NIST 800-53 controls (RBAC, audit logging, isolation, image security), so it is the practical option from the CLI. For direct NIST 800-53 reporting and dashboards, use the ARMO Platform (the SaaS that backs Kubescape).

```bash
# Install kubescape
curl -s https://raw.githubusercontent.com/kubescape/kubescape/master/install.sh | bash

# Run the NSA-CISA hardening scan (broad overlap with NIST 800-53)
kubescape scan framework nsa

# Or run a CIS Kubernetes Benchmark scan
kubescape scan framework cis-v1.10.0

# Run specific control checks
kubescape scan control C-0005  # API server insecure port is enabled
kubescape scan control C-0034  # Automatic mapping of service account
```

Kubescape outputs a compliance score and lists specific controls that pass or fail. You can then manually cross-reference the failing controls with the NIST 800-53 families they relate to (for example, RBAC findings map to AC-3 / AC-6; privileged-container findings map to AC-6 / CM-7).

### Using Polaris for Configuration Checks

Polaris validates Kubernetes workload configurations against security best practices:

```bash
# Install Polaris
helm install polaris fairwinds-stable/polaris \
  --namespace polaris \
  --create-namespace

# Run a one-time audit
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: polaris-audit
spec:
  template:
    spec:
      containers:
        - name: polaris
          image: quay.io/fairwinds/polaris:latest
          command: ["polaris", "audit", "--format", "json"]
      restartPolicy: Never
  backoffLimit: 0
EOF
```

## Mapping NIST SP 800-53 Controls to Talos

Here is a practical mapping of key NIST control families to Talos Linux configurations:

### Access Control (AC)

```yaml
# AC-2: Account Management
# AC-3: Access Enforcement
# AC-6: Least Privilege
cluster:
  apiServer:
    extraArgs:
      # Enable RBAC for access control
      authorization-mode: "Node,RBAC"
      # Disable anonymous authentication
      anonymous-auth: "false"
      # Enable audit logging for access tracking
      audit-log-path: "/var/log/audit/kube-apiserver-audit.log"
```

### Audit and Accountability (AU)

```yaml
# AU-2: Auditable Events
# AU-3: Content of Audit Records
# AU-6: Audit Review, Analysis, and Reporting
machine:
  logging:
    destinations:
      - endpoint: "tcp://siem.example.com:514"
        format: json_lines
cluster:
  apiServer:
    extraArgs:
      audit-policy-file: "/etc/kubernetes/audit-policy.yaml"
      audit-log-maxage: "90"
      audit-log-maxbackup: "10"
```

### Configuration Management (CM)

```yaml
# CM-2: Baseline Configuration
# CM-6: Configuration Settings
# CM-7: Least Functionality
# Talos inherently satisfies these - immutable OS, no shell,
# no package manager, no unnecessary services

# CM-8: Information System Component Inventory
# Use talosctl to inventory all nodes
# talosctl get members
```

### System and Information Integrity (SI)

```yaml
# SI-2: Flaw Remediation (patching)
# SI-4: Information System Monitoring
# SI-7: Software and Information Integrity

machine:
  install:
    image: ghcr.io/siderolabs/installer:v1.6.0  # Pinned versions
  features:
    kubePrism:
      enabled: true
      port: 7445
```

## Creating a Compliance Dashboard

Build a Grafana dashboard that tracks your NIST compliance posture:

```yaml
# compliance-dashboard-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nist-compliance-dashboard
  namespace: monitoring
data:
  nist-compliance.json: |
    {
      "dashboard": {
        "title": "NIST Compliance Status",
        "panels": [
          {
            "title": "Vulnerability Count by Severity",
            "type": "stat",
            "targets": [{
              "expr": "sum by (severity) (trivy_image_vulnerabilities)"
            }]
          },
          {
            "title": "Failed Policy Checks",
            "type": "gauge",
            "targets": [{
              "expr": "sum(polaris_score < 70)"
            }]
          },
          {
            "title": "Audit Log Volume",
            "type": "graph",
            "targets": [{
              "expr": "rate(apiserver_audit_event_total[5m])"
            }]
          }
        ]
      }
    }
```

## Generating Compliance Reports

Automate the generation of compliance reports for auditors:

```bash
#!/bin/bash
# generate-nist-report.sh

REPORT_DIR="./nist-report-$(date +%Y%m%d)"
mkdir -p "$REPORT_DIR"

echo "Generating NIST Compliance Report..."

# Run kubescape scan (NSA-CISA hardening overlaps NIST 800-53; use ARMO Platform for direct NIST reports)
kubescape scan framework nsa --format json --output "$REPORT_DIR/kubescape-nsa.json"

# Get vulnerability reports
kubectl get vulnerabilityreports -A -o json > "$REPORT_DIR/vulnerability-reports.json"

# Get cluster configuration
talosctl get machineconfig -o yaml > "$REPORT_DIR/machine-config.yaml"

# Get RBAC configuration
kubectl get clusterroles,clusterrolebindings -o yaml > "$REPORT_DIR/rbac-config.yaml"

# Get network policies
kubectl get networkpolicies -A -o yaml > "$REPORT_DIR/network-policies.yaml"

# Get Pod Security Admission labels (PodSecurityPolicy was removed in Kubernetes 1.25)
kubectl get namespaces -L pod-security.kubernetes.io/enforce,pod-security.kubernetes.io/audit,pod-security.kubernetes.io/warn > "$REPORT_DIR/pod-security.txt"

echo "Report generated in $REPORT_DIR"
```

## Continuous Compliance Monitoring

Set up automated compliance checks that run on a schedule:

```yaml
# compliance-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nist-compliance-check
  namespace: compliance
spec:
  schedule: "0 6 * * 1"  # Weekly on Monday at 6 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: kubescape
              image: quay.io/kubescape/kubescape:latest
              command:
                - kubescape
                - scan
                - framework
                - nsa
                - --format
                - json
                - --output
                - /reports/nsa-scan.json
              volumeMounts:
                - name: reports
                  mountPath: /reports
          volumes:
            - name: reports
              persistentVolumeClaim:
                claimName: compliance-reports
          restartPolicy: OnFailure
```

## Summary

NIST compliance on Talos Linux starts from a strong foundation. The immutable OS, API-only management, and minimal attack surface satisfy many controls automatically. Your job is to configure the Kubernetes layer properly (RBAC, audit logging, network policies), run automated compliance scanners, and document everything for auditors. Use kubescape's NSA-CISA framework (or the ARMO Platform for direct NIST 800-53 reporting), Trivy for vulnerability management, and kube-bench for CIS benchmark checks. Run these scans regularly, track the results over time, and address findings promptly. Compliance is not a one-time achievement - it is an ongoing process that requires continuous monitoring and improvement.
