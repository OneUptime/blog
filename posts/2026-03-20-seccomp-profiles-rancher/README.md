# How to Configure Seccomp Profiles in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Seccomp, Security, Kubernetes, Syscalls

Description: Guide to creating and applying seccomp security profiles to pods in Rancher for syscall filtering.

## Introduction

How to Configure Seccomp Profiles in Rancher is a critical security capability for hardening Rancher-managed Kubernetes environments. This guide provides practical implementation steps for security teams and platform engineers.

## Why This Matters

Container and Kubernetes environments face unique security challenges:
- Dynamic workloads create large attack surfaces
- Container escape vulnerabilities can compromise host systems
- Supply chain attacks target container images and dependencies
- Lateral movement is easy in flat networks

How to Configure Seccomp Profiles in Rancher addresses these challenges by adding defense-in-depth controls.

## Prerequisites

- Rancher v2.7.2+ cluster with cluster admin access
- Kubernetes 1.26+
- `kubectl` access and `jq`
- Understanding of Linux security concepts

## Step 1: Assess Current Security Posture

```bash
# Run a basic security audit

kubectl get pods --all-namespaces -o json | jq -r '
  def all_containers:
    ((.spec.initContainers // []) + (.spec.containers // []) + (.spec.ephemeralContainers // []));
  .items[] |
  select(
    (.spec.securityContext.runAsUser // -1) == 0 or
    any(all_containers[]; (.securityContext.runAsUser // -1) == 0 or (.securityContext.privileged // false) == true)
  ) |
  [.metadata.namespace, .metadata.name] |
  @csv'

# Check for pods explicitly configured to run as UID 0
kubectl get pods --all-namespaces -o json | jq -r '
  def all_containers:
    ((.spec.initContainers // []) + (.spec.containers // []) + (.spec.ephemeralContainers // []));
  .items[] |
  select((.spec.securityContext.runAsUser // -1) == 0 or any(all_containers[]; (.securityContext.runAsUser // -1) == 0)) |
  .metadata.namespace + "/" + .metadata.name'

# Check privileged pods
kubectl get pods --all-namespaces -o json | jq -r '
  def all_containers:
    ((.spec.initContainers // []) + (.spec.containers // []) + (.spec.ephemeralContainers // []));
  .items[] | select(any(all_containers[]; (.securityContext.privileged // false) == true)) |
  .metadata.namespace + "/" + .metadata.name'
```

## Step 2: Prepare a Local Seccomp Profile

Save this audit profile on every Linux node as `<kubelet-root-dir>/seccomp/profiles/audit.json`. Use it for syscall discovery before moving to `RuntimeDefault` or a tested restrictive `Localhost` profile.

```json
{
  "defaultAction": "SCMP_ACT_LOG"
}
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
    # Enforce strict Pod Security Standard
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
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
  replicas: 1
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
          # For a tested Localhost profile distributed to every node:
          # type: Localhost
          # localhostProfile: profiles/audit.json
      
      containers:
      - name: app
        image: registry.example.com/app:latest
        
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
# Install Rancher Monitoring from the Rancher UI:
# Cluster Management > Explore > Cluster Tools > Monitoring > Install
# In the chart values, allowlist the namespace label used below:
# kube-state-metrics:
#   metricLabelsAllowlist:
#   - namespaces=[pod-security.kubernetes.io/enforce]

# Then verify the Prometheus Operator CRDs and monitoring pods
kubectl get crd prometheusrules.monitoring.coreos.com
kubectl get pods -n cattle-monitoring-system
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
    - alert: HostNetworkPodDetected
      expr: |
        kube_pod_info{host_network="true"} == 1
      for: 0m
      labels:
        severity: critical
      annotations:
        summary: "Host network pod in {{ $labels.namespace }}/{{ $labels.pod }}"
    
    - alert: NamespaceMissingRestrictedPodSecurity
      expr: |
        kube_namespace_status_phase{phase="Active"} == 1
        unless on(namespace)
        kube_namespace_labels{label_pod_security_kubernetes_io_enforce="restricted"} == 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Namespace {{ $labels.namespace }} is missing restricted Pod Security enforcement"
```

## Step 7: Verify Security Controls

```bash
#!/bin/bash
# security-verification.sh

echo "=== Security Control Verification ==="

echo "1. Checking for privileged containers..."
PRIV_COUNT=$(kubectl get pods --all-namespaces -o json | jq '
  def all_containers:
    ((.spec.initContainers // []) + (.spec.containers // []) + (.spec.ephemeralContainers // []));
  [.items[] | all_containers[] | (.securityContext.privileged // false) | select(.)] | length')
echo "   Privileged containers: $PRIV_COUNT"

echo ""
echo "2. Checking namespaces with Pod Security Standards..."
kubectl get namespaces -L pod-security.kubernetes.io/enforce

echo ""
echo "3. Checking for pods without explicit seccomp profiles..."
kubectl get pods --all-namespaces -o json | jq -r '
  def all_containers:
    ((.spec.initContainers // []) + (.spec.containers // []) + (.spec.ephemeralContainers // []));
  .items[] |
  select((.spec.securityContext.seccompProfile.type // "") == "" and any(all_containers[]; (.securityContext.seccompProfile.type // "") == "")) |
  .metadata.namespace + "/" + .metadata.name'

echo ""
echo "4. Checking for host network pods..."
kubectl get pods --all-namespaces -o json | jq -r '.items[] | select(.spec.hostNetwork==true) |
  .metadata.namespace + "/" + .metadata.name'

echo "=== Verification Complete ==="
```

## Conclusion

Implementing How to Configure Seccomp Profiles in Rancher on Rancher adds an important layer of defense to your Kubernetes security posture. Combine with other security controls (network policies, RBAC, admission webhooks) for comprehensive defense-in-depth. Regular security audits and automated compliance checks ensure controls remain effective over time.
