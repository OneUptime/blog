# How to Configure Supply Chain Security in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Supply-Chain, SLSA, Security, Kubernetes

Description: Comprehensive guide to implementing software supply chain security controls in Rancher deployments.

## Introduction

How to Configure Supply Chain Security in Rancher is a critical security capability for hardening Rancher-managed Kubernetes environments. This guide provides practical implementation steps for security teams and platform engineers.

## Why This Matters

Container and Kubernetes environments face unique security challenges:
- Dynamic workloads create large attack surfaces
- Container escape vulnerabilities can compromise host systems
- Supply chain attacks target container images and dependencies
- Lateral movement is easy in flat networks

How to Configure Supply Chain Security in Rancher addresses these challenges by adding defense-in-depth controls.

## Prerequisites

- Rancher v2.7+ cluster with cluster admin access
- Kubernetes 1.26+
- Helm 3.x
- Understanding of Linux security concepts

## Step 1: Assess Current Security Posture

```bash
# Run a basic security audit

kubectl get pods --all-namespaces -o json | jq -r '
  .items[] |
  select(
    (.spec.securityContext.runAsUser == 0) or
    ([.spec.initContainers[]?, .spec.containers[]?, .spec.ephemeralContainers[]?] |
      any(.securityContext.privileged == true or .securityContext.runAsUser == 0))
  ) |
  [.metadata.namespace, .metadata.name] |
  @csv'

# Check for containers explicitly configured to run as UID 0
kubectl get pods --all-namespaces -o json | jq -r '
  .items[] | . as $pod |
  [.spec.initContainers[]?, .spec.containers[]?, .spec.ephemeralContainers[]?] |
  .[] |
  select((.securityContext.runAsUser // $pod.spec.securityContext.runAsUser // -1) == 0) |
  [$pod.metadata.namespace, $pod.metadata.name, .name] |
  @tsv'

# Check privileged pods
kubectl get pods --all-namespaces -o json | jq -r '.items[] | select([.spec.initContainers[]?, .spec.containers[]?, .spec.ephemeralContainers[]?] | any(.securityContext.privileged == true)) |
  .metadata.namespace + "/" + .metadata.name'
```

## Step 2: Configure Security Feature

```yaml
# pod-security-admission.yaml
# Pass this file to kube-apiserver with --admission-control-config-file.
apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
- name: PodSecurity
  configuration:
    apiVersion: pod-security.admission.config.k8s.io/v1
    kind: PodSecurityConfiguration
    defaults:
      enforce: "privileged"
      enforce-version: "latest"
      audit: "restricted"
      audit-version: "latest"
      warn: "restricted"
      warn-version: "latest"
    exemptions:
      usernames: []
      runtimeClasses: []
      namespaces:
      - kube-system
```

## Step 3: Apply Pod Security Standards

```yaml
# namespace-security-labels.yaml
# Label namespace to enforce Pod Security Standards
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    # Enforce the restricted Pod Security Standard
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
```

## Step 4: Configure Security Context for Workloads

```yaml
# secure-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
  namespace: production
spec:
  selector:
    matchLabels:
      app: secure-app
  template:
    metadata:
      labels:
        app: secure-app
    spec:
      # Pod-level security context
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 3000
        fsGroup: 2000
        seccompProfile:
          type: RuntimeDefault

      containers:
      - name: app
        image: registry.example.com/app:v1.0.0

        # Container-level security context
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL            # Drop all Linux capabilities
            add:
            - NET_BIND_SERVICE  # Only add what's needed

        # Required volume for writable locations
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

## Step 5: Install Security Tooling

```bash
# Install via Helm
helm repo add kubewarden https://charts.kubewarden.io
helm repo update kubewarden

helm install --wait -n kubewarden --create-namespace kubewarden-crds kubewarden/kubewarden-crds
helm install --wait -n kubewarden kubewarden-controller kubewarden/kubewarden-controller
helm install --wait -n kubewarden kubewarden-defaults kubewarden/kubewarden-defaults

kubectl get pods -n kubewarden
```

## Step 6: Create Alert Rules

```yaml
# security-prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: security-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
  - name: security.alerts
    rules:
    - alert: PodSecurityAdmissionErrors
      expr: |
        rate(pod_security_errors_total[5m]) > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Pod Security Admission evaluation errors detected"

    - alert: PodSecurityAdmissionExemptions
      expr: |
        rate(pod_security_exemptions_total[5m]) > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Pod Security Admission exemptions are being used"
```

## Step 7: Verify Security Controls

```bash
#!/bin/bash
# security-verification.sh

echo "=== Security Control Verification ==="

echo "1. Checking for privileged containers..."
PRIV_COUNT=$(kubectl get pods --all-namespaces -o json | jq '[.items[] | [.spec.initContainers[]?, .spec.containers[]?, .spec.ephemeralContainers[]?][] | select(.securityContext.privileged == true)] | length')
echo "   Privileged containers: $PRIV_COUNT"

echo ""
echo "2. Checking namespaces with Pod Security Standards..."
kubectl get namespaces -o json | jq -r '.items[] | [.metadata.name, (.metadata.labels["pod-security.kubernetes.io/enforce"] // "unset")] | @tsv'

echo ""
echo "3. Checking for host network pods..."
kubectl get pods --all-namespaces -o json | jq -r '.items[] | select(.spec.hostNetwork==true) |
  .metadata.namespace + "/" + .metadata.name'

echo "=== Verification Complete ==="
```

## Conclusion

Implementing How to Configure Supply Chain Security in Rancher on Rancher adds an important layer of defense to your Kubernetes security posture. Combine with other security controls (network policies, RBAC, admission webhooks) for comprehensive defense-in-depth. Regular security audits and automated compliance checks ensure controls remain effective over time.
