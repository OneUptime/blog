# How to Use Jsonnet TLA (Top-Level Arguments) in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Jsonnet, Templating

Description: Learn how to use Jsonnet Top-Level Arguments (TLAs) in ArgoCD to parameterize your Kubernetes manifests with function-style configuration injection.

---

Jsonnet provides two mechanisms for injecting external data into templates: external variables (extVars) and top-level arguments (TLAs). While extVars are global variables accessible anywhere in your code, TLAs treat the entire Jsonnet file as a function that accepts parameters. TLAs offer better encapsulation and make your Jsonnet files explicitly declare what inputs they require.

## TLA vs ExtVar: What Is the Difference

The fundamental difference is in how the entry point is structured. With extVars, your `main.jsonnet` is a regular expression that happens to call `std.extVar()` somewhere. With TLAs, your `main.jsonnet` is a function that takes parameters directly.

Here is a side-by-side comparison:

```jsonnet
// ExtVar style - implicit dependencies
local env = std.extVar('environment');
local replicas = std.parseInt(std.extVar('replicas'));
{ replicas: replicas, env: env }
```

```jsonnet
// TLA style - explicit function parameters
function(environment='staging', replicas=1)
{ replicas: replicas, env: environment }
```

The TLA approach is generally considered better Jsonnet practice because:

- The function signature documents the expected inputs
- Default values are visible in the code
- The entry point is a pure function, making it easier to test
- There is no global state leaking through `std.extVar()`

## Configuring TLAs in ArgoCD

ArgoCD supports TLAs through the `directory.jsonnet.tlas` field in the Application spec. Here is the basic structure:

```yaml
# argocd-app-tla.yaml - ArgoCD Application with Jsonnet TLAs
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-service-staging
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/k8s-manifests.git
    targetRevision: main
    path: apps/my-service
    directory:
      jsonnet:
        tlas:
          # String TLA parameters
          - name: environment
            value: staging
          - name: image_tag
            value: v1.5.0
          - name: namespace
            value: staging
          # Code TLA - evaluated as Jsonnet expression, not plain string
          - name: replicas
            value: "3"
            code: true
          - name: enable_monitoring
            value: "true"
            code: true
  destination:
    server: https://kubernetes.default.svc
    namespace: staging
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Notice the `code: true` field on the last two entries. This is important - it tells ArgoCD to evaluate the value as a Jsonnet expression rather than treating it as a plain string. Without `code: true`, the value "3" would be passed as the string `"3"`, not the number `3`. With `code: true`, it is passed as the integer `3`.

## Writing the Jsonnet Function

Here is a complete Jsonnet file that uses TLAs to generate a full application stack:

```jsonnet
// main.jsonnet - Function-style entry point with TLA parameters
function(
  environment='staging',
  image_tag='latest',
  namespace='default',
  replicas=1,
  enable_monitoring=false,
)

// Resource presets based on environment
local resourcePresets = {
  staging: {
    requests: { cpu: '100m', memory: '128Mi' },
    limits: { cpu: '500m', memory: '256Mi' },
  },
  production: {
    requests: { cpu: '500m', memory: '512Mi' },
    limits: { cpu: '2000m', memory: '1Gi' },
  },
};

local resources = if std.objectHas(resourcePresets, environment)
  then resourcePresets[environment]
  else resourcePresets.staging;

// Base manifests
local baseManifests = [
  // Deployment
  {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: 'my-service',
      namespace: namespace,
      labels: {
        app: 'my-service',
        environment: environment,
        version: image_tag,
      },
    },
    spec: {
      replicas: replicas,
      selector: { matchLabels: { app: 'my-service' } },
      template: {
        metadata: {
          labels: {
            app: 'my-service',
            environment: environment,
            version: image_tag,
          },
        },
        spec: {
          containers: [{
            name: 'my-service',
            image: 'my-registry/my-service:' + image_tag,
            ports: [{ containerPort: 8080, name: 'http' }],
            resources: resources,
            livenessProbe: {
              httpGet: { path: '/health', port: 'http' },
              initialDelaySeconds: 15,
              periodSeconds: 10,
            },
            readinessProbe: {
              httpGet: { path: '/ready', port: 'http' },
              initialDelaySeconds: 5,
              periodSeconds: 5,
            },
          }],
        },
      },
    },
  },

  // Service
  {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: 'my-service',
      namespace: namespace,
      labels: { app: 'my-service' },
    },
    spec: {
      selector: { app: 'my-service' },
      ports: [{
        name: 'http',
        port: 80,
        targetPort: 'http',
      }],
    },
  },
];

// Conditional monitoring resources
local monitoringManifests = if enable_monitoring then [
  {
    apiVersion: 'monitoring.coreos.com/v1',
    kind: 'ServiceMonitor',
    metadata: {
      name: 'my-service',
      namespace: namespace,
      labels: { app: 'my-service' },
    },
    spec: {
      selector: { matchLabels: { app: 'my-service' } },
      endpoints: [{
        port: 'http',
        path: '/metrics',
        interval: '30s',
      }],
    },
  },
] else [];

// Return combined manifests
baseManifests + monitoringManifests
```

## The Code Flag Explained

The `code: true` flag in ArgoCD's TLA configuration determines how the value is interpreted:

| Value in YAML | code: false (default) | code: true |
|---|---|---|
| `"3"` | String `"3"` | Number `3` |
| `"true"` | String `"true"` | Boolean `true` |
| `"[1,2,3]"` | String `"[1,2,3]"` | Array `[1,2,3]` |
| `"{a:1}"` | String `"{a:1}"` | Object `{a:1}` |

This is equivalent to the difference between `--tla-str` and `--tla-code` on the Jsonnet command line.

```yaml
# Passing structured data as TLA code
directory:
  jsonnet:
    tlas:
      # Pass a Jsonnet object as a TLA
      - name: extra_config
        value: |
          {
            feature_flags: {
              new_ui: true,
              beta_api: false,
            },
            rate_limits: {
              api: 1000,
              webhook: 100,
            },
          }
        code: true
```

## Using TLAs with the ArgoCD CLI

When creating or updating applications via the CLI, use the `--jsonnet-tla-str` and `--jsonnet-tla-code` flags:

```bash
# Create application with TLA string parameters
argocd app create my-service-staging \
  --repo https://github.com/your-org/k8s-manifests.git \
  --path apps/my-service \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace staging \
  --jsonnet-tla-str environment=staging \
  --jsonnet-tla-str image_tag=v1.5.0 \
  --jsonnet-tla-str namespace=staging \
  --jsonnet-tla-code replicas=3 \
  --jsonnet-tla-code enable_monitoring=true
```

## Combining TLAs with Libraries

TLAs work well with Jsonnet library imports. You can create reusable library functions and use TLAs as the entry point that configures everything:

```jsonnet
// lib/k8s.libsonnet - Reusable Kubernetes resource constructors
{
  deployment(name, image, opts={}):: {
    local defaults = {
      replicas: 1,
      port: 8080,
      resources: { requests: { cpu: '100m', memory: '128Mi' } },
      env: [],
    },
    local config = defaults + opts,

    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: name,
      labels: { app: name },
    },
    spec: {
      replicas: config.replicas,
      selector: { matchLabels: { app: name } },
      template: {
        metadata: { labels: { app: name } },
        spec: {
          containers: [{
            name: name,
            image: image,
            ports: [{ containerPort: config.port }],
            resources: config.resources,
            env: config.env,
          }],
        },
      },
    },
  },

  service(name, port=80, targetPort=8080):: {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: { name: name, labels: { app: name } },
    spec: {
      selector: { app: name },
      ports: [{ port: port, targetPort: targetPort }],
    },
  },
}
```

```jsonnet
// main.jsonnet - Clean TLA entry point using library
local k8s = import 'lib/k8s.libsonnet';

function(environment='staging', image_tag='latest', replicas=1)
[
  k8s.deployment('my-service', 'my-registry/my-service:' + image_tag, {
    replicas: replicas,
    env: [
      { name: 'ENVIRONMENT', value: environment },
    ],
  }),
  k8s.service('my-service'),
]
```

## Testing TLAs Locally

Always test your TLA-based Jsonnet locally before pushing to Git:

```bash
# Test with string TLAs
jsonnet --tla-str environment=staging \
        --tla-str image_tag=v1.5.0 \
        --tla-code replicas=3 \
        --tla-code enable_monitoring=true \
        main.jsonnet | python3 -m json.tool

# Compare staging vs production output
diff <(jsonnet --tla-str environment=staging --tla-code replicas=2 main.jsonnet) \
     <(jsonnet --tla-str environment=production --tla-code replicas=5 main.jsonnet)
```

## Best Practices for TLAs in ArgoCD

**Use default values** - Always provide default values in your function signature so the template works even if ArgoCD does not pass all parameters. This makes local testing easier too.

**Prefer TLAs over extVars** - TLAs make your Jsonnet files self-documenting functions with explicit interfaces. New team members can see exactly what parameters are available by reading the function signature.

**Use `code: true` for non-strings** - Always set `code: true` when passing numbers, booleans, arrays, or objects. Forgetting this is one of the most common mistakes.

**Keep parameters flat** - If you find yourself passing deeply nested objects as TLAs, consider restructuring your Jsonnet to accept simpler parameters and build the complex structures internally.

For more on Jsonnet with ArgoCD, check out our guide on [deploying Jsonnet applications](https://oneuptime.com/blog/post/2026-02-26-argocd-deploy-jsonnet-applications/view) and [configuring library paths](https://oneuptime.com/blog/post/2026-02-26-argocd-jsonnet-library-paths/view).
