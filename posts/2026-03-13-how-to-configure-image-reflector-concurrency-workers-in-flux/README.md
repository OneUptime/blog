# How to Configure Image Reflector Concurrency Workers in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Concurrency, Image Reflector, Image Automation

Description: Speed up container image tag scanning in Flux by configuring the image-reflector-controller concurrency workers.

---

## What the Image Reflector Controller Does

The image-reflector-controller scans container image registries to discover new tags. It works with ImageRepository and ImagePolicy objects to determine which image tags are available and which one matches a given policy (such as semver ranges or alphabetical ordering). This information is then used by the image-automation-controller to update Git repositories with new image references.

## Why Concurrency Matters

Each ImageRepository reconciliation involves an API call to a container registry. Registries like Docker Hub, GitHub Container Registry, or AWS ECR may respond in tens to hundreds of milliseconds per request. When you track many images, sequential scanning means the controller spends most of its time waiting on network responses.

## Configuring the Concurrent Flag

### Create the Patch

```yaml
# clusters/my-cluster/flux-system/image-reflector-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: image-reflector-controller
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

### Reference in Kustomization

```yaml
# clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: image-reflector-patch.yaml
    target:
      kind: Deployment
      name: image-reflector-controller
```

### Push and Reconcile

```bash
git add clusters/my-cluster/flux-system/
git commit -m "Increase image-reflector-controller concurrency to 10"
git push
```

## Registry Rate Limits

Before cranking up concurrency, consider the rate limits of your container registries:

- Docker Hub: 100 pulls per 6 hours for unauthenticated users, 200 for authenticated
- GitHub Container Registry: 5,000 requests per hour for authenticated users
- AWS ECR: generally generous but varies by account
- Google Artifact Registry: similar to ECR

If you set concurrency too high you may hit rate limits and start seeing errors. A good approach is to set concurrency to match the number of distinct registries you use, so that scanning across different registries happens in parallel while requests to the same registry are naturally serialized.

## Sizing Recommendations

- Under 10 ImageRepositories: the default (`--concurrent=4`) is usually fine
- 10 to 50 ImageRepositories: `--concurrent=5`
- Over 50 ImageRepositories: `--concurrent=10` with registry rate limit monitoring

## Resource Adjustments

The image-reflector-controller stores scanned tag lists in its internal database. Higher concurrency means more concurrent database writes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: image-reflector-controller
  namespace: flux-system
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
```

## Verifying

```bash
kubectl get deployment image-reflector-controller -n flux-system \
  -o jsonpath='{.spec.template.spec.containers[0].args}' | tr ',' '\n'
```

## Summary

Configuring the image-reflector-controller concurrency allows parallel image tag scanning across multiple registries. Balance the concurrency value against registry rate limits and monitor for throttling errors to find the optimal setting.
