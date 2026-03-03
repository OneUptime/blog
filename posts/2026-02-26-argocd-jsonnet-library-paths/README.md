# How to Configure Jsonnet Library Paths in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Jsonnet, Configuration Management

Description: Learn how to configure Jsonnet library paths (JSONNET_PATH) in ArgoCD to enable shared libraries, vendor dependencies, and modular Jsonnet code for Kubernetes manifests.

---

When your Jsonnet projects grow beyond a single file, you inevitably start importing shared libraries. Jsonnet resolves imports relative to the file doing the importing, but shared libraries often live in a different directory - a `vendor` folder, a `lib` directory, or even a separate repository. Configuring Jsonnet library paths in ArgoCD tells the Jsonnet evaluator where to look for imported files, and getting this right is essential for complex Jsonnet projects.

## How Jsonnet Import Resolution Works

Before diving into ArgoCD configuration, it helps to understand how Jsonnet resolves imports. When you write `import 'foo/bar.libsonnet'`, Jsonnet searches for the file in this order:

1. Relative to the current file's directory
2. Each directory in the library path list, in order

This is similar to how `PYTHONPATH` works for Python or `-I` flags work for C compilers. The library path is the Jsonnet equivalent of `JSONNET_PATH` or the `-J` command-line flag.

## Configuring Library Paths in ArgoCD

ArgoCD lets you specify Jsonnet library paths in the Application spec under `directory.jsonnet.libs`. Here is the basic configuration:

```yaml
# argocd-app-with-libs.yaml - Application with Jsonnet library paths
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/k8s-manifests.git
    targetRevision: main
    path: apps/my-app
    directory:
      jsonnet:
        libs:
          # Paths are relative to the repository root
          - vendor
          - lib
          - libs/shared
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

The `libs` paths are resolved relative to the root of the Git repository, not relative to the `path` specified in the source. This is a common source of confusion.

## Repository Structure for Jsonnet Libraries

A well-organized Jsonnet repository for ArgoCD typically follows this structure:

```text
k8s-manifests/
  lib/                          # Shared internal libraries
    k8s.libsonnet               # Kubernetes resource helpers
    monitoring.libsonnet        # Monitoring resource helpers
    config.libsonnet            # Shared configuration
  vendor/                       # External dependencies
    ksonnet-lib/                # ksonnet standard library
      ksonnet.beta.4/
        k.libsonnet
        k8s.libsonnet
    grafonnet/                  # Grafana dashboard library
      grafana.libsonnet
  apps/
    my-app/
      main.jsonnet              # Entry point for my-app
      components/
        database.libsonnet
        cache.libsonnet
    another-app/
      main.jsonnet
```

With the `libs` configured as `["vendor", "lib"]`, your `main.jsonnet` can import from any of these locations:

```jsonnet
// apps/my-app/main.jsonnet
// This import resolves via library path to lib/k8s.libsonnet
local k8s = import 'k8s.libsonnet';

// This resolves via library path to vendor/ksonnet-lib/ksonnet.beta.4/k.libsonnet
local klib = import 'ksonnet-lib/ksonnet.beta.4/k.libsonnet';

// This resolves relative to the current file
local db = import 'components/database.libsonnet';

[
  k8s.deployment('my-app', 'my-registry/my-app:v1.0.0'),
  k8s.service('my-app'),
  db.statefulSet('my-db'),
]
```

## Using jsonnet-bundler for Dependency Management

For managing external Jsonnet dependencies, `jsonnet-bundler` (jb) is the standard package manager. It downloads dependencies into a `vendor` directory, which you then reference in your ArgoCD library paths.

```bash
# Initialize jsonnet-bundler in your repo
jb init

# Add dependencies
jb install https://github.com/grafana/grafonnet-lib/grafonnet
jb install https://github.com/jsonnet-libs/k8s-libsonnet/1.29@main

# This creates vendor/ directory and jsonnetfile.json + jsonnetfile.lock.json
```

Your `jsonnetfile.json` tracks dependencies:

```json
{
  "version": 1,
  "dependencies": [
    {
      "source": {
        "git": {
          "remote": "https://github.com/grafana/grafonnet-lib",
          "subdir": "grafonnet"
        }
      },
      "version": "master"
    },
    {
      "source": {
        "git": {
          "remote": "https://github.com/jsonnet-libs/k8s-libsonnet",
          "subdir": "1.29"
        }
      },
      "version": "main"
    }
  ],
  "legacyImports": true
}
```

Commit the `vendor` directory to Git (or use CI to regenerate it). Then configure ArgoCD:

```yaml
# ArgoCD Application using jsonnet-bundler vendor directory
spec:
  source:
    repoURL: https://github.com/your-org/k8s-manifests.git
    targetRevision: main
    path: apps/my-app
    directory:
      jsonnet:
        libs:
          - vendor
          - lib
```

## Creating a Shared Library

Let us build a practical shared library that multiple ArgoCD applications can use:

```jsonnet
// lib/k8s.libsonnet - Shared Kubernetes resource constructors
{
  // Standard labels applied to all resources
  _labels(name, extra={}):: {
    'app.kubernetes.io/name': name,
    'app.kubernetes.io/managed-by': 'argocd',
  } + extra,

  // Create a Deployment with sensible defaults
  deployment(name, image, opts={}):: {
    local defaults = {
      replicas: 1,
      port: 8080,
      resources: {
        requests: { cpu: '100m', memory: '128Mi' },
        limits: { cpu: '500m', memory: '256Mi' },
      },
      env: [],
      labels: {},
    },
    local config = defaults + opts,
    local labels = $._labels(name, config.labels),

    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: name,
      labels: labels,
    },
    spec: {
      replicas: config.replicas,
      selector: { matchLabels: { 'app.kubernetes.io/name': name } },
      template: {
        metadata: { labels: labels },
        spec: {
          containers: [{
            name: name,
            image: image,
            ports: [{ containerPort: config.port, name: 'http' }],
            resources: config.resources,
            env: config.env,
          }],
        },
      },
    },
  },

  // Create a ClusterIP Service
  service(name, port=80, targetPort=8080):: {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: name,
      labels: $._labels(name),
    },
    spec: {
      selector: { 'app.kubernetes.io/name': name },
      ports: [{ name: 'http', port: port, targetPort: targetPort }],
    },
  },

  // Create an HPA
  hpa(name, minReplicas=2, maxReplicas=10, cpuTarget=70):: {
    apiVersion: 'autoscaling/v2',
    kind: 'HorizontalPodAutoscaler',
    metadata: {
      name: name,
      labels: $._labels(name),
    },
    spec: {
      scaleTargetRef: {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: name,
      },
      minReplicas: minReplicas,
      maxReplicas: maxReplicas,
      metrics: [{
        type: 'Resource',
        resource: {
          name: 'cpu',
          target: { type: 'Utilization', averageUtilization: cpuTarget },
        },
      }],
    },
  },
}
```

## Multiple Library Path Order Matters

When you specify multiple library paths, ArgoCD searches them in the order listed. If two paths contain a file with the same name, the first match wins:

```yaml
# Library path search order
directory:
  jsonnet:
    libs:
      - overrides    # Searched first - put local overrides here
      - lib          # Searched second - internal shared libraries
      - vendor       # Searched last - external dependencies
```

This ordering lets you override vendored libraries with local versions when needed. For example, if `vendor/k8s.libsonnet` exists but you need a custom version, placing your modified file in `overrides/k8s.libsonnet` will take priority.

## Debugging Library Path Issues

The most common error when library paths are wrong is:

```text
RUNTIME ERROR: couldn't open import "k8s.libsonnet": no match locally or in the Jsonnet library paths
```

Here is how to troubleshoot:

```bash
# Test locally with the same library paths ArgoCD would use
# Run from the repository root
jsonnet -J vendor -J lib apps/my-app/main.jsonnet

# List what is in your library paths
ls -la vendor/
ls -la lib/

# Check the ArgoCD app details for path configuration
argocd app get my-app -o yaml | grep -A 10 jsonnet

# Check repo server logs for rendering errors
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server --tail=50
```

## Library Paths with Multiple Applications

When multiple ArgoCD Applications share the same library, each Application needs its own `libs` configuration pointing to the same directories:

```yaml
# App 1 - uses shared lib
spec:
  source:
    path: apps/frontend
    directory:
      jsonnet:
        libs: [vendor, lib]

---
# App 2 - uses same shared lib
spec:
  source:
    path: apps/backend
    directory:
      jsonnet:
        libs: [vendor, lib]
```

This is because ArgoCD evaluates each Application independently. There is no global library path setting.

## Common Pitfalls

**Paths are relative to repo root, not to `source.path`** - This catches people all the time. If your repo root is `/` and your app is at `apps/my-app/`, the library path `lib` means `/lib/`, not `/apps/my-app/lib/`.

**Vendor directory must be committed** - ArgoCD clones the repository as-is. It does not run `jb install` for you. Make sure the `vendor` directory is committed to Git.

**Large vendor directories slow cloning** - If your vendor directory is very large, consider using shallow clones or keeping dependencies lean. ArgoCD clones the full repository for each application sync.

**Symlinks may not work** - Some Git hosting providers do not preserve symlinks. Avoid using symlinks in your library paths.

For more on Jsonnet with ArgoCD, see our guides on [deploying Jsonnet applications](https://oneuptime.com/blog/post/2026-02-26-argocd-deploy-jsonnet-applications/view) and [using external variables](https://oneuptime.com/blog/post/2026-02-26-argocd-jsonnet-external-variables/view).
