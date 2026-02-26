# How to Use Jsonnet External Variables in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Jsonnet, Configuration Management

Description: Learn how to pass external variables to Jsonnet applications in ArgoCD for environment-specific configurations without modifying source files.

---

Jsonnet external variables (extVars) let you inject values into your Jsonnet templates at evaluation time without changing the source files. In ArgoCD, this means you can use a single Jsonnet codebase across multiple environments by passing different external variables for each ArgoCD Application. This is one of the most practical features for managing environment-specific configuration in a GitOps workflow.

## What Are Jsonnet External Variables

External variables in Jsonnet are values passed from outside the Jsonnet file during evaluation. Inside your Jsonnet code, you access them using `std.extVar('variableName')`. The Jsonnet evaluator resolves these at render time, so the same source file can produce different output depending on the variables passed.

Think of extVars as environment variables for your Jsonnet templates. They are useful for values that change between environments, like replica counts, image tags, resource limits, or feature flags.

## Configuring ExtVars in ArgoCD Application Spec

ArgoCD supports passing external variables through the Application spec under the `directory.jsonnet.extVars` field. Here is how you define them:

```yaml
# argocd-app-staging.yaml - Application with Jsonnet external variables
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-api-staging
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/k8s-manifests.git
    targetRevision: main
    path: apps/my-api
    directory:
      jsonnet:
        extVars:
          # String external variables
          - name: environment
            value: staging
          - name: image_tag
            value: v2.3.1
          - name: domain
            value: staging.example.com
          # You can also pass JSON-encoded values as strings
          - name: replicas
            value: "2"
  destination:
    server: https://kubernetes.default.svc
    namespace: staging
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Each extVar entry has a `name` and a `value`. Both must be strings. If you need to pass numeric or boolean values, pass them as strings and convert them inside your Jsonnet code.

## Using ExtVars in Your Jsonnet Code

Now let us write the Jsonnet that consumes these variables:

```jsonnet
// main.jsonnet - Uses external variables from ArgoCD
local env = std.extVar('environment');
local imageTag = std.extVar('image_tag');
local domain = std.extVar('domain');
local replicas = std.parseInt(std.extVar('replicas'));

// Environment-specific configuration lookup
local envConfig = {
  staging: {
    resources: {
      requests: { cpu: '100m', memory: '128Mi' },
      limits: { cpu: '500m', memory: '256Mi' },
    },
    logLevel: 'debug',
  },
  production: {
    resources: {
      requests: { cpu: '500m', memory: '512Mi' },
      limits: { cpu: '2000m', memory: '1Gi' },
    },
    logLevel: 'warn',
  },
};

local config = envConfig[env];

[
  // Deployment
  {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: 'my-api',
      namespace: env,
      labels: {
        app: 'my-api',
        environment: env,
      },
    },
    spec: {
      replicas: replicas,
      selector: { matchLabels: { app: 'my-api' } },
      template: {
        metadata: { labels: { app: 'my-api', environment: env } },
        spec: {
          containers: [{
            name: 'my-api',
            image: 'my-registry/my-api:' + imageTag,
            ports: [{ containerPort: 8080 }],
            resources: config.resources,
            env: [
              { name: 'ENVIRONMENT', value: env },
              { name: 'LOG_LEVEL', value: config.logLevel },
              { name: 'BASE_URL', value: 'https://' + domain },
            ],
          }],
        },
      },
    },
  },

  // Ingress
  {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'Ingress',
    metadata: {
      name: 'my-api',
      namespace: env,
      annotations: {
        'kubernetes.io/ingress.class': 'nginx',
        'cert-manager.io/cluster-issuer': 'letsencrypt-prod',
      },
    },
    spec: {
      tls: [{ hosts: [domain], secretName: 'my-api-tls' }],
      rules: [{
        host: domain,
        http: {
          paths: [{
            path: '/',
            pathType: 'Prefix',
            backend: {
              service: { name: 'my-api', port: { number: 8080 } },
            },
          }],
        },
      }],
    },
  },
]
```

## Creating Multiple Environment Applications

The real power of extVars shows when you create multiple ArgoCD Applications from the same Jsonnet source, each with different variables:

```yaml
# argocd-app-production.yaml - Production uses different extVars
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-api-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/k8s-manifests.git
    targetRevision: main
    path: apps/my-api
    directory:
      jsonnet:
        extVars:
          - name: environment
            value: production
          - name: image_tag
            value: v2.3.0
          - name: domain
            value: api.example.com
          - name: replicas
            value: "5"
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Both applications point to the same `path: apps/my-api` in the same repo, but they produce completely different manifests based on the extVars.

## Using ExtVars with ApplicationSets

If you are managing many environments, ApplicationSets make this even cleaner. You can generate applications with different extVars per environment:

```yaml
# applicationset-my-api.yaml - Generate apps for all environments
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-api-environments
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - environment: staging
            imageTag: v2.3.1
            domain: staging.example.com
            replicas: "2"
            cluster: https://kubernetes.default.svc
          - environment: production
            imageTag: v2.3.0
            domain: api.example.com
            replicas: "5"
            cluster: https://kubernetes.default.svc
  template:
    metadata:
      name: 'my-api-{{environment}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/your-org/k8s-manifests.git
        targetRevision: main
        path: apps/my-api
        directory:
          jsonnet:
            extVars:
              - name: environment
                value: '{{environment}}'
              - name: image_tag
                value: '{{imageTag}}'
              - name: domain
                value: '{{domain}}'
              - name: replicas
                value: '{{replicas}}'
      destination:
        server: '{{cluster}}'
        namespace: '{{environment}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

## Passing Complex Data Through ExtVars

Sometimes you need to pass structured data, not just simple strings. Since extVars are always strings in ArgoCD, the pattern is to pass JSON-encoded strings and parse them inside Jsonnet:

```yaml
# Pass JSON-encoded complex data as an extVar
directory:
  jsonnet:
    extVars:
      - name: feature_flags
        value: '{"canary_enabled":true,"new_ui":false,"rate_limit":1000}'
      - name: extra_labels
        value: '{"team":"platform","cost-center":"engineering"}'
```

```jsonnet
// Parse JSON-encoded extVars in Jsonnet
local featureFlags = std.parseJson(std.extVar('feature_flags'));
local extraLabels = std.parseJson(std.extVar('extra_labels'));

[
  {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: 'my-api',
      labels: { app: 'my-api' } + extraLabels,
    },
    spec: {
      template: {
        spec: {
          containers: [{
            name: 'my-api',
            image: 'my-registry/my-api:latest',
            env: [
              { name: 'CANARY_ENABLED', value: std.toString(featureFlags.canary_enabled) },
              { name: 'NEW_UI', value: std.toString(featureFlags.new_ui) },
              { name: 'RATE_LIMIT', value: std.toString(featureFlags.rate_limit) },
            ],
          }],
        },
      },
    },
  },
]
```

## ExtVars via ArgoCD CLI

You can also set extVars when creating applications through the CLI using the `--jsonnet-ext-var-str` flag:

```bash
# Create application with extVars via CLI
argocd app create my-api-staging \
  --repo https://github.com/your-org/k8s-manifests.git \
  --path apps/my-api \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace staging \
  --jsonnet-ext-var-str environment=staging \
  --jsonnet-ext-var-str image_tag=v2.3.1 \
  --jsonnet-ext-var-str domain=staging.example.com \
  --jsonnet-ext-var-str replicas=2
```

## Debugging ExtVar Issues

When extVars are not working as expected, use these debugging steps:

```bash
# View the rendered manifests to see what ArgoCD will apply
argocd app manifests my-api-staging --source live

# Check application details for any rendering errors
argocd app get my-api-staging

# Test Jsonnet rendering locally with the same extVars
jsonnet --ext-str environment=staging \
        --ext-str image_tag=v2.3.1 \
        --ext-str domain=staging.example.com \
        --ext-str replicas=2 \
        main.jsonnet
```

Common issues include missing extVars (Jsonnet will throw an error if `std.extVar()` references a variable that was not passed), typos in variable names, and forgetting that all values are strings.

## Best Practices

**Keep extVars minimal** - Only externalize values that truly change between environments. Configuration that is the same everywhere should be defined in the Jsonnet code itself.

**Use defaults** - Provide sensible defaults in your Jsonnet code so the application works even if an extVar is not provided:

```jsonnet
// Safe default handling for optional extVars
local env = if std.extVar('environment') != '' then std.extVar('environment') else 'staging';
```

**Document your extVars** - Add a comment at the top of your `main.jsonnet` listing expected extVars and their types.

**Avoid secrets in extVars** - ExtVar values are stored in the ArgoCD Application resource, which is visible in the cluster. Use Kubernetes Secrets or external secret management for sensitive values.

For more on Jsonnet with ArgoCD, see our guide on [top-level arguments](https://oneuptime.com/blog/post/2026-02-26-argocd-jsonnet-tla-top-level-arguments/view) which offers an alternative approach to parameterization, and [debugging Jsonnet rendering](https://oneuptime.com/blog/post/2026-02-26-argocd-debug-jsonnet-rendering/view) for troubleshooting.
