# How to Optimize Kustomize Build with Local Refs Only in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Kustomize, Optimization, Build

Description: Speed up Flux Kustomize builds by eliminating remote references and using only local paths, reducing network fetches during the build phase.

---

## The Problem with Remote Kustomize References

Kustomize supports referencing remote bases via Git URLs in your `kustomization.yaml` files:

```yaml
# This triggers a network fetch during every build
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - https://github.com/my-org/base-configs//deploy?ref=v1.0.0
```

Every time the kustomize-controller builds this Kustomization, it must clone the remote repository to resolve the reference. This adds network latency, creates an external dependency, and can fail due to network issues or rate limiting. In Flux, remote bases are also a security concern because they bypass the source-controller's verification.

## Why Local Refs Are Faster

When all references in a `kustomization.yaml` point to local paths within the same source artifact, the Kustomize build runs entirely against files already present on disk. There are no network fetches, no authentication steps, and no risk of external failures.

## Converting Remote Refs to Local Refs

### Step 1 - Identify Remote References

Search your repository for remote Kustomize references:

```bash
grep -r "https://" --include="kustomization.yaml" .
grep -r "github.com" --include="kustomization.yaml" .
grep -r "git::" --include="kustomization.yaml" .
```

### Step 2 - Bring Remote Bases into Your Repository

Clone or copy the remote base into your repository:

```bash
# Create a directory for shared bases
mkdir -p bases/common-configs

# Copy the remote content
git clone https://github.com/my-org/base-configs.git /tmp/base-configs
cp -r /tmp/base-configs/deploy/* bases/common-configs/
```

### Step 3 - Update References to Local Paths

Before (remote reference):

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - https://github.com/my-org/base-configs//deploy?ref=v1.0.0
```

After (local reference):

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../bases/common-configs
```

## Using Flux Source References Instead

An alternative to copying files into your repository is to use Flux's built-in cross-source referencing. Create a separate GitRepository for the base and reference it from your Kustomization:

```yaml
# Source for the base configs
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: base-configs
  namespace: flux-system
spec:
  interval: 30m
  url: https://github.com/my-org/base-configs.git
  ref:
    tag: v1.0.0
---
# Kustomization that uses both sources
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-app-repo
  path: ./deploy/overlays/production
  dependsOn:
    - name: base-configs
```

This approach lets the source-controller handle fetching (with its own caching and optimization) instead of having Kustomize fetch during the build phase.

## Configuring the Kustomize Controller to Block Remote Refs

To enforce that only local references are used, configure the kustomize-controller with the `--no-remote-bases` flag:

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
            - --no-remote-bases=true
            - --concurrent=10
```

With this flag enabled, any Kustomization that references a remote base will fail with an error, ensuring that all builds use local paths only.

### Apply the Patch

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

```bash
git add clusters/my-cluster/flux-system/
git commit -m "Enforce local-only Kustomize refs and increase concurrency"
git push
```

## Repository Structure for Local Refs

A well-organized repository structure makes local references clean and maintainable:

```
my-k8s-repo/
  bases/
    app-template/
      deployment.yaml
      service.yaml
      kustomization.yaml
    monitoring/
      servicemonitor.yaml
      kustomization.yaml
  overlays/
    staging/
      kustomization.yaml    # References ../../bases/app-template
    production/
      kustomization.yaml    # References ../../bases/app-template
  clusters/
    staging/
      kustomization.yaml    # References ../../overlays/staging
    production/
      kustomization.yaml    # References ../../overlays/production
```

## Measuring the Impact

Compare Kustomize build times before and after converting remote refs to local:

```bash
# Local benchmark
time kustomize build overlays/production

# Trigger Flux reconciliation and measure
START=$(date +%s)
kubectl annotate kustomization my-app -n flux-system \
  reconcile.fluxcd.io/requestedAt="$(date +%s)" --overwrite
kubectl wait kustomization my-app -n flux-system \
  --for=condition=Ready --timeout=300s
END=$(date +%s)
echo "Reconciliation took $((END - START)) seconds"
```

You should see a significant improvement, especially if the remote references were to repositories with large histories or on slow connections.

## Security Benefits

Using local refs only also improves security:

- No external network access required during the build phase
- All content is verified by the source-controller before the build runs
- Reduces the attack surface by eliminating runtime dependency on external repositories
- Makes builds deterministic and reproducible

## Summary

Eliminating remote Kustomize references in favor of local paths or Flux source references is both a performance and security optimization. Use the `--no-remote-bases` flag to enforce this policy, restructure your repository to keep bases local, and use Flux cross-source references when you need to share configurations across repositories.
