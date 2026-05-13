# How to Use CEL Expressions for Prometheus Operator Health in Flux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, CEL, Prometheus, Monitoring, Health Check

Description: Learn how to use CEL expressions in Flux to evaluate Prometheus Operator custom resource health for reliable monitoring infrastructure deployments.

---

## Introduction

The Prometheus Operator manages Prometheus instances, Alertmanager clusters, and related monitoring resources through Kubernetes custom resources. Some of these resources, like the Prometheus and Alertmanager CRDs, have status conditions that Flux can check. Others, like ServiceMonitors and PrometheusRules, are configuration resources whose status reporting is optional and feature-gated. CEL expressions in Flux let you define precise health criteria for Prometheus Operator workload resource types, ensuring your monitoring infrastructure is fully operational before applications that depend on it are deployed.

## Prerequisites

- A Kubernetes cluster running a version supported by your Flux release
- Flux v2.5 or later installed on the cluster
- Prometheus Operator (kube-prometheus-stack or standalone) installed
- kubectl configured to access the cluster
- A Git repository connected to Flux via a GitRepository source

## Prometheus Operator Resource Types

The Prometheus Operator defines several custom resources with varying health check capabilities:

- **Prometheus**: Has status conditions including `Available` and `Reconciled`
- **Alertmanager**: Has status conditions including `Available` and `Reconciled`
- **ThanosRuler**: Has status conditions
- **ServiceMonitor**: Configuration resource; status is optional and feature-gated in Prometheus Operator
- **PodMonitor**: Configuration resource; status is optional and feature-gated in Prometheus Operator
- **PrometheusRule**: Configuration resource; status is optional and feature-gated in Prometheus Operator
- **AlertmanagerConfig**: Configuration resource; status is optional and feature-gated in Prometheus Operator

## Health Checking Prometheus Instances

A Prometheus custom resource manages a Prometheus server deployment. Use CEL to check its availability:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: prometheus
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/prometheus
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 10m
  healthChecks:
    - apiVersion: monitoring.coreos.com/v1
      kind: Prometheus
      name: main
      namespace: monitoring
  healthCheckExprs:
    - apiVersion: monitoring.coreos.com/v1
      kind: Prometheus
      current: >-
        status.conditions.exists(c, c.type == 'Available' && c.status == 'True')
      failed: >-
        status.conditions.exists(c, c.type == 'Available' && c.status in ['False', 'Degraded'])
```

The corresponding Prometheus resource:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: main
  namespace: monitoring
spec:
  replicas: 2
  retention: 30d
  serviceAccountName: prometheus
  serviceMonitorSelector:
    matchLabels:
      team: platform
  ruleSelector:
    matchLabels:
      team: platform
  resources:
    requests:
      cpu: 500m
      memory: 2Gi
    limits:
      cpu: 2000m
      memory: 4Gi
  storage:
    volumeClaimTemplate:
      spec:
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 100Gi
```

## Checking Both Available and Reconciled Conditions

For stronger verification, check that the Prometheus instance is both available and reconciled:

```yaml
healthChecks:
  - apiVersion: monitoring.coreos.com/v1
    kind: Prometheus
    name: main
    namespace: monitoring
healthCheckExprs:
  - apiVersion: monitoring.coreos.com/v1
    kind: Prometheus
    current: >-
      status.conditions.exists(c, c.type == 'Available' && c.status == 'True')
      && status.conditions.exists(c, c.type == 'Reconciled' && c.status == 'True')
    failed: >-
      status.conditions.exists(c, c.type == 'Available' && c.status in ['False', 'Degraded'])
      || status.conditions.exists(c, c.type == 'Reconciled' && c.status == 'False')
```

The `Reconciled` condition indicates that the operator has successfully processed the Prometheus spec and created or updated the underlying StatefulSet.

## Health Checking Alertmanager

Alertmanager instances have similar status conditions:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: alertmanager
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/alertmanager
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 10m
  healthChecks:
    - apiVersion: monitoring.coreos.com/v1
      kind: Alertmanager
      name: main
      namespace: monitoring
  healthCheckExprs:
    - apiVersion: monitoring.coreos.com/v1
      kind: Alertmanager
      current: >-
        status.conditions.exists(c, c.type == 'Available' && c.status == 'True')
        && status.conditions.exists(c, c.type == 'Reconciled' && c.status == 'True')
      failed: >-
        status.conditions.exists(c, c.type == 'Available' && c.status in ['False', 'Degraded'])
        || status.conditions.exists(c, c.type == 'Reconciled' && c.status == 'False')
```

## Handling Resources Without Status Conditions

ServiceMonitors, PodMonitors, and PrometheusRules are configuration resources. Unless you have enabled Prometheus Operator's status reporting for configuration resources and defined matching CEL expressions, omit them from health checks and rely on Flux's apply step to verify that the API server accepts them:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: monitoring-config
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/monitoring-config
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 2m
```

This Kustomization deploys ServiceMonitors and PrometheusRules and verifies they are accepted by the API server without waiting for health conditions.

## Complete Monitoring Stack Health Checks

Set up health checks for the entire monitoring stack:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: monitoring-crds
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/monitoring/crds
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 2m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: monitoring-operator
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/monitoring/operator
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: monitoring-crds
  wait: true
  timeout: 5m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: prometheus-instance
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/monitoring/prometheus
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: monitoring-operator
  timeout: 10m
  healthChecks:
    - apiVersion: monitoring.coreos.com/v1
      kind: Prometheus
      name: main
      namespace: monitoring
    - apiVersion: monitoring.coreos.com/v1
      kind: Alertmanager
      name: main
      namespace: monitoring
  healthCheckExprs:
    - apiVersion: monitoring.coreos.com/v1
      kind: Prometheus
      current: >-
        status.conditions.exists(c, c.type == 'Available' && c.status == 'True')
      failed: >-
        status.conditions.exists(c, c.type == 'Available' && c.status in ['False', 'Degraded'])
    - apiVersion: monitoring.coreos.com/v1
      kind: Alertmanager
      current: >-
        status.conditions.exists(c, c.type == 'Available' && c.status == 'True')
      failed: >-
        status.conditions.exists(c, c.type == 'Available' && c.status in ['False', 'Degraded'])
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: monitoring-rules
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/monitoring/rules
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: prometheus-instance
  timeout: 2m
```

This creates a dependency chain: CRDs, then operator, then Prometheus and Alertmanager instances (with CEL health checks), and finally the monitoring rules and ServiceMonitors.

## Checking Prometheus Replica Count

For Prometheus instances with multiple replicas, verify the available replicas:

```yaml
healthChecks:
  - apiVersion: monitoring.coreos.com/v1
    kind: Prometheus
    name: main
    namespace: monitoring
healthCheckExprs:
  - apiVersion: monitoring.coreos.com/v1
    kind: Prometheus
    current: >-
      status.conditions.exists(c, c.type == 'Available' && c.status == 'True')
      && has(status.availableReplicas) && status.availableReplicas >= 2
    failed: >-
      status.conditions.exists(c, c.type == 'Available' && c.status in ['False', 'Degraded'])
```

This expression checks that at least 2 replicas are available, matching the desired replica count.

## Health Checking ThanosRuler

If you use Thanos for long-term storage, health check the ThanosRuler:

```yaml
healthChecks:
  - apiVersion: monitoring.coreos.com/v1
    kind: ThanosRuler
    name: thanos-ruler
    namespace: monitoring
healthCheckExprs:
  - apiVersion: monitoring.coreos.com/v1
    kind: ThanosRuler
    current: >-
      status.conditions.exists(c, c.type == 'Available' && c.status == 'True')
    failed: >-
      status.conditions.exists(c, c.type == 'Available' && c.status in ['False', 'Degraded'])
```

## Debugging Prometheus Operator Health Check Failures

When a Prometheus Operator health check fails:

```bash
# Check Kustomization status

flux get kustomizations --namespace flux-system

# Check Prometheus resource status
kubectl get prometheus main -n monitoring -o yaml

# Check conditions
kubectl get prometheus main -n monitoring -o jsonpath='{.status.conditions}' | jq .

# Check operator logs
kubectl logs -n monitoring deploy/prometheus-operator --tail=50

# Check the underlying StatefulSet
kubectl get statefulset prometheus-main -n monitoring

# Check pods
kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus
```

Common Prometheus Operator health check failures:

- Insufficient cluster resources for the Prometheus pods
- Storage provisioning failure (PVC not binding)
- RBAC permissions missing for the Prometheus ServiceAccount
- Invalid Prometheus spec (unsupported configuration)
- The operator itself is not running or unhealthy

## Conclusion

CEL expressions for Prometheus Operator health in Flux let you verify that your monitoring infrastructure is fully operational at each stage of deployment. By checking `Available` and `Reconciled` conditions on Prometheus and Alertmanager instances, you ensure these critical services are running before deploying ServiceMonitors and alerting rules. For configuration resources without status conditions, Flux's apply step provides basic API-server validation. This layered approach with Kustomization dependencies creates a robust monitoring pipeline where each component is verified before the next stage deploys.
