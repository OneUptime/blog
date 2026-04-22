# How to Implement Runtime Threat Detection in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Threat-detection, Security, Falco, Kubernetes

Description: Guide to implementing real-time container threat detection in Rancher using Falco and custom rules.

## Introduction

How to Implement Runtime Threat Detection in Rancher is a critical security capability for hardening Rancher-managed Kubernetes environments. This guide provides practical implementation steps for security teams and platform engineers.

## Why This Matters

Container and Kubernetes environments face unique security challenges:
- Dynamic workloads create large attack surfaces
- Container escape vulnerabilities can compromise host systems
- Supply chain attacks target container images and dependencies
- Lateral movement is easy in flat networks

How to Implement Runtime Threat Detection in Rancher addresses these challenges by adding defense-in-depth controls.

## Prerequisites

- Rancher v2.7+ cluster with cluster admin access
- Kubernetes 1.26+
- Helm 3.x
- Rancher Monitoring installed for PrometheusRule-based alerts
- Linux worker nodes supported by Falco
- jq for audit commands
- Understanding of Linux security concepts

## Step 1: Assess Current Security Posture

```bash
# Run a basic security audit

kubectl get pods --all-namespaces -o json | jq -r '
  .items[] | 
  select(
    ([.spec.containers[]?.securityContext.privileged // false] | any) or
    ((.spec.securityContext.runAsUser // -1) == 0) or
    ([.spec.containers[]?.securityContext.runAsUser // -1] | any(. == 0))
  ) |
  [.metadata.namespace, .metadata.name] |
  @csv'

# Check for pods explicitly configured to run as UID 0
kubectl get pods --all-namespaces -o json | jq -r '
  .items[] |
  select(
    ((.spec.securityContext.runAsUser // -1) == 0) or
    ([.spec.containers[]?.securityContext.runAsUser // -1] | any(. == 0))
  ) |
  [.metadata.namespace, .metadata.name] |
  @csv'

# Check privileged pods
kubectl get pods --all-namespaces -o json | jq -r '.items[] | select([.spec.containers[]?.securityContext.privileged // false] | any) | 
  .metadata.namespace + "/" + .metadata.name'
```

## Step 2: Configure Security Feature

```yaml
# falco-values.yaml
metrics:
  enabled: true
  interval: 1m
  rulesCountersEnabled: true
  includeEmptyValues: true

serviceMonitor:
  create: true
  interval: 30s
  scrapeTimeout: 10s

falco:
  json_output: true
  webserver:
    enabled: true
    prometheus_metrics_enabled: true

customRules:
  local-rules.yaml: |-
    - rule: Shell Spawned in Container
      desc: Detect shell activity inside a running container
      condition: >
        spawned_process and
        container and
        shell_procs
      output: >
        Shell spawned in container
        (user=%user.name container_id=%container.id container_name=%container.name
        shell=%proc.name parent=%proc.pname cmdline=%proc.cmdline)
      priority: WARNING
      tags: [container, shell, runtime]
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
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update

helm upgrade --install falco falcosecurity/falco \
  --namespace falco \
  --create-namespace \
  --set tty=true \
  -f falco-values.yaml

kubectl get pods -n falco
kubectl logs -n falco daemonset/falco --tail=20
```

## Step 6: Create Alert Rules

```yaml
# security-prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: falco-runtime-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
  - name: falco.runtime.alerts
    rules:
    - alert: FalcoRuntimeDetection
      expr: |
        sum by (rule_name, priority, source) (
          increase(falcosecurity_falco_rules_matches_total[5m])
        ) > 0
      for: 0m
      labels:
        severity: warning
      annotations:
        summary: "Falco rule {{ $labels.rule_name }} triggered"
        description: "Falco detected runtime activity from source {{ $labels.source }} with priority {{ $labels.priority }}."
    
    - alert: FalcoOutputDrops
      expr: |
        increase(falcosecurity_falco_outputs_queue_num_drops_total[5m]) > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Falco output queue is dropping events"
```

## Step 7: Verify Security Controls

```bash
#!/bin/bash
# security-verification.sh

echo "=== Security Control Verification ==="

echo "1. Checking Falco pods..."
kubectl get pods -n falco

echo ""
echo "2. Checking Falco logs..."
kubectl logs -n falco daemonset/falco --tail=50 | grep -E "Falco initialized|local-rules.yaml|Shell Spawned in Container" || true

echo ""
echo "3. Checking for privileged containers..."
PRIV_COUNT=$(kubectl get pods --all-namespaces -o json | jq '[.items[].spec.containers[]?.securityContext.privileged // false | select(.)] | length')
echo "   Privileged containers: $PRIV_COUNT"

echo ""
echo "4. Checking namespaces with Pod Security Standards..."
kubectl get namespaces -L pod-security.kubernetes.io/enforce

echo ""
echo "5. Checking for host network pods..."
kubectl get pods --all-namespaces -o json | jq -r '.items[] | select(.spec.hostNetwork==true) | 
  .metadata.namespace + "/" + .metadata.name'

echo "=== Verification Complete ==="
```

## Conclusion

Implementing How to Implement Runtime Threat Detection in Rancher on Rancher adds an important layer of defense to your Kubernetes security posture. Combine with other security controls (network policies, RBAC, admission webhooks) for comprehensive defense-in-depth. Regular security audits and automated compliance checks ensure controls remain effective over time.
