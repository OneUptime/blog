# How to Use CEL Expressions for Prometheus Operator Health in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, CEL, Prometheus, Monitoring, Health Checks

Description: Learn how to use CEL expressions in Flux to evaluate Prometheus Operator custom resource health for reliable monitoring infrastructure deployments.

---

## Introduction

The Prometheus Operator manages Prometheus instances, Alertmanager clusters, and related monitoring resources through Kubernetes custom resources. Some of these resources, like the Prometheus and Alertmanager CRDs, have status conditions that Flux can check. Others, like ServiceMonitors and PrometheusRules, do not have status conditions at all. CEL expressions in Flux let you define precise health criteria for each Prometheus Operator resource type, ensuring your monitoring infrastructure is fully operational before applications that depend on it are deployed.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- Prometheus Operator (kube-prometheus-stack or standalone) installed
- kubectl configured to access the cluster
- A Git repository connected to Flux via a GitRepository source

## Prometheus Operator Resource Types

The Prometheus Operator defines several custom resources with varying health check capabilities:

- **Prometheus**: Has status conditions including `Available` and `Reconciled`
- **Alertmanager**: Has status conditions including `Available` and `Reconciled`
- **ThanosRuler**: Has status conditions
- **ServiceMonitor**: No status conditions (configuration only)
- **PodMonitor**: No status conditions (configuration only)
- **PrometheusRule**: No status conditions (configuration only)
- **AlertmanagerConfig**: No status conditions (configuration only)

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
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Available' && c.status == 'True')
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
    cel:
      healthyWhen: >-
        status.conditions.exists(c, c.type == 'Available' && c.status == 'True')
        && status.conditions.exists(c, c.type == 'Reconciled' && c.status == 'True')
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
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Available' && c.status == 'True')
          && status.conditions.exists(c, c.type == 'Reconciled' && c.status == 'True')
```

## Handling Resources Without Status Conditions

ServiceMonitors, PodMonitors, and PrometheusRules do not have status conditions. For these resources, use `wait: true` on the Kustomization to verify they are successfully applied, or omit them from health checks entirely:

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
  wait: true
  timeout: 2m
```

This Kustomization deploys ServiceMonitors and PrometheusRules and verifies they are accepted by the API server without checking for health conditions.

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
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Available' && c.status == 'True')
    - apiVersion: monitoring.coreos.com/v1
      kind: Alertmanager
      name: main
      namespace: monitoring
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Available' && c.status == 'True')
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
  wait: true
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
    cel:
      healthyWhen: >-
        status.conditions.exists(c, c.type == 'Available' && c.status == 'True')
        && has(status.availableReplicas) && status.availableReplicas >= 2
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
    cel:
      healthyWhen: >-
        status.conditions.exists(c, c.type == 'Available' && c.status == 'True')
```

## Debugging Prometheus Operator Health Check Failures

When a Prometheus Operator health check fails:

```bash
# Check Kustomization status
flux get kustomization prometheus

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

CEL expressions for Prometheus Operator health in Flux let you verify that your monitoring infrastructure is fully operational at each stage of deployment. By checking `Available` and `Reconciled` conditions on Prometheus and Alertmanager instances, you ensure these critical services are running before deploying ServiceMonitors and alerting rules. For resources without status conditions, using `wait: true` provides basic deployment verification. This layered approach with Kustomization dependencies creates a robust monitoring pipeline where each component is verified before the next stage deploys.
