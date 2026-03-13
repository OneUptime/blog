# How to Deploy Multiple Helm Controller Instances in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Sharding, Helm Controller, Helm, Scalability

Description: Learn how to deploy multiple helm-controller instances in Flux to scale HelmRelease reconciliation across dedicated shards.

---

## Introduction

The helm-controller manages HelmRelease resources by rendering Helm charts, installing or upgrading releases, and running tests. Helm operations can be resource-intensive, especially with large charts or complex value overrides. Deploying multiple helm-controller instances distributes this work, reducing reconciliation time and improving reliability.

## Prerequisites

- A running Kubernetes cluster (v1.25 or later)
- Flux CLI installed (v2.0 or later)
- kubectl configured with cluster access
- Flux bootstrapped on the cluster

## Why Shard the Helm Controller

Helm chart rendering and installation is more compute-intensive than kustomize builds. Each HelmRelease reconciliation involves template rendering, diffing against the live state, and potentially running Helm upgrade operations. With many HelmReleases, the single controller's work queue grows, increasing reconciliation intervals and delaying deployments.

## Step 1: Deploy a Helm Controller Shard

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: helm-controller-shard-1
  namespace: flux-system
  labels:
    app.kubernetes.io/component: helm-controller-shard-1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: helm-controller-shard-1
  template:
    metadata:
      labels:
        app: helm-controller-shard-1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
    spec:
      containers:
        - name: manager
          image: ghcr.io/fluxcd/helm-controller:v1.1.0
          args:
            - --watch-all-namespaces=true
            - --watch-label-selector=sharding.fluxcd.io/key=shard-1
            - --log-level=info
            - --log-encoding=json
            - --enable-leader-election=false
            - --concurrent=5
          ports:
            - containerPort: 8080
              name: http-prom
            - containerPort: 9440
              name: healthz
          livenessProbe:
            httpGet:
              path: /healthz
              port: healthz
          readinessProbe:
            httpGet:
              path: /readyz
              port: healthz
          resources:
            limits:
              cpu: 1000m
              memory: 1Gi
            requests:
              cpu: 200m
              memory: 512Mi
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            runAsNonRoot: true
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
      serviceAccountName: helm-controller
      terminationGracePeriodSeconds: 600
```

Note the `terminationGracePeriodSeconds: 600` setting. Helm operations can take several minutes, so the grace period should be long enough to allow in-progress upgrades to complete during pod shutdown.

## Step 2: Deploy Additional Shards

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: helm-controller-shard-2
  namespace: flux-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: helm-controller-shard-2
  template:
    metadata:
      labels:
        app: helm-controller-shard-2
    spec:
      containers:
        - name: manager
          image: ghcr.io/fluxcd/helm-controller:v1.1.0
          args:
            - --watch-all-namespaces=true
            - --watch-label-selector=sharding.fluxcd.io/key=shard-2
            - --log-level=info
            - --log-encoding=json
            - --enable-leader-election=false
            - --concurrent=5
          resources:
            limits:
              cpu: 1000m
              memory: 1Gi
            requests:
              cpu: 200m
              memory: 512Mi
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
      serviceAccountName: helm-controller
      terminationGracePeriodSeconds: 600
```

## Step 3: Update the Main Helm Controller

```yaml
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
          args:
            - --watch-all-namespaces=true
            - --watch-label-selector=!sharding.fluxcd.io/key
            - --log-level=info
            - --log-encoding=json
            - --enable-leader-election
            - --concurrent=5
```

## Step 4: Label HelmRelease Resources

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx-ingress
  namespace: flux-system
  labels:
    sharding.fluxcd.io/key: shard-1
spec:
  interval: 30m
  chart:
    spec:
      chart: ingress-nginx
      version: "4.x"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
  values:
    controller:
      replicaCount: 2
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: flux-system
  labels:
    sharding.fluxcd.io/key: shard-2
spec:
  interval: 30m
  chart:
    spec:
      chart: cert-manager
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
  values:
    installCRDs: true
```

## Step 5: Batch Label Existing HelmReleases

Use a script to distribute existing HelmReleases across shards.

```bash
#!/bin/bash
# Distribute HelmReleases evenly across shards
SHARDS=2
counter=0

for hr in $(kubectl get helmreleases -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}'); do
  ns=$(echo $hr | cut -d'/' -f1)
  name=$(echo $hr | cut -d'/' -f2)
  shard=$((counter % SHARDS + 1))

  kubectl label helmrelease "$name" -n "$ns" \
    sharding.fluxcd.io/key="shard-$shard" --overwrite

  counter=$((counter + 1))
done

echo "Distributed $counter HelmReleases across $SHARDS shards"
```

## Step 6: Verify the Setup

```bash
# Check all helm controller pods
kubectl get pods -n flux-system | grep helm-controller

# Verify each shard is reconciling
kubectl logs deployment/helm-controller-shard-1 -n flux-system --tail=10
kubectl logs deployment/helm-controller-shard-2 -n flux-system --tail=10

# Check HelmRelease status
flux get helmreleases -A
```

## Resource Considerations for Helm Shards

Helm operations are more memory-intensive than kustomize builds. Size your shard resources accordingly.

```yaml
# For shards handling large charts (e.g., Prometheus, Istio)
resources:
  limits:
    cpu: 2000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 1Gi

# For shards handling small charts
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 256Mi
```

## Best Practices

- Set `terminationGracePeriodSeconds` high enough for the longest Helm upgrade in each shard
- Keep `--concurrent` low (3-5) per shard to avoid API server pressure from parallel Helm operations
- Group HelmReleases with heavy charts (Prometheus, Istio) into their own shard
- Monitor Helm release duration metrics to identify imbalanced shards
- Use `/tmp` volumes for Helm chart rendering scratch space

## Conclusion

Deploying multiple helm-controller instances is critical for clusters with many HelmRelease resources. Helm operations are inherently heavier than kustomize builds, making sharding more impactful. By distributing HelmReleases across dedicated shards, you reduce reconciliation latency and prevent slow chart upgrades from blocking other releases.
