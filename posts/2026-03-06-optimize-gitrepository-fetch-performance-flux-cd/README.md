# How to Optimize GitRepository Fetch Performance in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Git, Performance Tuning, Source Controller, Repository optimization

Description: A practical guide to optimizing GitRepository fetch performance in Flux CD through shallow clones, ignore patterns, caching, authentication tuning, and artifact management.

---

The source-controller in Flux CD fetches Git repositories on every reconciliation cycle. For large repositories, long histories, or frequent reconciliation intervals, these fetches can become a significant performance bottleneck. This guide covers every technique available to speed up GitRepository operations.

## Understanding GitRepository Fetch Lifecycle

Every reconciliation cycle for a GitRepository involves:

1. Checking if the remote ref has changed (ls-remote)
2. Fetching the repository content if the ref changed
3. Building an artifact from the fetched content
4. Storing and serving the artifact to downstream controllers

```mermaid
graph LR
    A[Check Remote Ref] --> B{Ref Changed?}
    B -->|Yes| C[Fetch Content]
    B -->|No| D[Skip - Use Cached Artifact]
    C --> E[Build Artifact]
    E --> F[Store and Serve]
```

The optimization goal is to minimize time spent in each stage and skip unnecessary stages entirely.

## Using Ignore Patterns to Reduce Artifact Size

The `.sourceignore` pattern and the `spec.ignore` field let you exclude files from the fetched artifact. This is the most impactful optimization for large repositories.

```yaml
# GitRepository with aggressive ignore patterns
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-monorepo
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/org/monorepo
  ref:
    branch: main
  ignore: |
    # Exclude everything by default
    /*

    # Only include Kubernetes manifests directories
    !/deploy/
    !/kubernetes/
    !/clusters/

    # Exclude test files within included directories
    **/*_test.yaml
    **/*.test.yaml

    # Exclude documentation
    **/README.md
    **/docs/
    **/CHANGELOG.md

    # Exclude CI/CD files
    **/.github/
    **/.gitlab-ci.yml
    **/Makefile

    # Exclude source code (not needed for deployment)
    **/src/
    **/pkg/
    **/cmd/
    **/vendor/
    **/node_modules/
    **/*.go
    **/*.js
    **/*.py
```

You can also use a `.sourceignore` file in the repository root:

```text
# .sourceignore
# This file is read by Flux source-controller
# Uses .gitignore pattern syntax

# Exclude everything except deploy directory
/*
!/deploy/

# Exclude test data
**/testdata/
**/fixtures/
```

## Optimizing Git Authentication

Authentication overhead can slow down fetches, especially with SSH key-based auth. Use HTTPS with token authentication for faster connections.

```yaml
# GitRepository with HTTPS token authentication (faster than SSH)
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/org/my-app
  ref:
    branch: main
  secretRef:
    name: git-credentials
---
# Secret with HTTPS credentials
apiVersion: v1
kind: Secret
metadata:
  name: git-credentials
  namespace: flux-system
type: Opaque
stringData:
  # Use a personal access token or deploy token
  username: git
  password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

For SSH authentication, use Ed25519 keys which are faster than RSA:

```yaml
# Secret with Ed25519 SSH key (faster than RSA)
apiVersion: v1
kind: Secret
metadata:
  name: git-ssh-credentials
  namespace: flux-system
type: Opaque
stringData:
  # Ed25519 keys are smaller and faster for SSH handshakes
  identity: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ... your Ed25519 private key ...
    -----END OPENSSH PRIVATE KEY-----
  known_hosts: |
    github.com ecdsa-sha2-nistp256 AAAA...
```

## Configuring Source Controller for Performance

Tune the source-controller deployment for faster fetches.

```yaml
# source-controller-perf-patch.yaml
# Performance-tuned source-controller configuration
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
            - --storage-path=/data
            - --storage-adv-addr=source-controller.$(RUNTIME_NAMESPACE).svc.cluster.local.
            # Increase concurrent fetches for parallel processing
            - --concurrent=8
            # Limit artifact retention to reduce storage I/O
            - --artifact-retention-ttl=30m
            - --artifact-retention-records=2
            # Set max artifact size to fail fast on unexpectedly large repos
            - --storage-max-artifact-size=100000000
          resources:
            requests:
              # Fast fetches need network and CPU headroom
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
```

## Using High-Performance Storage for Artifacts

The source-controller stores fetched artifacts on disk. Use fast storage to reduce I/O latency.

```yaml
# PersistentVolumeClaim with fast SSD storage for artifacts
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: source-controller-data
  namespace: flux-system
spec:
  accessModes:
    - ReadWriteOnce
  # Use the fastest available storage class
  storageClassName: ssd-fast
  resources:
    requests:
      # Size based on total artifact size
      storage: 10Gi
---
# Patch source-controller to use persistent fast storage
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
          persistentVolumeClaim:
            claimName: source-controller-data
```

Alternatively, use an emptyDir with memory backing for maximum speed:

```yaml
# Use tmpfs-backed emptyDir for fastest possible artifact I/O
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      volumes:
        - name: data
          emptyDir:
            # Use memory-backed storage for maximum I/O speed
            # Warning: counts against container memory limits
            medium: Memory
            sizeLimit: 512Mi
```

## Splitting Monorepos into Multiple GitRepositories

If you have a large monorepo, create multiple GitRepository resources pointing to different paths. Each can have its own ignore patterns and reconciliation interval.

```yaml
# Separate GitRepository for frontend deployments
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: monorepo-frontend
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/org/monorepo
  ref:
    branch: main
  ignore: |
    # Only include frontend deployment manifests
    /*
    !/deploy/frontend/
---
# Separate GitRepository for backend deployments
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: monorepo-backend
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/org/monorepo
  ref:
    branch: main
  ignore: |
    # Only include backend deployment manifests
    /*
    !/deploy/backend/
---
# Separate GitRepository for infrastructure
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: monorepo-infra
  namespace: flux-system
spec:
  # Infrastructure changes less often
  interval: 30m
  url: https://github.com/org/monorepo
  ref:
    branch: main
  ignore: |
    /*
    !/deploy/infrastructure/
```

## Using OCI Repositories as an Alternative

For maximum fetch performance, pre-build artifacts and push them as OCI images. OCI pulls are often faster than Git clones.

```yaml
# Push manifests as OCI artifact in CI pipeline
# flux push artifact oci://registry.example.com/my-app:$(git rev-parse HEAD) \
#   --path=./deploy \
#   --source="$(git config --get remote.origin.url)" \
#   --revision="$(git rev-parse HEAD)"

# OCIRepository for fast artifact delivery
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.example.com/my-app
  ref:
    tag: latest
  provider: generic
```

## Monitoring Fetch Performance

Track GitRepository fetch metrics to identify slow sources.

```yaml
# PrometheusRule for slow Git fetch detection
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-git-fetch-alerts
  namespace: flux-system
spec:
  groups:
    - name: flux-git-fetch
      rules:
        # Alert when Git fetch takes longer than 60 seconds
        - alert: FluxGitFetchSlow
          expr: |
            gotk_reconcile_duration_seconds{
              kind="GitRepository",
              namespace="flux-system"
            } > 60
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "GitRepository {{ $labels.name }} fetch is slow ({{ $value }}s)"
            description: "Consider using ignore patterns, shallow clones, or OCI artifacts."

        # Alert on persistent fetch failures
        - alert: FluxGitFetchFailing
          expr: |
            gotk_reconcile_condition{
              kind="GitRepository",
              type="Ready",
              status="False"
            } == 1
          for: 15m
          labels:
            severity: critical
          annotations:
            summary: "GitRepository {{ $labels.name }} has been failing for 15m"
```

## Summary

Key strategies for optimizing GitRepository fetch performance:

1. Use ignore patterns to exclude non-deployment files and reduce artifact size
2. Prefer HTTPS with token auth over SSH for faster connections
3. Increase source-controller concurrency for parallel fetches
4. Use fast storage (SSD or tmpfs) for artifact caching
5. Split monorepos into multiple focused GitRepository resources
6. Consider OCI repositories for pre-built artifacts
7. Monitor fetch duration and set alerts for slow sources

The most impactful optimization is usually ignore patterns -- reducing what gets fetched and stored dramatically improves fetch times for large repositories.
