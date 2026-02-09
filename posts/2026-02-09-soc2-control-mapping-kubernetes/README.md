# How to Implement SOC2 Control Mapping for Kubernetes Infrastructure Using Policy as Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Compliance, SOC2, Policy as Code, Security, OPA

Description: Map SOC2 Trust Service Criteria controls to Kubernetes policies using OPA Gatekeeper and Kyverno, creating an automated compliance framework that satisfies auditors while maintaining operational efficiency.

---

SOC2 compliance requires demonstrating effective controls across multiple Trust Service Criteria categories. For Kubernetes infrastructure, this means proving that your cluster security policies, access controls, and operational procedures meet specific security requirements. Manual control verification doesn't scale and is error-prone.

Policy as Code transforms SOC2 compliance from a manual audit checklist into an automated, continuously enforced system. By mapping each SOC2 control requirement to executable Kubernetes policies, you create a compliance framework that prevents violations before they happen and generates the evidence auditors need.

## Understanding SOC2 Trust Service Criteria for Kubernetes

SOC2 Type 2 focuses on five Trust Service Criteria: Security, Availability, Processing Integrity, Confidentiality, and Privacy. For Kubernetes infrastructure, Security and Availability criteria are most relevant.

Common Control (CC) requirements that map to Kubernetes include access controls, encryption in transit and at rest, logical separation, system monitoring, and change management. Each control requires evidence of implementation and ongoing effectiveness over time.

Policy as Code provides this evidence automatically by enforcing policies at admission time and maintaining audit logs of all enforcement decisions. Every rejected pod becomes documented proof that your controls work.

## Setting Up OPA Gatekeeper for Policy Enforcement

Start by installing OPA Gatekeeper, which provides policy enforcement through constraint templates and constraints. Gatekeeper integrates with Kubernetes admission webhooks to validate resources before creation.

```bash
# Install OPA Gatekeeper
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/master/deploy/gatekeeper.yaml

# Wait for Gatekeeper to be ready
kubectl wait --for=condition=ready pod -l control-plane=controller-manager \
  -n gatekeeper-system --timeout=180s

# Verify installation
kubectl get pods -n gatekeeper-system
kubectl get crd | grep gatekeeper
```

Configure Gatekeeper to audit existing resources and enforce new ones:

```yaml
# gatekeeper-config.yaml
apiVersion: config.gatekeeper.sh/v1alpha1
kind: Config
metadata:
  name: config
  namespace: gatekeeper-system
spec:
  # Namespaces to exclude from enforcement
  match:
    - excludedNamespaces: ["kube-system", "gatekeeper-system", "kube-node-lease"]
      processes: ["*"]

  # Enable audit to scan existing resources
  audit:
    auditInterval: 60
    logLevel: "INFO"
    constraintViolationsLimit: 100

  # Configure what resources to audit
  sync:
    syncOnly:
      - group: ""
        version: "v1"
        kind: "Namespace"
      - group: ""
        version: "v1"
        kind: "Pod"
      - group: "apps"
        version: "v1"
        kind: "Deployment"
      - group: "apps"
        version: "v1"
        kind: "StatefulSet"
```

Apply the configuration:

```bash
kubectl apply -f gatekeeper-config.yaml
```

## Mapping SOC2 CC6.1 Access Controls to RBAC Policies

SOC2 CC6.1 requires restricting logical access to system resources through appropriate access control software. Map this to Kubernetes RBAC enforcement.

```yaml
# soc2-cc6.1-rbac-required.yaml
# ConstraintTemplate: Ensure all ServiceAccounts use RBAC
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: soc2rbacenforcement
  annotations:
    description: "SOC2 CC6.1 - Logical access controls"
    soc2-control: "CC6.1"
    control-description: "Restricts logical access through RBAC"
spec:
  crd:
    spec:
      names:
        kind: SOC2RBACEnforcement
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package soc2rbac

        violation[{"msg": msg}] {
          # Check if ServiceAccount has default permissions
          input.review.kind.kind == "Pod"
          input.review.object.spec.serviceAccountName == "default"

          msg := sprintf(
            "SOC2 CC6.1 Violation: Pod '%v' uses default ServiceAccount. Custom ServiceAccount with RBAC required.",
            [input.review.object.metadata.name]
          )
        }

        violation[{"msg": msg}] {
          # Check if ServiceAccount exists for the pod
          input.review.kind.kind == "Pod"
          not input.review.object.spec.serviceAccountName

          msg := sprintf(
            "SOC2 CC6.1 Violation: Pod '%v' missing ServiceAccount specification.",
            [input.review.object.metadata.name]
          )
        }

---
# Apply the constraint
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: SOC2RBACEnforcement
metadata:
  name: soc2-cc6-1-rbac-required
  annotations:
    soc2-control: "CC6.1"
spec:
  enforcementAction: deny  # Block violations
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces: ["production", "staging"]  # Apply to critical namespaces
```

Apply the RBAC enforcement policy:

```bash
kubectl apply -f soc2-cc6.1-rbac-required.yaml

# Test the policy
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: test-default-sa
  namespace: production
spec:
  containers:
  - name: nginx
    image: nginx
EOF
# Should be rejected with SOC2 CC6.1 violation message
```

## Implementing SOC2 CC6.6 Encryption Controls

SOC2 CC6.6 requires encryption of confidential information during transmission and storage. Implement policies that enforce TLS and encryption requirements.

```yaml
# soc2-cc6.6-encryption-required.yaml
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: soc2encryptionenforcement
  annotations:
    description: "SOC2 CC6.6 - Encryption of data"
    soc2-control: "CC6.6"
spec:
  crd:
    spec:
      names:
        kind: SOC2EncryptionEnforcement
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package soc2encryption

        # Require TLS for Ingress resources
        violation[{"msg": msg}] {
          input.review.kind.kind == "Ingress"
          not input.review.object.spec.tls

          msg := sprintf(
            "SOC2 CC6.6 Violation: Ingress '%v' must specify TLS configuration.",
            [input.review.object.metadata.name]
          )
        }

        # Require volume encryption annotations
        violation[{"msg": msg}] {
          input.review.kind.kind == "PersistentVolumeClaim"
          not input.review.object.metadata.annotations["encrypted"]

          msg := sprintf(
            "SOC2 CC6.6 Violation: PersistentVolumeClaim '%v' must have 'encrypted: true' annotation.",
            [input.review.object.metadata.name]
          )
        }

        # Prohibit plaintext secrets in environment variables
        violation[{"msg": msg}] {
          input.review.kind.kind == "Pod"
          container := input.review.object.spec.containers[_]
          env := container.env[_]
          contains(lower(env.name), "password")
          env.value  # Has direct value, not from secret

          msg := sprintf(
            "SOC2 CC6.6 Violation: Pod '%v' container '%v' exposes password in plaintext. Use Secret references.",
            [input.review.object.metadata.name, container.name]
          )
        }

---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: SOC2EncryptionEnforcement
metadata:
  name: soc2-cc6-6-encryption-required
  annotations:
    soc2-control: "CC6.6"
spec:
  enforcementAction: deny
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod", "PersistentVolumeClaim"]
      - apiGroups: ["networking.k8s.io"]
        kinds: ["Ingress"]
```

Apply encryption policies:

```bash
kubectl apply -f soc2-cc6.6-encryption-required.yaml
```

## Mapping SOC2 CC7.2 System Monitoring to Audit Logging

SOC2 CC7.2 requires detecting and responding to security incidents through monitoring and analysis. Implement policies that enforce audit logging requirements.

```yaml
# soc2-cc7.2-audit-logging.yaml
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: soc2auditlogging
  annotations:
    description: "SOC2 CC7.2 - System monitoring and detection"
    soc2-control: "CC7.2"
spec:
  crd:
    spec:
      names:
        kind: SOC2AuditLogging
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package soc2audit

        # Require audit logging labels
        violation[{"msg": msg}] {
          input.review.kind.kind in ["Deployment", "StatefulSet", "DaemonSet"]
          not input.review.object.metadata.labels["audit-tier"]

          msg := sprintf(
            "SOC2 CC7.2 Violation: %v '%v' must have 'audit-tier' label for monitoring classification.",
            [input.review.kind.kind, input.review.object.metadata.name]
          )
        }

        # Require log shipping sidecar for critical workloads
        violation[{"msg": msg}] {
          input.review.kind.kind == "Pod"
          input.review.object.metadata.labels["audit-tier"] == "critical"

          # Check if log shipping sidecar exists
          not has_log_sidecar

          msg := sprintf(
            "SOC2 CC7.2 Violation: Critical pod '%v' requires log shipping sidecar.",
            [input.review.object.metadata.name]
          )
        }

        has_log_sidecar {
          container := input.review.object.spec.containers[_]
          container.name == "log-collector"
        }

---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: SOC2AuditLogging
metadata:
  name: soc2-cc7-2-audit-required
  annotations:
    soc2-control: "CC7.2"
spec:
  enforcementAction: deny
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment", "StatefulSet", "DaemonSet"]
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces: ["production"]
```

## Creating a Comprehensive SOC2 Control Matrix

Build a complete control mapping document that ties each policy to specific SOC2 requirements:

```yaml
# soc2-control-matrix.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: soc2-control-matrix
  namespace: gatekeeper-system
  annotations:
    description: "Complete mapping of SOC2 controls to Kubernetes policies"
data:
  control-matrix.yaml: |
    soc2_controls:
      - control_id: CC6.1
        title: "Logical Access Controls"
        description: "Restricts logical access through identification and authentication"
        kubernetes_policies:
          - policy: SOC2RBACEnforcement
            constraint: soc2-cc6-1-rbac-required
            enforcement: deny
            evidence: "Gatekeeper audit logs showing RBAC enforcement"

      - control_id: CC6.6
        title: "Encryption of Data"
        description: "Protects confidential information through encryption"
        kubernetes_policies:
          - policy: SOC2EncryptionEnforcement
            constraint: soc2-cc6-6-encryption-required
            enforcement: deny
            evidence: "TLS enforcement logs, PVC encryption validation"

      - control_id: CC6.7
        title: "Logical Separation"
        description: "Restricts unauthorized access through logical separation"
        kubernetes_policies:
          - policy: SOC2NamespaceIsolation
            constraint: soc2-cc6-7-namespace-isolation
            enforcement: deny
            evidence: "NetworkPolicy enforcement, PodSecurityPolicy logs"

      - control_id: CC7.2
        title: "System Monitoring"
        description: "Detects security incidents through monitoring"
        kubernetes_policies:
          - policy: SOC2AuditLogging
            constraint: soc2-cc7-2-audit-required
            enforcement: deny
            evidence: "Audit log shipping validation, monitoring coverage reports"

      - control_id: CC8.1
        title: "Change Management"
        description: "Manages changes to infrastructure in a controlled manner"
        kubernetes_policies:
          - policy: SOC2ChangeControl
            constraint: soc2-cc8-1-change-control
            enforcement: warn
            evidence: "GitOps audit trail, deployment approval logs"
```

Apply the control matrix:

```bash
kubectl apply -f soc2-control-matrix.yaml
```

## Generating Compliance Reports for Auditors

Create automated reporting that demonstrates control effectiveness over time. Gatekeeper's audit functionality provides continuous evidence.

```bash
# compliance-report-generator.sh
#!/bin/bash

NAMESPACE="gatekeeper-system"
OUTPUT_DIR="./soc2-compliance-reports"
DATE=$(date +%Y-%m-%d)

mkdir -p "$OUTPUT_DIR"

echo "Generating SOC2 Compliance Report - $DATE"

# Get all constraint violations
kubectl get constraints -A -o json | \
  jq -r '.items[] |
    select(.status.violations != null) |
    {
      control: .metadata.annotations."soc2-control",
      constraint: .metadata.name,
      violations: .status.totalViolations,
      details: .status.violations
    }' > "$OUTPUT_DIR/violations-$DATE.json"

# Get enforcement statistics
cat > "$OUTPUT_DIR/compliance-summary-$DATE.md" <<EOF
# SOC2 Compliance Report
**Report Date:** $DATE
**Cluster:** $(kubectl config current-context)

## Control Enforcement Summary

EOF

# Count violations by control
kubectl get constraints -A -o json | \
  jq -r '.items[] |
    select(.metadata.annotations."soc2-control" != null) |
    [
      .metadata.annotations."soc2-control",
      .metadata.name,
      (.status.totalViolations // 0)
    ] | @tsv' | \
  while IFS=$'\t' read -r control constraint violations; do
    echo "- **$control** ($constraint): $violations violations detected" >> \
      "$OUTPUT_DIR/compliance-summary-$DATE.md"
  done

# Add enforcement evidence
cat >> "$OUTPUT_DIR/compliance-summary-$DATE.md" <<EOF

## Enforcement Evidence

Total policy evaluations: $(kubectl logs -n gatekeeper-system \
  -l control-plane=controller-manager --tail=10000 | \
  grep -c "admission review")

Denied requests: $(kubectl logs -n gatekeeper-system \
  -l control-plane=controller-manager --tail=10000 | \
  grep -c "denied")

## Compliance Status

- **CC6.1 (Access Controls):** $(test $(kubectl get soc2rbacenforcement -o json | jq '.items[0].status.totalViolations // 0') -eq 0 && echo "✓ COMPLIANT" || echo "✗ NON-COMPLIANT")
- **CC6.6 (Encryption):** $(test $(kubectl get soc2encryptionenforcement -o json | jq '.items[0].status.totalViolations // 0') -eq 0 && echo "✓ COMPLIANT" || echo "✗ NON-COMPLIANT")
- **CC7.2 (Monitoring):** $(test $(kubectl get soc2auditlogging -o json | jq '.items[0].status.totalViolations // 0') -eq 0 && echo "✓ COMPLIANT" || echo "✗ NON-COMPLIANT")

---
Generated by Kubernetes SOC2 Compliance Framework
EOF

echo "Report generated: $OUTPUT_DIR/compliance-summary-$DATE.md"
```

Make the script executable and run it:

```bash
chmod +x compliance-report-generator.sh
./compliance-report-generator.sh
```

Schedule regular report generation:

```yaml
# soc2-reporting-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: soc2-compliance-report
  namespace: gatekeeper-system
spec:
  schedule: "0 0 * * 0"  # Weekly on Sunday
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: gatekeeper-admin
          containers:
          - name: report-generator
            image: bitnami/kubectl:latest
            command: ["/bin/bash", "/scripts/compliance-report-generator.sh"]
            volumeMounts:
            - name: scripts
              mountPath: /scripts
            - name: reports
              mountPath: /reports
          volumes:
          - name: scripts
            configMap:
              name: compliance-scripts
              defaultMode: 0755
          - name: reports
            persistentVolumeClaim:
              claimName: compliance-reports
          restartPolicy: OnFailure
```

## Integrating with CI/CD for Continuous Compliance

Validate policies in CI/CD pipelines before deployment to catch violations early:

```yaml
# .github/workflows/soc2-compliance-check.yaml
name: SOC2 Compliance Check

on: [pull_request]

jobs:
  compliance-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install conftest
        run: |
          wget https://github.com/open-policy-agent/conftest/releases/download/v0.45.0/conftest_0.45.0_Linux_x86_64.tar.gz
          tar xzf conftest_0.45.0_Linux_x86_64.tar.gz
          sudo mv conftest /usr/local/bin/

      - name: Run SOC2 policy tests
        run: |
          # Test against SOC2 policies
          conftest test k8s/*.yaml \
            --policy policies/ \
            --namespace soc2 \
            --output table

      - name: Generate compliance report
        if: failure()
        run: |
          echo "SOC2 compliance violations detected:"
          conftest test k8s/*.yaml \
            --policy policies/ \
            --namespace soc2 \
            --output json > compliance-violations.json
          cat compliance-violations.json

      - name: Upload violations
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: compliance-violations
          path: compliance-violations.json
```

Policy as Code transforms SOC2 compliance from a painful annual audit into a continuous, automated process. By mapping each control to enforceable Kubernetes policies, you prove compliance through code execution rather than documentation. Auditors love automated evidence, and developers appreciate instant feedback on compliance issues. Start by mapping your highest-risk controls first and expand coverage incrementally.
