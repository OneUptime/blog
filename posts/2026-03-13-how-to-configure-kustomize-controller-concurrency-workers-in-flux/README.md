# How to Configure Kustomize Controller Concurrency Workers in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Concurrency, Kustomize Controller

Description: Speed up manifest application across your cluster by increasing the kustomize-controller concurrency workers in Flux.

---

## The Role of the Kustomize Controller

The kustomize-controller is the workhorse of a Flux installation. It takes source artifacts fetched by the source-controller, runs Kustomize builds, performs variable substitution, validates the output, and applies the resulting manifests to your Kubernetes cluster. When you have many Kustomization objects, the default single-worker configuration becomes a significant bottleneck.

## Default Concurrency

The kustomize-controller defaults to processing four Kustomizations concurrently (`--concurrent=4`). For a cluster with five or ten Kustomization objects this is usually fine. However, in multi-tenant clusters or large platform setups with 50 or more Kustomizations, sequential processing means some reconciliations wait minutes before they even start.

## Increasing the Worker Count

The `--concurrent` flag controls how many Kustomization objects can be reconciled simultaneously.

### Create a Kustomize Patch

```yaml
# clusters/my-cluster/flux-system/kustomize-controller-patch.yaml
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
            - --concurrent=20
```

### Add the Patch to Your Kustomization File

```yaml
# clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: kustomize-controller-patch.yaml
    target:
      kind: Deployment
      name: kustomize-controller
```

### Apply the Change

```bash
git add clusters/my-cluster/flux-system/
git commit -m "Increase kustomize-controller concurrency to 20"
git push
```

## How to Choose the Right Value

The kustomize-controller is typically more CPU-intensive than the source-controller because it runs Kustomize builds and applies manifests. Start conservatively:

- 10 to 20 Kustomizations: set `--concurrent=5`
- 20 to 50 Kustomizations: set `--concurrent=10`
- 50 to 100 Kustomizations: set `--concurrent=20`
- Over 100 Kustomizations: set `--concurrent=20` and monitor before going higher

Each concurrent worker will hold built manifests in memory, so memory usage scales roughly linearly with the concurrency value multiplied by average manifest size.

## Verifying the Configuration

```bash
kubectl get deployment kustomize-controller -n flux-system \
  -o jsonpath='{.spec.template.spec.containers[0].args}' | tr ',' '\n'
```

Look for `--concurrent=20` in the output.

## Adjusting Resource Limits

With higher concurrency, the controller needs more resources:

```yaml
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
              cpu: "1"
              memory: 512Mi
            limits:
              cpu: "4"
              memory: 2Gi
```

## Monitoring

Check the controller metrics to see how many workers are active:

```bash
kubectl exec -n flux-system deploy/kustomize-controller -- \
  curl -s localhost:8080/metrics | grep controller_runtime_active_workers
```

If active workers consistently match the concurrency limit, consider increasing the value further or investigating whether individual Kustomizations are taking too long to reconcile.

## Summary

Increasing the kustomize-controller concurrency is essential for large Flux installations. Use a Kustomize patch to set the `--concurrent` flag, raise resource limits proportionally, and monitor the active workers metric to find the optimal value for your workload.
