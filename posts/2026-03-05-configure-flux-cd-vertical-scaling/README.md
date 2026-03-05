# How to Configure Flux CD Vertical Scaling for Controllers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Vertical Scaling, Performance Tuning, Resource Management

Description: Learn how to vertically scale Flux CD controllers by adjusting CPU, memory, concurrency, and other resource settings for large-scale clusters.

---

As your Kubernetes cluster grows in size and complexity, the default Flux CD controller resource allocations may become insufficient. Controllers might experience OOMKilled restarts, slow reconciliation times, or high CPU throttling. This guide explains how to vertically scale Flux CD controllers by adjusting resource requests and limits, concurrency settings, and other performance-related parameters.

## When to Consider Vertical Scaling

Signs that your Flux controllers need more resources include:

- Controllers restarting with OOMKilled status
- Reconciliation times increasing beyond acceptable thresholds
- High CPU throttling visible in monitoring dashboards
- `flux get all` showing many resources stuck in a "not ready" state
- Source downloads timing out for large repositories

## Understanding Controller Resource Usage

Each Flux controller has different resource consumption patterns:

- **source-controller** -- Memory-intensive when cloning large Git repositories or downloading large Helm charts. CPU usage spikes during artifact creation.
- **kustomize-controller** -- CPU-intensive when building and applying large Kustomize overlays. Memory usage scales with the size of generated manifests.
- **helm-controller** -- Both CPU and memory-intensive during Helm template rendering and release management.
- **notification-controller** -- Generally lightweight unless handling a high volume of events.

## Step 1: Check Current Resource Usage

Before adjusting resource settings, measure the current usage of your Flux controllers.

```bash
# Check current resource requests and limits for Flux controllers
kubectl get deployments -n flux-system -o custom-columns=\
NAME:.metadata.name,\
CPU_REQ:.spec.template.spec.containers[0].resources.requests.cpu,\
CPU_LIM:.spec.template.spec.containers[0].resources.limits.cpu,\
MEM_REQ:.spec.template.spec.containers[0].resources.requests.memory,\
MEM_LIM:.spec.template.spec.containers[0].resources.limits.memory

# Check actual resource consumption using metrics-server
kubectl top pods -n flux-system
```

## Step 2: Patch Controller Resources Using Kustomize

The recommended way to customize Flux controller resources is through a Kustomize patch in your flux-system configuration. This approach survives upgrades and bootstrap operations.

Create a patches directory in your flux-system Kustomization:

```yaml
# clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: patches/resource-limits.yaml
    target:
      kind: Deployment
      namespace: flux-system
```

Create the resource limits patch file:

```yaml
# clusters/my-cluster/flux-system/patches/resource-limits.yaml
# Increase resource allocations for all Flux controllers
apiVersion: apps/v1
kind: Deployment
metadata:
  name: not-used
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 2000m
              memory: 2Gi
```

## Step 3: Configure Per-Controller Resources

Different controllers have different resource needs. Apply specific patches to individual controllers.

```yaml
# clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Source controller needs more memory for large repos
  - patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: source-controller
        namespace: flux-system
      spec:
        template:
          spec:
            containers:
              - name: manager
                resources:
                  requests:
                    cpu: 250m
                    memory: 1Gi
                  limits:
                    cpu: 1000m
                    memory: 4Gi
  # Kustomize controller needs more CPU for building overlays
  - patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: kustomize-controller
        namespace: flux-system
      spec:
        template:
          spec:
            containers:
              - name: manager
                resources:
                  requests:
                    cpu: 500m
                    memory: 512Mi
                  limits:
                    cpu: 2000m
                    memory: 2Gi
  # Helm controller needs balanced CPU and memory
  - patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: helm-controller
        namespace: flux-system
      spec:
        template:
          spec:
            containers:
              - name: manager
                resources:
                  requests:
                    cpu: 250m
                    memory: 512Mi
                  limits:
                    cpu: 1000m
                    memory: 2Gi
```

## Step 4: Increase Controller Concurrency

Flux controllers process reconciliation requests sequentially by default with limited concurrency. Increasing the concurrent reconciliation count allows controllers to process more resources in parallel.

```yaml
# Patch to increase concurrency for the kustomize-controller
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          args:
            - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
            - --watch-all-namespaces=true
            - --log-level=info
            - --log-encoding=json
            - --enable-leader-election
            # Increase concurrent reconciliations from default (4) to 20
            - --concurrent=20
            # Increase requeue dependency interval
            - --requeue-dependency=10s
```

Apply a similar concurrency patch to the source-controller and helm-controller:

```yaml
# Patch to increase concurrency for the source-controller
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          args:
            - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
            - --watch-all-namespaces=true
            - --log-level=info
            - --log-encoding=json
            - --enable-leader-election
            - --storage-path=/data
            - --storage-adv-addr=source-controller.$(RUNTIME_NAMESPACE).svc.cluster.local.
            # Increase concurrent reconciliations
            - --concurrent=20
```

## Step 5: Configure Storage for Source Controller

The source-controller stores downloaded artifacts on disk. For clusters with many large repositories, you may need to increase the volume size.

```yaml
# Patch to increase source-controller storage volume
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
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
          emptyDir:
            # Increase the storage limit from default to 5Gi
            sizeLimit: 5Gi
```

## Step 6: Apply and Verify Changes

Commit the patches to your Git repository and let Flux apply them, or apply them manually.

```bash
# If managing patches via Git, commit and push
cd fleet-infra
git add clusters/my-cluster/flux-system/
git commit -m "Increase Flux controller resources and concurrency"
git push origin main

# Trigger reconciliation
flux reconcile kustomization flux-system --with-source

# Verify the updated resource allocations
kubectl get deployments -n flux-system -o custom-columns=\
NAME:.metadata.name,\
CPU_REQ:.spec.template.spec.containers[0].resources.requests.cpu,\
MEM_REQ:.spec.template.spec.containers[0].resources.requests.memory

# Check that all controllers are running with the new settings
kubectl get pods -n flux-system
```

## Monitoring Controller Performance

After adjusting resources, monitor the controllers to verify improvements.

```bash
# Watch resource consumption over time
kubectl top pods -n flux-system --containers

# Check reconciliation durations from controller logs
kubectl logs -n flux-system deployment/kustomize-controller | grep "duration"

# Verify no OOMKilled events
kubectl get events -n flux-system --field-selector reason=OOMKilling
```

## Resource Sizing Guidelines

The following table provides general starting points based on cluster size:

| Cluster Size | source-controller Memory | kustomize-controller CPU | helm-controller Memory | Concurrency |
|---|---|---|---|---|
| Small (< 50 resources) | 256Mi | 250m | 256Mi | 4 (default) |
| Medium (50-200 resources) | 1Gi | 500m | 512Mi | 10 |
| Large (200-1000 resources) | 2Gi | 1000m | 1Gi | 20 |
| Very Large (1000+ resources) | 4Gi | 2000m | 2Gi | 30+ |

These are guidelines. Actual resource requirements depend on the size of your repositories, the complexity of your Kustomize overlays, and the number of Helm charts being managed.

## Summary

Vertical scaling of Flux CD controllers involves increasing resource requests and limits, adjusting concurrency settings, and configuring storage for the source controller. The recommended approach is to use Kustomize patches in your flux-system directory so that changes persist across upgrades. Start by measuring current resource usage, apply targeted patches per controller based on their specific workload patterns, and monitor the results. For very large clusters, consider combining vertical scaling with horizontal scaling through sharding.
