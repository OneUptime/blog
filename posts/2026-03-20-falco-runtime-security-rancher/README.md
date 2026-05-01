# How to Set Up Falco Runtime Security on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Falco, Security, Runtime, Kubernetes

Description: Guide to deploying Falco runtime security on Rancher for detecting threats and anomalous container behavior.

## Introduction

Falco runtime security is a critical capability for hardening Rancher-managed Kubernetes environments. This guide provides practical implementation steps for security teams and platform engineers.

## Why This Matters

Container and Kubernetes environments face unique security challenges:
- Dynamic workloads create large attack surfaces
- Container escape vulnerabilities can compromise host systems
- Supply chain attacks target container images and dependencies
- Lateral movement is easy in flat networks

Falco runtime security on Rancher addresses these challenges by adding defense-in-depth controls.
Falco addresses these challenges by monitoring runtime system activity and generating alerts when rules match suspicious behavior.

## Prerequisites

- Rancher-managed Kubernetes cluster with Linux worker nodes and cluster admin access
- `kubectl` configured for the downstream cluster
- Helm 3.x
- If Pod Security Admission is enforced, permission to exempt or relax the namespace where Falco runs
- Understanding of Linux security concepts

## Step 1: Assess Current Security Posture

```bash
# Run a basic security audit

# Check containers explicitly configured to run as UID 0
kubectl get pods --all-namespaces -o json | jq -r '
  .items[]
  | . as $pod
  | .spec.containers[]?
  | select((.securityContext.runAsUser // $pod.spec.securityContext.runAsUser // -1) == 0)
  | [$pod.metadata.namespace, $pod.metadata.name, .name]
  | @tsv'

# Check for privileged containers
kubectl get pods --all-namespaces -o json | jq -r '
  .items[]
  | . as $pod
  | .spec.containers[]?
  | select((.securityContext.privileged // false) == true)
  | [$pod.metadata.namespace, $pod.metadata.name, .name]
  | @tsv'

# Check namespace Pod Security levels
kubectl get namespaces -L pod-security.kubernetes.io/enforce
```

## Step 2: Configure Security Feature

```yaml
# falco-values.yaml
tty: true

# Deploy Falcosidekick so Falco alerts can be forwarded downstream.
falcosidekick:
  enabled: true
```

## Step 3: Apply Pod Security Standards

```yaml
# namespace-security-labels.yaml
# Falco runs as a privileged DaemonSet, so keep it out of restricted namespaces.
apiVersion: v1
kind: Namespace
metadata:
  name: falco
  labels:
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/enforce-version: latest
---
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
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
      
      containers:
      - name: app
        image: busybox:1.36
        command: ["sh", "-c", "sleep 3600"]
        
        # Container-level security context
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL            # Drop all Linux capabilities
        
        # Required volume for writable locations
        volumeMounts:
        - name: tmp
          mountPath: /tmp
      
      volumes:
      - name: tmp
        emptyDir: {}
```

## Step 5: Install Security Tooling

```bash
# Install via Helm
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update

helm upgrade --install falco \
  --namespace falco \
  --create-namespace \
  -f falco-values.yaml \
  falcosecurity/falco

kubectl wait pods --for=condition=Ready --all -n falco
kubectl get pods -n falco
```

## Step 6: Create Alert Rules

```yaml
# falco-custom-rules.yaml
customRules:
  custom-rules.yaml: |-
    - rule: Write below etc
      desc: An attempt to write to /etc directory
      condition: >
        (evt.type in (open,openat,openat2) and evt.is_open_write=true and fd.typechar='f' and fd.num>=0)
        and fd.name startswith /etc
      output: "File below /etc opened for writing | file=%fd.name pcmdline=%proc.pcmdline gparent=%proc.aname[2] ggparent=%proc.aname[3] gggparent=%proc.aname[4] evt_type=%evt.type user=%user.name user_uid=%user.uid user_loginuid=%user.loginuid process=%proc.name proc_exepath=%proc.exepath parent=%proc.pname command=%proc.cmdline terminal=%proc.tty"
      priority: WARNING
      tags: [filesystem, mitre_persistence]
```

```bash
helm upgrade --install falco \
  --namespace falco \
  -f falco-values.yaml \
  -f falco-custom-rules.yaml \
  falcosecurity/falco

kubectl wait pods --for=condition=Ready --all -n falco
```

## Step 7: Verify Security Controls

```bash
#!/bin/bash
# security-verification.sh

set -euo pipefail

echo "=== Falco Verification ==="

echo "1. Checking Falco pods..."
kubectl get pods -n falco
kubectl wait pods --for=condition=Ready --all -n falco --timeout=120s

echo ""
echo "2. Creating a test namespace..."
kubectl create namespace falco-test --dry-run=client -o yaml | kubectl apply -f -
kubectl label --overwrite ns falco-test \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/enforce-version=latest

echo ""
echo "3. Triggering a default Falco rule..."
kubectl create deployment nginx --image=nginx -n falco-test --dry-run=client -o yaml | kubectl apply -f -
kubectl wait --for=condition=Available deployment/nginx -n falco-test --timeout=120s
TEST_POD=$(kubectl get pods -n falco-test --selector=app=nginx -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n falco-test "$TEST_POD" -- cat /etc/shadow >/dev/null

echo ""
echo "4. Reviewing recent Falco alerts..."
kubectl logs -l app.kubernetes.io/name=falco -n falco -c falco --since=5m | grep Warning

echo "=== Verification Complete ==="
```

## Conclusion

Implementing Falco runtime security on Rancher adds an important layer of defense to your Kubernetes security posture. Combine with other security controls (network policies, RBAC, admission webhooks) for comprehensive defense-in-depth. Regular security audits and automated compliance checks ensure controls remain effective over time.
