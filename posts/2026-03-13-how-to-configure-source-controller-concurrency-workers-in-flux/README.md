# How to Configure Source Controller Concurrency Workers in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Concurrency, Source Controller

Description: Learn how to tune the source-controller concurrency workers in Flux to speed up artifact fetching across many GitRepository and HelmRepository sources.

---

## Why Source Controller Concurrency Matters

The Flux source-controller is responsible for fetching artifacts from Git repositories, Helm repositories, OCI registries, and S3-compatible buckets. By default it processes one reconciliation at a time per source kind. When you manage dozens or hundreds of sources, this single-threaded behavior creates a bottleneck that delays the entire delivery pipeline.

Increasing the number of concurrent reconciliation workers lets the controller fetch multiple sources in parallel, which significantly reduces the time between a commit being pushed and the corresponding manifests being applied to your cluster.

## Default Behavior

Out of the box, the source-controller starts with a concurrency value of one for each source kind. This means that even if 50 GitRepository objects are due for reconciliation, they queue up and are processed sequentially. The same applies to HelmRepository, HelmChart, OCIRepository, and Bucket resources.

## How to Increase Concurrency

You configure concurrency by passing command-line flags to the source-controller deployment. The relevant flags are:

- `--concurrent` sets the number of concurrent reconciliation workers across all source kinds.

### Step 1 - Patch the Deployment

Create a Kustomize patch that overrides the controller arguments:

```yaml
# clusters/my-cluster/flux-system/source-controller-patch.yaml
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
            - --storage-addr=:9090
            - --storage-adv-addr=source-controller.flux-system.svc.cluster.local.
            - --concurrent=10
```

### Step 2 - Reference the Patch in Your Kustomization

```yaml
# clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: source-controller-patch.yaml
    target:
      kind: Deployment
      name: source-controller
```

### Step 3 - Commit and Push

```bash
git add clusters/my-cluster/flux-system/
git commit -m "Increase source-controller concurrency to 10"
git push
```

Flux will pick up the change and restart the source-controller with the new concurrency setting.

## Choosing a Concurrency Value

A good starting point is to match the number of workers to roughly half the number of source objects you manage. For example, if you have 40 GitRepository resources, setting `--concurrent=20` is a reasonable first choice. Monitor CPU and memory usage after making the change because each additional worker increases resource consumption.

## Verifying the Change

After the controller restarts, confirm that the flag was applied:

```bash
kubectl get deployment source-controller -n flux-system -o jsonpath='{.spec.template.spec.containers[0].args}'
```

You should see `--concurrent=10` (or whatever value you chose) in the output.

## Monitoring the Impact

Use the built-in Prometheus metrics exposed by the source-controller to observe the effect:

```bash
# Check how many reconciliations are in progress
kubectl exec -n flux-system deploy/source-controller -- \
  curl -s localhost:8080/metrics | grep controller_runtime_active_workers
```

If the active workers metric stays close to your concurrency limit, the controller is fully utilizing the additional capacity.

## Resource Considerations

Increasing concurrency means the controller will use more CPU and memory. Make sure the resource requests and limits on the source-controller deployment are adjusted accordingly. A common pattern is to add a resource patch alongside the concurrency patch:

```yaml
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
              cpu: 500m
              memory: 256Mi
            limits:
              cpu: "2"
              memory: 1Gi
```

## Summary

Tuning the source-controller concurrency is one of the simplest and most effective ways to speed up Flux in clusters with many sources. Set the `--concurrent` flag through a Kustomize patch, adjust resources to match, and monitor the Prometheus metrics to confirm the improvement.
