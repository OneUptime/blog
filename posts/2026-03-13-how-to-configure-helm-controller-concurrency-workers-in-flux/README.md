# How to Configure Helm Controller Concurrency Workers in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Concurrency, Helm Controller

Description: Learn how to increase the helm-controller concurrency workers in Flux so multiple HelmRelease objects can be installed and upgraded in parallel.

---

## What the Helm Controller Does

The helm-controller manages the lifecycle of HelmRelease objects. It downloads Helm charts (via artifacts produced by the source-controller), renders templates, and runs Helm install, upgrade, test, and rollback operations against your cluster. Each of these operations can take several seconds, and when you have many HelmRelease objects the default sequential processing becomes a major performance bottleneck.

## Default Behavior

Like the other Flux controllers, the helm-controller defaults to a concurrency of four (`--concurrent=4`). While this handles moderate workloads, in a cluster with 30 or more HelmReleases a full reconciliation cycle can still take many minutes when individual installs or upgrades are slow.

## Configuring Concurrency

Use the `--concurrent` flag to control the number of parallel workers.

### Create the Patch

```yaml
# clusters/my-cluster/flux-system/helm-controller-patch.yaml
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
            - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
            - --watch-all-namespaces=true
            - --log-level=info
            - --log-encoding=json
            - --enable-leader-election
            - --concurrent=10
```

### Reference the Patch

```yaml
# clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: helm-controller-patch.yaml
    target:
      kind: Deployment
      name: helm-controller
```

### Push the Change

```bash
git add clusters/my-cluster/flux-system/
git commit -m "Increase helm-controller concurrency to 10"
git push
```

## Concurrency Guidelines for Helm

Helm operations are heavier than Kustomize builds because each one involves template rendering and a full Helm SDK install or upgrade cycle. The helm-controller also stores release state in Secrets, which means the Kubernetes API server sees additional load from concurrent operations.

Recommended starting points:

- Under 20 HelmReleases: `--concurrent=5`
- 20 to 50 HelmReleases: `--concurrent=10`
- Over 50 HelmReleases: `--concurrent=15` and monitor API server load

## Resource Allocation

Helm template rendering can be memory-intensive, especially for large charts. Adjust resource limits when increasing concurrency:

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
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "2"
              memory: 2Gi
```

## Verifying the Change

```bash
kubectl get deployment helm-controller -n flux-system \
  -o jsonpath='{.spec.template.spec.containers[0].args}' | tr ',' '\n'
```

## Watching for API Server Pressure

Because the helm-controller creates and updates Secrets for each release, high concurrency can put pressure on the Kubernetes API server. Monitor API server latency and error rates after increasing concurrency:

```bash
kubectl get --raw /metrics | grep apiserver_request_duration_seconds
```

If you see elevated latency, reduce the concurrency value or increase API server resources.

## Summary

Tuning the helm-controller concurrency is critical for clusters with many Helm-based workloads. Set the `--concurrent` flag through a Kustomize patch, scale resources appropriately, and keep an eye on both controller metrics and API server health to find the right balance.
