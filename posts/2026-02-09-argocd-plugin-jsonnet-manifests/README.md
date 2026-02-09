# How to Build an ArgoCD Plugin That Renders Jsonnet Manifests for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Jsonnet, Config Management, Kubernetes, Plugin Development

Description: Learn how to create a custom ArgoCD config management plugin for rendering Jsonnet templates into Kubernetes manifests with GitOps workflows.

---

Jsonnet is a powerful data templating language that makes complex Kubernetes configurations manageable through functions, imports, and composition. While ArgoCD supports Jsonnet natively for older versions, the recommended approach for modern ArgoCD is building a custom plugin. This gives you complete control over Jsonnet versions, library paths, and custom functions.

This guide shows you how to build a production-ready Jsonnet plugin for ArgoCD.

## Why Jsonnet for Kubernetes

Jsonnet solves configuration problems that YAML can't handle elegantly:

```jsonnet
// Define common configuration once
local commonLabels = {
  app: 'myapp',
  environment: 'production',
};

// Reuse across resources with modifications
{
  deployment: {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: 'myapp',
      labels: commonLabels,
    },
    spec: {
      replicas: 3,
      selector: { matchLabels: commonLabels },
      template: {
        metadata: { labels: commonLabels },
        spec: {
          containers: [{
            name: 'app',
            image: 'myapp:v1.0.0',
          }],
        },
      },
    },
  },
}
```

Functions, variables, and composition eliminate duplication.

## Building the Jsonnet Plugin

Create a plugin script that implements the ArgoCD plugin interface:

```bash
#!/bin/bash
# jsonnet-plugin.sh

set -e

case "$1" in
  discover)
    # Check if jsonnetfile.json or *.jsonnet files exist
    if [ -f "jsonnetfile.json" ] || ls *.jsonnet >/dev/null 2>&1; then
      echo "true"
      exit 0
    fi
    echo "false"
    exit 1
    ;;

  init)
    # Install Jsonnet dependencies if jsonnetfile.json exists
    if [ -f "jsonnetfile.json" ]; then
      echo "Installing Jsonnet dependencies..." >&2
      jb install
    fi
    exit 0
    ;;

  generate)
    # Find the main file (default to main.jsonnet)
    MAIN_FILE="${JSONNET_MAIN_FILE:-main.jsonnet}"

    if [ ! -f "$MAIN_FILE" ]; then
      echo "Error: $MAIN_FILE not found" >&2
      exit 1
    fi

    # Render Jsonnet to YAML
    echo "Rendering $MAIN_FILE..." >&2

    # Use jsonnet with library paths and external variables
    jsonnet \
      --ext-str namespace="${ARGOCD_APP_NAMESPACE:-default}" \
      --ext-str appName="${ARGOCD_APP_NAME}" \
      --jpath vendor \
      --jpath lib \
      --yaml-stream \
      --string \
      "$MAIN_FILE"

    exit 0
    ;;

  *)
    echo "Unknown command: $1" >&2
    exit 1
    ;;
esac
```

## Creating the Plugin Container

Build a container with Jsonnet and required dependencies:

```dockerfile
FROM golang:1.21-alpine AS builder

# Install jsonnet and jsonnet-bundler
RUN apk add --no-cache git make && \
    go install github.com/google/go-jsonnet/cmd/jsonnet@latest && \
    go install github.com/jsonnet-bundler/jsonnet-bundler/cmd/jb@latest

FROM alpine:3.18

# Install runtime dependencies
RUN apk add --no-cache bash git

# Copy binaries from builder
COPY --from=builder /go/bin/jsonnet /usr/local/bin/jsonnet
COPY --from=builder /go/bin/jb /usr/local/bin/jb

# Copy plugin script
COPY jsonnet-plugin.sh /usr/local/bin/jsonnet-plugin
RUN chmod +x /usr/local/bin/jsonnet-plugin

# Set up working directory
WORKDIR /tmp

ENTRYPOINT ["/usr/local/bin/jsonnet-plugin"]
```

Build and push:

```bash
docker build -t yourregistry.io/argocd-jsonnet-plugin:v1.0.0 .
docker push yourregistry.io/argocd-jsonnet-plugin:v1.0.0
```

## Registering the Plugin

Create a ConfigMap with plugin configuration:

```yaml
# argocd-cmp-jsonnet.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: jsonnet-plugin-config
  namespace: argocd
data:
  plugin.yaml: |
    apiVersion: argoproj.io/v1alpha1
    kind: ConfigManagementPlugin
    metadata:
      name: jsonnet
    spec:
      version: v1.0
      discover:
        command: ["/usr/local/bin/jsonnet-plugin", "discover"]
      init:
        command: ["/usr/local/bin/jsonnet-plugin", "init"]
      generate:
        command: ["/usr/local/bin/jsonnet-plugin", "generate"]
```

Patch the argocd-repo-server to add the plugin sidecar:

```yaml
# repo-server-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
      - name: jsonnet-plugin
        image: yourregistry.io/argocd-jsonnet-plugin:v1.0.0
        securityContext:
          runAsNonRoot: true
          runAsUser: 999
        volumeMounts:
        - name: var-files
          mountPath: /var/run/argocd
        - name: plugins
          mountPath: /home/argocd/cmp-server/plugins
        - name: jsonnet-plugin-config
          mountPath: /home/argocd/cmp-server/config
        - name: tmp
          mountPath: /tmp
      volumes:
      - name: jsonnet-plugin-config
        configMap:
          name: jsonnet-plugin-config
      - name: var-files
        emptyDir: {}
      - name: plugins
        emptyDir: {}
      - name: tmp
        emptyDir: {}
```

Apply the configuration:

```bash
kubectl apply -f argocd-cmp-jsonnet.yaml
kubectl patch deployment argocd-repo-server -n argocd --patch-file repo-server-patch.yaml
```

## Creating Jsonnet Manifests

Set up a Jsonnet project structure:

```
apps/myapp/
├── jsonnetfile.json
├── jsonnetfile.lock.json
├── lib/
│   └── k8s.libsonnet
├── main.jsonnet
└── params.libsonnet
```

Install Kubernetes library:

```json
{
  "version": 1,
  "dependencies": [
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

Run `jb install` to download dependencies.

## Example: Application Deployment

Define parameters:

```jsonnet
// params.libsonnet
{
  name: 'myapp',
  namespace: std.extVar('namespace'),
  replicas: 3,
  image: 'myapp:v1.2.3',
  port: 8080,
  resources: {
    requests: {
      cpu: '100m',
      memory: '128Mi',
    },
    limits: {
      cpu: '500m',
      memory: '512Mi',
    },
  },
}
```

Create the main manifest:

```jsonnet
// main.jsonnet
local k = import 'k.libsonnet';
local params = import 'params.libsonnet';

local deployment = k.apps.v1.deployment.new(
  name=params.name,
  replicas=params.replicas,
  containers=[
    k.core.v1.container.new(params.name, params.image)
    + k.core.v1.container.withPorts([
      k.core.v1.containerPort.new('http', params.port),
    ])
    + k.core.v1.container.resources.withRequests(params.resources.requests)
    + k.core.v1.container.resources.withLimits(params.resources.limits)
    + k.core.v1.container.livenessProbe.httpGet.withPath('/healthz')
    + k.core.v1.container.livenessProbe.httpGet.withPort(params.port)
    + k.core.v1.container.readinessProbe.httpGet.withPath('/ready')
    + k.core.v1.container.readinessProbe.httpGet.withPort(params.port),
  ],
);

local service = k.core.v1.service.new(
  name=params.name,
  selector={app: params.name},
  ports=[
    k.core.v1.servicePort.new(params.port, params.port)
    + k.core.v1.servicePort.withName('http'),
  ],
);

{
  apiVersion: 'v1',
  kind: 'List',
  items: [
    deployment + k.apps.v1.deployment.metadata.withNamespace(params.namespace),
    service + k.core.v1.service.metadata.withNamespace(params.namespace),
  ],
}
```

## Using the Plugin in ArgoCD

Create an Application that uses the plugin:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/yourorg/apps
    targetRevision: main
    path: apps/myapp
    plugin:
      name: jsonnet
      env:
        - name: JSONNET_MAIN_FILE
          value: main.jsonnet
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

ArgoCD will:
1. Discover the plugin via jsonnetfile.json
2. Run `jb install` to fetch dependencies
3. Execute jsonnet with external variables
4. Apply rendered manifests

## Advanced Features

### Environment-Specific Configurations

Use external variables for environment-specific values:

```jsonnet
// main.jsonnet
local params = {
  environment: std.extVar('environment'),
  replicas: if std.extVar('environment') == 'production' then 5 else 2,
  resources: if std.extVar('environment') == 'production' then {
    requests: { cpu: '500m', memory: '512Mi' },
    limits: { cpu: '2000m', memory: '2Gi' },
  } else {
    requests: { cpu: '100m', memory: '128Mi' },
    limits: { cpu: '500m', memory: '512Mi' },
  },
};

// Rest of configuration
```

Pass via ArgoCD Application:

```yaml
plugin:
  name: jsonnet
  env:
    - name: ARGOCD_ENV_environment
      value: production
```

### Jsonnet Functions

Create reusable functions:

```jsonnet
// lib/helpers.libsonnet
{
  // Create a deployment with common defaults
  deployment(name, image, replicas=3)::
    {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name: name },
      spec: {
        replicas: replicas,
        selector: { matchLabels: { app: name } },
        template: {
          metadata: { labels: { app: name } },
          spec: {
            containers: [{
              name: name,
              image: image,
              ports: [{ containerPort: 8080 }],
            }],
          },
        },
      },
    },
}
```

Use in manifests:

```jsonnet
local helpers = import 'lib/helpers.libsonnet';

{
  deployment: helpers.deployment('myapp', 'myapp:v1.0.0', 5),
}
```

### Multi-Document Output

Generate multiple Kubernetes resources:

```jsonnet
// main.jsonnet
local k = import 'k.libsonnet';

local resources = [
  k.core.v1.namespace.new('myapp'),
  k.core.v1.configMap.new('app-config', {
    'config.yaml': |||
      server:
        port: 8080
    |||,
  }),
  // More resources...
];

{
  apiVersion: 'v1',
  kind: 'List',
  items: resources,
}
```

## Debugging

View plugin logs:

```bash
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server -c jsonnet-plugin
```

Test locally:

```bash
# Clone the repo
git clone https://github.com/yourorg/apps /tmp/test
cd /tmp/test/apps/myapp

# Install dependencies
jb install

# Render locally
jsonnet \
  --ext-str namespace=production \
  --ext-str appName=myapp \
  --jpath vendor \
  --yaml-stream \
  main.jsonnet
```

## Best Practices

1. **Version control jsonnetfile.lock.json**: Ensures reproducible builds
2. **Use external variables**: Make manifests environment-agnostic
3. **Organize with libraries**: Keep reusable code in lib/ directory
4. **Test locally**: Render and validate before committing
5. **Pin image versions**: Container image should match ArgoCD version compatibility
6. **Document parameters**: Add comments explaining external variables
7. **Keep functions pure**: Avoid side effects in Jsonnet functions

## Conclusion

A custom Jsonnet plugin gives you the full power of programmable configuration in ArgoCD. Build reusable libraries, parameterize by environment, and eliminate YAML duplication. The plugin architecture ensures your Jsonnet setup integrates seamlessly with GitOps workflows while giving you complete control over the rendering process.
