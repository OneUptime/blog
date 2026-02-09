# How to Build Policy as Code Frameworks for Kubernetes Using Kyverno and OPA Together

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Policy as Code, Kyverno, OPA, Gatekeeper, Security, Compliance

Description: Combine Kyverno and OPA Gatekeeper to build a comprehensive policy as code framework that leverages the strengths of both tools for Kubernetes security, compliance, and operational governance.

---

Choosing between Kyverno and OPA Gatekeeper for Kubernetes policy enforcement creates an unnecessary dilemma. Each tool has distinct strengths: Kyverno excels at Kubernetes-native policies and mutations, while OPA provides powerful Rego-based decision logic for complex scenarios. Using both tools together creates a more capable policy framework than either alone.

A hybrid approach lets you use Kyverno for straightforward validation and mutation policies while reserving OPA for complex compliance logic, external data integration, and policies requiring sophisticated decision trees. This combination covers the full spectrum of policy needs without forcing every use case into a single paradigm.

## Understanding Tool Strengths and Use Cases

Kyverno uses YAML-based policy definitions that Kubernetes administrators find familiar. It handles common patterns like requiring labels, enforcing resource limits, and generating ConfigMaps without writing code. Kyverno mutations can inject sidecars, add labels, or modify resources automatically. Its reporting features provide compliance dashboards out of the box.

OPA Gatekeeper uses Rego policy language, which excels at complex logic, data transformations, and external API integration. Gatekeeper's constraint templates allow reusable policy definitions across multiple clusters. Its audit functionality scans existing resources for violations. Gatekeeper works well for compliance frameworks requiring sophisticated control logic.

Use Kyverno for operational policies like enforcing naming conventions, requiring resource requests, generating default NetworkPolicies, mutating pod security contexts, and validating label schemas. Use OPA for compliance controls like mapping SOC2 requirements, enforcing complex RBAC rules, validating cryptographic configurations, checking against external inventories, and implementing multi-attribute authorization decisions.

## Installing Both Tools in Harmony

Install Kyverno and Gatekeeper in separate namespaces to avoid conflicts:

```bash
# Install Kyverno
helm repo add kyverno https://kyverno.github.io/kyverno/
helm install kyverno kyverno/kyverno \
  --namespace kyverno \
  --create-namespace \
  --set replicaCount=3

# Wait for Kyverno to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=kyverno -n kyverno --timeout=180s

# Install OPA Gatekeeper
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/master/deploy/gatekeeper.yaml

# Wait for Gatekeeper to be ready
kubectl wait --for=condition=ready pod -l control-plane=controller-manager -n gatekeeper-system --timeout=180s

# Verify both are running
kubectl get pods -n kyverno
kubectl get pods -n gatekeeper-system
```

Configure coordination between the tools to avoid duplicate validations:

```yaml
# kyverno-gatekeeper-coordination.yaml
---
# Exclude Gatekeeper from Kyverno policy enforcement
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: exclude-gatekeeper
spec:
  validationFailureAction: enforce
  rules:
  - name: skip-gatekeeper-resources
    match:
      any:
      - resources:
          namespaces:
          - gatekeeper-system
    exclude:
      any:
      - resources:
          kinds:
          - "*"

---
# Configure Gatekeeper to ignore Kyverno resources
apiVersion: config.gatekeeper.sh/v1alpha1
kind: Config
metadata:
  name: config
  namespace: gatekeeper-system
spec:
  match:
  - excludedNamespaces: ["kyverno", "kyverno-system"]
    processes: ["*"]
```

Apply coordination config:

```bash
kubectl apply -f kyverno-gatekeeper-coordination.yaml
```

## Implementing Kyverno Policies for Operational Controls

Create Kyverno policies for common operational requirements:

```yaml
# kyverno-operational-policies.yaml
---
# Require resource requests and limits
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resources
  annotations:
    policies.kyverno.io/category: Operational
spec:
  validationFailureAction: enforce
  background: true
  rules:
  - name: validate-resources
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: "CPU and memory resource requests and limits are required"
      pattern:
        spec:
          containers:
          - resources:
              requests:
                memory: "?*"
                cpu: "?*"
              limits:
                memory: "?*"
                cpu: "?*"

---
# Add default NetworkPolicy to new namespaces
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-default-networkpolicy
  annotations:
    policies.kyverno.io/category: Security
spec:
  rules:
  - name: generate-default-deny
    match:
      any:
      - resources:
          kinds:
          - Namespace
    generate:
      kind: NetworkPolicy
      name: default-deny
      namespace: "{{request.object.metadata.name}}"
      synchronize: true
      data:
        spec:
          podSelector: {}
          policyTypes:
          - Ingress
          - Egress

---
# Inject logging sidecar into production pods
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: inject-logging-sidecar
  annotations:
    policies.kyverno.io/category: Operational
spec:
  rules:
  - name: inject-sidecar
    match:
      any:
      - resources:
          kinds:
          - Pod
          namespaces:
          - production
    mutate:
      patchStrategicMerge:
        spec:
          containers:
          - name: log-collector
            image: fluent-bit:latest
            volumeMounts:
            - name: varlog
              mountPath: /var/log
          volumes:
          - name: varlog
            emptyDir: {}

---
# Validate label schema
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-labels
  annotations:
    policies.kyverno.io/category: Operational
spec:
  validationFailureAction: enforce
  rules:
  - name: check-required-labels
    match:
      any:
      - resources:
          kinds:
          - Deployment
          - StatefulSet
    validate:
      message: "Required labels missing: app, environment, owner"
      pattern:
        metadata:
          labels:
            app: "?*"
            environment: "?*"
            owner: "?*"
```

Apply Kyverno policies:

```bash
kubectl apply -f kyverno-operational-policies.yaml

# Verify policies are active
kubectl get clusterpolicy

# Check policy reports
kubectl get policyreport -A
```

## Implementing OPA Policies for Compliance Controls

Create OPA Gatekeeper policies for complex compliance requirements:

```yaml
# opa-compliance-policies.yaml
---
# Complex SOC2 control implementation
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: soc2accesscontrol
  annotations:
    description: "SOC2 CC6.1 - Complex RBAC validation"
spec:
  crd:
    spec:
      names:
        kind: SOC2AccessControl
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package soc2

      import future.keywords.contains
      import future.keywords.if

      # Validate ServiceAccount has proper RBAC bindings
      violation[{"msg": msg}] {
        input.review.kind.kind == "Pod"
        sa := input.review.object.spec.serviceAccountName
        namespace := input.review.object.metadata.namespace

        # Check if ServiceAccount exists
        not serviceaccount_exists(namespace, sa)

        msg := sprintf("ServiceAccount '%v' does not exist in namespace '%v'", [sa, namespace])
      }

      # Check for least privilege violations
      violation[{"msg": msg}] {
        input.review.kind.kind == "RoleBinding"
        role := input.review.object.roleRef.name

        # Query for Role definition
        role_data := data.kubernetes.roles[role]

        # Check for wildcard permissions
        rule := role_data.rules[_]
        "*" == rule.verbs[_]

        msg := sprintf("RoleBinding '%v' grants wildcard permissions, violating least privilege", [input.review.object.metadata.name])
      }

      serviceaccount_exists(namespace, sa) if {
        data.kubernetes.serviceaccounts[namespace][sa]
      }

---
# PCI-DSS encryption requirement validation
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: pcidssencryption
  annotations:
    description: "PCI-DSS 3.4 - Encryption validation"
spec:
  crd:
    spec:
      names:
        kind: PCIDSSEncryption
      validation:
        openAPIV3Schema:
          properties:
            exemptNamespaces:
              type: array
              items:
                type: string
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package pcidss

      # Validate TLS configuration
      violation[{"msg": msg}] {
        input.review.kind.kind == "Ingress"
        namespace := input.review.object.metadata.namespace

        not exempt_namespace(namespace)
        not input.review.object.spec.tls

        msg := sprintf("Ingress '%v' must specify TLS configuration per PCI-DSS 3.4", [input.review.object.metadata.name])
      }

      # Validate database connections use TLS
      violation[{"msg": msg}] {
        input.review.kind.kind == "Pod"
        container := input.review.object.spec.containers[_]

        # Check for database connection strings
        env := container.env[_]
        contains(lower(env.name), "database")
        contains(lower(env.value), "postgresql")

        not contains(env.value, "sslmode=require")

        msg := sprintf("Pod '%v' container '%v' database connection must require SSL", [input.review.object.metadata.name, container.name])
      }

      exempt_namespace(namespace) {
        namespace == input.parameters.exemptNamespaces[_]
      }

---
# Apply SOC2 constraint
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: SOC2AccessControl
metadata:
  name: soc2-access-control
spec:
  match:
    kinds:
    - apiGroups: [""]
      kinds: ["Pod"]
    - apiGroups: ["rbac.authorization.k8s.io"]
      kinds: ["RoleBinding"]

---
# Apply PCI-DSS constraint
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: PCIDSSEncryption
metadata:
  name: pci-dss-encryption
spec:
  match:
    kinds:
    - apiGroups: [""]
      kinds: ["Pod"]
    - apiGroups: ["networking.k8s.io"]
      kinds: ["Ingress"]
  parameters:
    exemptNamespaces: ["kube-system", "monitoring"]
```

Apply OPA policies:

```bash
kubectl apply -f opa-compliance-policies.yaml

# Verify constraints
kubectl get constraints

# Check violations
kubectl get constraints -o yaml | grep -A 10 violations
```

## Creating a Unified Policy Dashboard

Build a dashboard that aggregates reports from both tools:

```python
# unified-policy-dashboard.py
#!/usr/bin/env python3

import subprocess
import json
from datetime import datetime

def get_kyverno_reports():
    """Get Kyverno policy reports"""
    cmd = "kubectl get policyreport -A -o json"
    result = subprocess.run(cmd.split(), capture_output=True, text=True)
    data = json.loads(result.stdout)

    reports = []
    for item in data.get('items', []):
        namespace = item['metadata']['namespace']
        summary = item.get('summary', {})

        reports.append({
            'tool': 'Kyverno',
            'namespace': namespace,
            'pass': summary.get('pass', 0),
            'fail': summary.get('fail', 0),
            'warn': summary.get('warn', 0),
            'error': summary.get('error', 0)
        })

    return reports

def get_gatekeeper_violations():
    """Get OPA Gatekeeper violations"""
    cmd = "kubectl get constraints -A -o json"
    result = subprocess.run(cmd.split(), capture_output=True, text=True)
    data = json.loads(result.stdout)

    violations = []
    for item in data.get('items', []):
        name = item['metadata']['name']
        total = item.get('status', {}).get('totalViolations', 0)

        violations.append({
            'tool': 'OPA Gatekeeper',
            'constraint': name,
            'violations': total
        })

    return violations

def generate_dashboard():
    print(f"=== Unified Policy Compliance Dashboard ===")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    print("Kyverno Policy Reports:")
    print("-" * 60)
    kyverno_reports = get_kyverno_reports()

    total_pass = total_fail = 0
    for report in kyverno_reports:
        print(f"  {report['namespace']:20} Pass: {report['pass']:3} Fail: {report['fail']:3} Warn: {report['warn']:3}")
        total_pass += report['pass']
        total_fail += report['fail']

    print(f"\n  Total: Pass={total_pass}, Fail={total_fail}")

    print("\n\nOPA Gatekeeper Violations:")
    print("-" * 60)
    gatekeeper_violations = get_gatekeeper_violations()

    total_violations = 0
    for violation in gatekeeper_violations:
        print(f"  {violation['constraint']:40} Violations: {violation['violations']}")
        total_violations += violation['violations']

    print(f"\n  Total Violations: {total_violations}")

    print("\n\nOverall Compliance Status:")
    print("-" * 60)
    if total_fail == 0 and total_violations == 0:
        print("  ✓ COMPLIANT - All policies passing")
    else:
        print(f"  ✗ NON-COMPLIANT - {total_fail + total_violations} violations detected")

if __name__ == "__main__":
    generate_dashboard()
```

Deploy as a CronJob:

```yaml
# unified-dashboard-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: unified-policy-dashboard
  namespace: policy-system
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: policy-reporter
          containers:
          - name: dashboard
            image: policy-dashboard:latest
            command: ["/app/unified-policy-dashboard.py"]
          restartPolicy: OnFailure
```

## Coordinating Policy Updates

Create a workflow for managing policies across both tools:

```bash
# policy-sync.sh
#!/bin/bash

# Deploy policies in order to avoid conflicts

echo "Deploying Kyverno policies..."
kubectl apply -f policies/kyverno/

echo "Waiting for Kyverno policies to be active..."
sleep 10

echo "Deploying OPA Gatekeeper policies..."
kubectl apply -f policies/opa/

echo "Verifying policy deployment..."
kubectl get clusterpolicy
kubectl get constrainttemplates
kubectl get constraints

echo "Policy deployment complete"
```

## Testing Policy Interactions

Verify both tools work correctly together:

```yaml
# test-policy-coordination.yaml
---
# This pod should trigger both Kyverno and OPA policies
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: default
  labels:
    # Missing required labels (Kyverno should catch)
    test: coordination
spec:
  # Using default ServiceAccount (OPA should catch)
  serviceAccountName: default
  containers:
  - name: nginx
    image: nginx:latest
    # Missing resources (Kyverno should catch)
```

Test the policies:

```bash
kubectl apply -f test-policy-coordination.yaml
# Should see rejection messages from both Kyverno and OPA
```

Combining Kyverno and OPA creates a comprehensive policy framework that handles everything from simple operational policies to complex compliance controls. Use each tool for its strengths: Kyverno for Kubernetes-native policies and mutations, OPA for sophisticated logic and compliance frameworks. This hybrid approach provides complete policy coverage without forcing every use case into a single paradigm.
