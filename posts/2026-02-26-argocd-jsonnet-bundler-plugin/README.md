# How to Use Jsonnet Bundler Plugin with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Jsonnet, Config Management Plugins

Description: Learn how to set up a Jsonnet Bundler CMP plugin for ArgoCD that resolves external Jsonnet library dependencies before rendering manifests.

---

ArgoCD has built-in Jsonnet support, but it does not natively handle external Jsonnet dependencies managed by jsonnet-bundler (jb). If your Jsonnet code imports libraries like kube-prometheus, grafonnet, or custom shared libraries from other repositories, the built-in Jsonnet support will fail because those dependencies are not present during rendering. A Config Management Plugin that runs `jb install` before `jsonnet` closes this gap.

This guide shows you how to build and deploy a jsonnet-bundler CMP for ArgoCD, covering dependency management, library paths, and handling complex Jsonnet projects.

## The Problem

ArgoCD's built-in Jsonnet rendering runs `jsonnet` on your files, but it does not understand or execute `jsonnet-bundler`. Consider a typical monitoring setup using kube-prometheus:

```jsonnet
// main.jsonnet
local kp = (import 'kube-prometheus/main.libsonnet')
  + (import 'kube-prometheus/addons/all-namespaces.libsonnet')
  + {
    values+:: {
      common+: {
        namespace: 'monitoring',
      },
    },
  };

// Output all Kubernetes objects
{ [name]: kp[name] for name in std.objectFields(kp) }
```

This imports `kube-prometheus/main.libsonnet`, which is an external dependency defined in `jsonnetfile.json` and downloaded by `jb install`. Without running `jb install` first, ArgoCD's built-in Jsonnet support cannot find these imports.

## The Solution: Jsonnet Bundler Plugin

### Plugin Configuration

```yaml
# plugin.yaml
apiVersion: argoproj.io/v1alpha1
kind: ConfigManagementPlugin
metadata:
  name: jsonnet-bundler
spec:
  version: v1.0
  init:
    command: [sh, -c]
    args:
      - |
        set -euo pipefail

        # Install Jsonnet dependencies if jsonnetfile.json exists
        if [ -f "jsonnetfile.json" ]; then
          echo "Found jsonnetfile.json, running jb install..."
          jb install
        fi

        # Also handle jsonnetfile.lock.json for reproducible builds
        if [ -f "jsonnetfile.lock.json" ] && [ ! -d "vendor" ]; then
          echo "Lock file found without vendor, running jb install..."
          jb install
        fi
  generate:
    command: [sh, -c]
    args:
      - |
        set -euo pipefail

        # Determine the main Jsonnet file
        MAIN_FILE="${JSONNET_MAIN:-main.jsonnet}"

        # Build library path arguments
        # Include vendor directory and lib directory
        JPATH_ARGS=""
        [ -d "vendor" ] && JPATH_ARGS="$JPATH_ARGS -J vendor"
        [ -d "lib" ] && JPATH_ARGS="$JPATH_ARGS -J lib"

        # Add any custom JPATH entries
        if [ -n "${JSONNET_JPATH:-}" ]; then
          for p in $(echo "$JSONNET_JPATH" | tr ":" " "); do
            JPATH_ARGS="$JPATH_ARGS -J $p"
          done
        fi

        # Handle external variables from environment
        EXT_STR_ARGS=""
        if [ -n "${JSONNET_EXT_STR_VARS:-}" ]; then
          for var in $(echo "$JSONNET_EXT_STR_VARS" | tr "," " "); do
            EXT_STR_ARGS="$EXT_STR_ARGS --ext-str $var"
          done
        fi

        # Handle TLA (top-level arguments)
        TLA_ARGS=""
        if [ -n "${JSONNET_TLA_STR_VARS:-}" ]; then
          for var in $(echo "$JSONNET_TLA_STR_VARS" | tr "," " "); do
            TLA_ARGS="$TLA_ARGS --tla-str $var"
          done
        fi

        # Render Jsonnet to YAML
        # Use -y flag for YAML output (multi-document)
        jsonnet -y "$MAIN_FILE" \
          $JPATH_ARGS \
          $EXT_STR_ARGS \
          $TLA_ARGS
  discover:
    find:
      glob: "**/jsonnetfile.json"
```

### Building the Container Image

```dockerfile
FROM golang:1.21-alpine AS builder

# Install jsonnet-bundler
RUN go install github.com/jsonnet-bundler/jsonnet-bundler/cmd/jb@latest

# Install go-jsonnet (faster than C++ jsonnet)
RUN go install github.com/google/go-jsonnet/cmd/jsonnet@latest

FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache git bash

# Copy binaries from builder
COPY --from=builder /go/bin/jb /usr/local/bin/jb
COPY --from=builder /go/bin/jsonnet /usr/local/bin/jsonnet

# Copy ArgoCD CMP server
COPY --from=quay.io/argoproj/argocd:v2.10.0 \
    /usr/local/bin/argocd-cmp-server \
    /usr/local/bin/argocd-cmp-server

COPY plugin.yaml /home/argocd/cmp-server/config/plugin.yaml

USER 999
ENTRYPOINT ["/usr/local/bin/argocd-cmp-server"]
```

### Deploying the Sidecar

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: jsonnet-bundler
          image: my-registry/argocd-jsonnet-bundler:v1.0
          securityContext:
            runAsNonRoot: true
            runAsUser: 999
          resources:
            requests:
              memory: "256Mi"
              cpu: "200m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          volumeMounts:
            - name: var-files
              mountPath: /var/run/argocd
            - name: plugins
              mountPath: /home/argocd/cmp-server/plugins
            - name: cmp-tmp
              mountPath: /tmp
```

## Repository Structure

A project using jsonnet-bundler typically looks like this:

```text
monitoring-stack/
  jsonnetfile.json         # Dependency declarations
  jsonnetfile.lock.json    # Locked versions (committed to Git)
  main.jsonnet             # Entry point
  lib/                     # Local libraries
    config.libsonnet
    helpers.libsonnet
  vendor/                  # Downloaded dependencies (gitignored)
    kube-prometheus/
    grafonnet/
```

### jsonnetfile.json

```json
{
  "version": 1,
  "dependencies": [
    {
      "source": {
        "git": {
          "remote": "https://github.com/prometheus-operator/kube-prometheus.git",
          "subdir": "jsonnet/kube-prometheus"
        }
      },
      "version": "v0.13.0"
    },
    {
      "source": {
        "git": {
          "remote": "https://github.com/grafana/grafonnet.git",
          "subdir": "gen/grafonnet-v11.0.0"
        }
      },
      "version": "main"
    }
  ],
  "legacyImports": true
}
```

### Main Jsonnet File

```jsonnet
// main.jsonnet
local kp = (import 'kube-prometheus/main.libsonnet')
  + (import 'kube-prometheus/addons/anti-affinity.libsonnet')
  + (import 'kube-prometheus/addons/all-namespaces.libsonnet')
  + {
    values+:: {
      common+: {
        namespace: 'monitoring',
        platform: 'kubeadm',
      },
      prometheus+: {
        replicas: 2,
      },
      grafana+: {
        replicas: 1,
      },
      alertmanager+: {
        replicas: 3,
      },
    },
  };

// Flatten all objects into a single stream
local all = [kp[name] for name in std.objectFields(kp)
             if std.isObject(kp[name])
             && std.objectHas(kp[name], 'apiVersion')];

// Output as YAML stream
{ ['%s-%s' % [obj.kind, obj.metadata.name]]: obj for obj in all }
```

## Using the Plugin in an Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: monitoring-stack
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://github.com/myorg/monitoring.git
    targetRevision: main
    path: monitoring-stack
    plugin:
      name: jsonnet-bundler
      env:
        # Specify the main file if not main.jsonnet
        - name: JSONNET_MAIN
          value: "main.jsonnet"
        # Pass external string variables
        - name: JSONNET_EXT_STR_VARS
          value: "cluster=production,region=us-east-1"
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - ServerSideApply=true
```

## Handling Private Git Dependencies

If your Jsonnet dependencies come from private Git repositories, you need to provide Git credentials to the sidecar:

```yaml
containers:
  - name: jsonnet-bundler
    image: my-registry/argocd-jsonnet-bundler:v1.0
    env:
      # Configure Git credentials for jb install
      - name: GIT_ASKPASS
        value: /usr/local/bin/git-askpass.sh
    volumeMounts:
      - name: git-credentials
        mountPath: /home/argocd/.git-credentials
        subPath: .git-credentials
        readOnly: true
```

Create a git-askpass helper script in your container image:

```bash
#!/bin/sh
# git-askpass.sh
cat /home/argocd/.git-credentials
```

## Vendoring vs Dynamic Install

There are two approaches to managing Jsonnet dependencies:

**Vendoring (recommended for production)**: Commit the `vendor/` directory to Git. This means `jb install` does nothing because dependencies are already present. Builds are reproducible and do not depend on external Git repositories being available.

**Dynamic install**: Add `vendor/` to `.gitignore` and let the plugin run `jb install` on every build. This keeps the repo smaller but introduces a dependency on external repositories being accessible.

For production ArgoCD deployments, vendoring is strongly recommended because it eliminates network dependencies during manifest generation and guarantees reproducible builds.

## Performance Considerations

Jsonnet rendering can be CPU-intensive, especially for large projects like kube-prometheus that generate hundreds of Kubernetes objects. Tips for better performance:

- Use `go-jsonnet` instead of the C++ implementation - it is significantly faster for most workloads
- Set appropriate CPU limits on the sidecar (at least 500m for complex projects)
- Consider increasing the plugin timeout if generation takes more than 90 seconds
- Vendor dependencies to avoid the `jb install` network overhead

## Troubleshooting

```bash
# Check if dependencies are being installed
kubectl logs deployment/argocd-repo-server \
  -n argocd \
  -c jsonnet-bundler \
  --tail=100

# Common error: "RUNTIME ERROR: couldn't open import"
# This means jb install did not run or the JPATH is wrong
# Verify vendor directory is populated after init

# Common error: "exceeded maximum stack depth"
# This is a Jsonnet recursion issue, not an ArgoCD problem
# Test locally with: jsonnet -y main.jsonnet -J vendor
```

## Summary

The jsonnet-bundler plugin extends ArgoCD's Jsonnet support to handle external dependencies managed by `jb`. By running `jb install` in the init phase and including the vendor directory in the library path during generation, you can use the full Jsonnet ecosystem - including popular libraries like kube-prometheus and grafonnet - within your ArgoCD GitOps workflow. For production environments, vendor your dependencies for maximum reliability and reproducibility.
