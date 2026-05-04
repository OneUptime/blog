# How to Set Up Container Forensics in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Forensics, Security, Incident-response, Kubernetes

Description: Guide to configuring container forensics capabilities in Rancher for security incident investigation.

## Introduction

How to Set Up Container Forensics in Rancher is a critical security capability for hardening Rancher-managed Kubernetes environments. This guide provides practical implementation steps for security teams and platform engineers.

## Why This Matters

Container and Kubernetes environments face unique security challenges:
- Dynamic workloads create large attack surfaces
- Container escape vulnerabilities can compromise host systems
- Supply chain attacks target container images and dependencies
- Lateral movement is easy in flat networks

How to Set Up Container Forensics in Rancher addresses these challenges by adding defense-in-depth controls.

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
    .spec.containers[].securityContext.runAsUser == 0 or
    .spec.containers[].securityContext.privileged == true
  ) |
  [.metadata.namespace, .metadata.name] |
  @csv'

# Check for pods running as root
kubectl get pods --all-namespaces -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,USER:.spec.securityContext.runAsUser'

# Check privileged pods
kubectl get pods --all-namespaces -o json |   jq -r '.items[] | select(.spec.containers[].securityContext.privileged==true) | 
  .metadata.namespace + "/" + .metadata.name'
```

## Step 2: Configure Security Feature

```yaml
# security-feature-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: security-config
  namespace: kube-system
data:
  config.yaml: |
    # Security feature configuration
    enabled: true
    level: "strict"
    
    # Audit settings
    audit:
      enabled: true
      outputPath: /var/log/security-audit.log
    
    # Alert settings
    alerts:
      enabled: true
      webhook: "https://alerts.example.com/security"
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
  template:
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
# Install via Helm
helm repo add security-charts https://charts.example.com/security
helm repo update

helm install security-tool security-charts/security-tool   --namespace security-system   --create-namespace   --set rules.enabled=true   --set alerting.enabled=true   --set alerting.slack.webhook=YOUR_WEBHOOK_URL

kubectl get pods -n security-system
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
    - alert: PrivilegedContainerDetected
      expr: |
        kube_pod_container_info{container!=""} * on(pod, namespace)
        kube_pod_spec_container_security_context_privileged{privileged="true"} > 0
      for: 0m
      labels:
        severity: critical
      annotations:
        summary: "Privileged container in {{ $labels.namespace }}/{{ $labels.pod }}"
    
    - alert: ContainerRunningAsRoot
      expr: |
        kube_pod_container_status_running * on(pod, namespace)
        kube_pod_container_info{container_id!=""} and
        kube_pod_spec_container_security_context_run_as_user{run_as_user="0"} > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Container running as root in {{ $labels.namespace }}"
```

## Step 7: Verify Security Controls

```bash
#!/bin/bash
# security-verification.sh

echo "=== Security Control Verification ==="

echo "1. Checking for privileged containers..."
PRIV_COUNT=$(kubectl get pods --all-namespaces -o json |   jq '[.items[].spec.containers[].securityContext.privileged // false | select(.)] | length')
echo "   Privileged containers: $PRIV_COUNT"

echo ""
echo "2. Checking namespaces with Pod Security Standards..."
kubectl get namespaces -o custom-columns='NAME:.metadata.name,PSS:.metadata.labels[pod-security\.kubernetes\.io/enforce]'

echo ""
echo "3. Checking for host network pods..."
kubectl get pods --all-namespaces -o json |   jq -r '.items[] | select(.spec.hostNetwork==true) | 
  .metadata.namespace + "/" + .metadata.name'

echo "=== Verification Complete ==="
```

## Conclusion

Implementing How to Set Up Container Forensics in Rancher on Rancher adds an important layer of defense to your Kubernetes security posture. Combine with other security controls (network policies, RBAC, admission webhooks) for comprehensive defense-in-depth. Regular security audits and automated compliance checks ensure controls remain effective over time.
