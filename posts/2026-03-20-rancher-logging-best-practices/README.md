# How to Implement Logging Best Practices in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Logging, Fluentd, Elasticsearch, Best-practices

Description: Guide to logging best practices in Rancher for centralized log management and efficient troubleshooting.

## Introduction

These operational best practices represent the accumulated knowledge from operating Rancher at enterprise scale. Following them helps avoid common pitfalls and ensures your Rancher environment is reliable, secure, and maintainable.

## Core Principles

1. **Defense in Depth**: Layer multiple controls
2. **Least Privilege**: Grant only necessary permissions
3. **Automation**: Reduce manual toil and human error
4. **Observability**: Instrument everything
5. **Documentation**: Keep runbooks current

## Best Practice 1: Infrastructure as Code

Always define your Rancher configuration as code:

```yaml
# cluster-definition.yaml - Define clusters declaratively

apiVersion: provisioning.cattle.io/v1
kind: Cluster
metadata:
  name: production-us-east
  namespace: fleet-default
  labels:
    env: production
    region: us-east
    tier: critical
spec:
  cloudCredentialSecretName: cattle-global-data:cc-aws-production
  kubernetesVersion: v1.28.8+rke2r1
  rkeConfig:
    machinePools:
    - name: control-plane
      quantity: 3
      controlPlaneRole: true
      etcdRole: true
      workerRole: false
      machineConfigRef:
        kind: Amazonec2Config
        name: control-plane-m5-xlarge
    - name: workers
      quantity: 5
      controlPlaneRole: false
      etcdRole: false
      workerRole: true
      machineConfigRef:
        kind: Amazonec2Config
        name: worker-m5-2xlarge
```

## Best Practice 2: Namespace Hierarchy

Organize namespaces with consistent naming and labeling:

```bash
# Namespace naming convention
# <team>-<application>-<environment>
kubectl create namespace payments-api-prod
kubectl create namespace payments-api-staging
kubectl create namespace data-pipeline-prod

# Apply standard labels
kubectl label namespace payments-api-prod   team=payments   app=api   env=production   tier=critical   cost-center=payments-team

# If the namespace belongs to an existing Rancher project, use the project annotation
kubectl annotate namespace payments-api-prod   field.cattle.io/projectId=c-m-abcde:p-vwxyz
```

## Best Practice 3: Resource Quotas and LimitRanges

Every namespace should have resource limits:

```yaml
# namespace-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: standard-quota
  namespace: payments-api-prod
spec:
  hard:
    requests.cpu: "16"
    requests.memory: "32Gi"
    limits.cpu: "32"
    limits.memory: "64Gi"
    persistentvolumeclaims: "10"
    services: "20"
    pods: "50"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: payments-api-prod
spec:
  limits:
  - type: Container
    default:
      cpu: "500m"
      memory: "512Mi"
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"
    max:
      cpu: "4"
      memory: "8Gi"
    min:
      cpu: "50m"
      memory: "64Mi"
```

## Best Practice 4: Network Policies

Implement zero-trust networking:

```yaml
# default-deny-all.yaml - Start with deny all
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: payments-api-prod
spec:
  podSelector: {}          # Selects all pods
  policyTypes:
  - Ingress
  - Egress
---
# allow-internal.yaml - Allow only necessary traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-payments-api
  namespace: payments-api-prod
spec:
  podSelector:
    matchLabels:
      app: payments-api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: database
    ports:
    - protocol: TCP
      port: 5432
```

## Best Practice 5: Pod Security and Availability

Enforce strict pod security standards while protecting service availability:

```yaml
# pod-availability.yaml - PodDisruptionBudget for availability
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payments-api-pdb
  namespace: payments-api-prod
spec:
  minAvailable: 2          # Always keep 2 pods running
  selector:
    matchLabels:
      app: payments-api
---
# pod-security.yaml - Apply PSS to namespace
apiVersion: v1
kind: Namespace
metadata:
  name: payments-api-prod
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: v1.28
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: v1.28
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: v1.28
```

## Best Practice 6: Monitoring and Alerting

```yaml
# critical-service-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: critical-service-slos
  namespace: cattle-monitoring-system
spec:
  groups:
  - name: slo.rules
    rules:
    # Availability SLO: 99.9%
    - alert: ServiceAvailabilityBelowSLO
      expr: |
        (1 - 
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          / sum(rate(http_requests_total[5m]))
        ) < 0.999
      for: 5m
      labels:
        severity: critical
        slo: availability
      annotations:
        summary: "Service availability below 99.9% SLO"
    
    # Latency SLO: P99 < 500ms
    - alert: ServiceLatencyAboveSLO
      expr: |
        histogram_quantile(0.99,
          sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
        ) > 0.5
      for: 5m
      labels:
        severity: warning
        slo: latency
```

## Best Practice 7: GitOps for Everything

```yaml
# Use Fleet for all cluster configuration
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: cluster-config
  namespace: fleet-default
spec:
  repo: https://github.com/your-org/cluster-configs
  branch: main
  paths:
  - namespaces/     # Namespace definitions
  - quotas/         # Resource quotas
  - network-policies/  # Network policies
  - rbac/           # RBAC configurations
  targets:
  - clusterSelector:
      matchLabels:
        env: production
```

## Best Practice 8: Regular Audits

```bash
#!/bin/bash
# monthly-audit.sh - Run monthly

echo "=== Monthly Rancher Audit ==="
date

echo ""
echo "1. Certificate expiry check (cert-manager):"
kubectl get certificates.cert-manager.io -A \
  -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,EXPIRY:.status.notAfter' \
  2>/dev/null || echo "cert-manager not installed"

echo ""
echo "2. Unused resources:"
kubectl get namespaces -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' | while read -r ns; do
  pod_count=$(kubectl get pods -n "$ns" --no-headers 2>/dev/null | wc -l)
  [ "$pod_count" -eq 0 ] && echo "Empty namespace: $ns"
done

echo ""
echo "3. Pod security violations:"
kubectl get pods --all-namespaces -o json | jq -r '
  .items[]
  | select(any((.spec.initContainers // []) + (.spec.containers // []) + (.spec.ephemeralContainers // []); .securityContext?.privileged == true))
  | .metadata.namespace + "/" + .metadata.name + " [PRIVILEGED]"
'

echo ""
echo "4. Nodes at capacity:"
kubectl top nodes 2>/dev/null || echo "metrics-server not available"

echo "=== Audit Complete ==="
```

## Conclusion

Implementing operational best practices in Rancher requires discipline and consistency. The configurations and practices in this guide provide a strong foundation for a production-grade Rancher environment. Regular audits, automated compliance checks, and a culture of continuous improvement ensure these best practices remain effective as your environment evolves.
