# How to Configure Flux CD for High Availability

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, high availability, kubernetes, gitops, reliability, production

Description: A step-by-step guide to configuring Flux CD for high availability in production Kubernetes clusters.

---

Running Flux CD in a production environment demands high availability. A single controller failure should not halt your GitOps pipeline. This guide walks you through configuring Flux CD for HA with multiple replicas, leader election, and proper scheduling constraints.

## Why High Availability Matters for Flux CD

In a standard Flux CD installation, each controller runs as a single replica. If that pod crashes, gets evicted, or its node goes down, reconciliation stops until Kubernetes reschedules the pod. In production, this gap can mean:

- Delayed deployments during critical incidents
- Missed automated image updates
- Stale cluster state during node failures

HA configuration ensures at least one instance of each controller is always running.

## Prerequisites

Before configuring HA, ensure you have:

- A Kubernetes cluster with at least 3 nodes
- Flux CD v2.0 or later installed
- `flux` CLI installed locally
- `kubectl` access to the cluster

## Step 1: Install Flux with HA Configuration

### Bootstrap with Multi-Replica Support

```bash
# Bootstrap Flux with HA components
flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --path=clusters/production \
  --personal=false \
  --components-extra=image-reflector-controller,image-automation-controller
```

### Create the HA Kustomization Patch

```yaml
# clusters/production/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Scale all controllers to 2 replicas
  - target:
      kind: Deployment
      name: "(source|kustomize|helm|notification)-controller"
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: controller
      spec:
        replicas: 2
        template:
          spec:
            containers:
              - name: manager
                args:
                  # Leader election ensures only one replica
                  # is actively reconciling at any time
                  - --leader-elect=true
                  - --log-level=info
                  - --log-encoding=json
            # Spread replicas across different nodes
            affinity:
              podAntiAffinity:
                requiredDuringSchedulingIgnoredDuringExecution:
                  - labelSelector:
                      matchExpressions:
                        - key: app
                          operator: In
                          values:
                            - $(CONTROLLER_NAME)
                    topologyKey: kubernetes.io/hostname
```

## Step 2: Configure Leader Election

Leader election ensures only one replica is active while the other is on standby. Flux controllers support leader election natively.

```yaml
# clusters/production/flux-system/leader-election-patch.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
patches:
  # Source controller leader election
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: source-controller
      spec:
        replicas: 2
        template:
          spec:
            containers:
              - name: manager
                args:
                  - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
                  - --watch-all-namespaces=true
                  - --log-level=info
                  - --log-encoding=json
                  - --enable-leader-election=true
                  # Customize lease duration for faster failover
                  - --leader-election-lease-duration=35s
                  - --leader-election-renew-deadline=30s
                  - --leader-election-retry-period=5s
                  - --storage-path=/data
                  - --storage-adv-addr=source-controller.$(RUNTIME_NAMESPACE).svc.cluster.local.

  # Kustomize controller leader election
  - target:
      kind: Deployment
      name: kustomize-controller
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: kustomize-controller
      spec:
        replicas: 2
        template:
          spec:
            containers:
              - name: manager
                args:
                  - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
                  - --watch-all-namespaces=true
                  - --log-level=info
                  - --log-encoding=json
                  - --enable-leader-election=true
                  - --leader-election-lease-duration=35s
                  - --leader-election-renew-deadline=30s
                  - --leader-election-retry-period=5s

  # Helm controller leader election
  - target:
      kind: Deployment
      name: helm-controller
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: helm-controller
      spec:
        replicas: 2
        template:
          spec:
            containers:
              - name: manager
                args:
                  - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
                  - --watch-all-namespaces=true
                  - --log-level=info
                  - --log-encoding=json
                  - --enable-leader-election=true
                  - --leader-election-lease-duration=35s
                  - --leader-election-renew-deadline=30s
                  - --leader-election-retry-period=5s
```

## Step 3: Configure Pod Anti-Affinity

Ensure controller replicas run on different nodes so a single node failure does not take down both replicas.

```yaml
# clusters/production/flux-system/anti-affinity-patch.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
patches:
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: source-controller
      spec:
        template:
          spec:
            # Prefer scheduling on different zones for zone-level HA
            topologySpreadConstraints:
              - maxSkew: 1
                topologyKey: topology.kubernetes.io/zone
                whenUnsatisfiable: ScheduleAnyway
                labelSelector:
                  matchLabels:
                    app: source-controller
              - maxSkew: 1
                topologyKey: kubernetes.io/hostname
                whenUnsatisfiable: DoNotSchedule
                labelSelector:
                  matchLabels:
                    app: source-controller
```

## Step 4: Configure Pod Disruption Budgets

Prevent Kubernetes from evicting all controller replicas during maintenance.

```yaml
# clusters/production/flux-system/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: source-controller
  namespace: flux-system
spec:
  # At least 1 replica must be available at all times
  minAvailable: 1
  selector:
    matchLabels:
      app: source-controller
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: kustomize-controller
  namespace: flux-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: kustomize-controller
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: helm-controller
  namespace: flux-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: helm-controller
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: notification-controller
  namespace: flux-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: notification-controller
```

## Step 5: Configure Resource Requests and Limits

Properly size controllers to prevent OOM kills under load.

```yaml
# clusters/production/flux-system/resources-patch.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
patches:
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: source-controller
      spec:
        template:
          spec:
            containers:
              - name: manager
                resources:
                  requests:
                    cpu: 200m
                    memory: 256Mi
                  limits:
                    cpu: "1"
                    memory: 1Gi

  - target:
      kind: Deployment
      name: kustomize-controller
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: kustomize-controller
      spec:
        template:
          spec:
            containers:
              - name: manager
                resources:
                  requests:
                    cpu: 200m
                    memory: 256Mi
                  limits:
                    cpu: "1"
                    memory: 1Gi

  - target:
      kind: Deployment
      name: helm-controller
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: helm-controller
      spec:
        template:
          spec:
            containers:
              - name: manager
                resources:
                  requests:
                    cpu: 200m
                    memory: 512Mi
                  limits:
                    cpu: "1"
                    memory: 2Gi
```

## Step 6: Set Up Persistent Storage for Source Controller

Use persistent volumes so the source-controller artifact cache survives pod restarts.

```yaml
# clusters/production/flux-system/source-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: source-controller-data
  namespace: flux-system
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
```

```yaml
# Patch source-controller to use the PVC
# clusters/production/flux-system/source-storage-patch.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
patches:
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: source-controller
      spec:
        template:
          spec:
            containers:
              - name: manager
                volumeMounts:
                  - name: data
                    mountPath: /data
            volumes:
              - name: data
                persistentVolumeClaim:
                  claimName: source-controller-data
```

## Step 7: Verify the HA Setup

```bash
# Check that all controllers have 2 replicas
kubectl get deployments -n flux-system

# Verify pods are spread across different nodes
kubectl get pods -n flux-system -o wide

# Check leader election leases
kubectl get leases -n flux-system

# Verify PDBs are in place
kubectl get pdb -n flux-system

# Run Flux health check
flux check

# Simulate a failure by deleting one pod
kubectl delete pod -n flux-system -l app=source-controller --field-selector=status.phase=Running --wait=false

# Verify the remaining replica takes over
kubectl get pods -n flux-system -l app=source-controller -w
```

## Monitoring the HA Setup

```yaml
# monitoring/ha-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-ha-alerts
  namespace: flux-system
spec:
  groups:
    - name: flux-ha
      rules:
        # Alert when a controller has fewer than 2 replicas
        - alert: FluxControllerDegraded
          expr: |
            kube_deployment_status_replicas_available{
              namespace="flux-system",
              deployment=~".*-controller"
            } < 2
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "{{ $labels.deployment }} has fewer than 2 replicas"

        # Alert when leader election fails
        - alert: FluxLeaderElectionFailing
          expr: |
            increase(leader_election_master_status{
              namespace="flux-system"
            }[5m]) > 3
          labels:
            severity: warning
          annotations:
            summary: "Frequent leader changes in {{ $labels.pod }}"
```

## Summary

To run Flux CD in high availability:

1. **Scale to 2+ replicas** with leader election enabled
2. **Spread across nodes** using pod anti-affinity and topology constraints
3. **Protect with PDBs** to prevent simultaneous eviction
4. **Size resources properly** to avoid OOM kills
5. **Use persistent storage** for source-controller artifact cache
6. **Monitor replica count** and leader election health

This configuration ensures your GitOps pipeline remains operational even during node failures, maintenance windows, and pod evictions.
