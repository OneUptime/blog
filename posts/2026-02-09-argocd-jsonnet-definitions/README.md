# How to implement ArgoCD with Jsonnet for programmatic application definitions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Jsonnet, Kubernetes, GitOps, Configuration Management

Description: Learn how to use Jsonnet with ArgoCD to create dynamic, programmatic Kubernetes manifests that reduce duplication and enable powerful templating for your GitOps workflows.

---

Managing hundreds of similar Kubernetes applications with static YAML files leads to massive duplication and maintenance overhead. Jsonnet, a data templating language, solves this problem by allowing you to generate manifests programmatically. When integrated with ArgoCD, Jsonnet enables you to define applications using functions, variables, and logic, dramatically reducing configuration complexity.

This guide shows you how to implement ArgoCD with Jsonnet, from basic templates to advanced patterns for generating multiple applications from a single definition.

## Understanding Jsonnet for Kubernetes

Jsonnet extends JSON with features like variables, functions, conditionals, and imports. Unlike YAML templating tools like Helm, Jsonnet is a full programming language that generates JSON (which Kubernetes accepts as YAML).

Key Jsonnet advantages:
- Pure functions with no side effects
- Strong typing and validation
- Composable libraries and mixins
- Native support for multi-environment configurations
- No custom template syntax to learn

ArgoCD has built-in Jsonnet support, making it seamless to use Jsonnet as a source type.

## Setting up ArgoCD with Jsonnet

ArgoCD automatically detects and processes Jsonnet files with `.jsonnet` extensions. Here's a basic repository structure:

```
my-app-repo/
├── environments/
│   ├── dev.jsonnet
│   ├── staging.jsonnet
│   └── production.jsonnet
├── lib/
│   ├── kubernetes.libsonnet
│   └── app.libsonnet
└── main.jsonnet
```

Create an Application pointing to Jsonnet files:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-jsonnet-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/app-repo.git
    targetRevision: main
    path: environments
    directory:
      jsonnet:
        extVars:
          - name: environment
            value: production
          - name: replicas
            value: "3"
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Creating basic Jsonnet manifests

Start with a simple Jsonnet file that generates a Deployment and Service:

```jsonnet
// main.jsonnet
local k = import 'kubernetes.libsonnet';

local appName = 'web-server';
local namespace = 'production';
local image = 'nginx:1.21';
local replicas = 3;

{
  deployment: k.apps.v1.deployment.new(
    name=appName,
    replicas=replicas,
    containers=[
      k.core.v1.container.new(
        name='nginx',
        image=image
      )
      + k.core.v1.container.withPorts([
        k.core.v1.containerPort.new(80)
      ])
    ]
  )
  + k.apps.v1.deployment.metadata.withNamespace(namespace)
  + k.apps.v1.deployment.metadata.withLabels({
    app: appName,
    environment: 'production',
  }),

  service: k.core.v1.service.new(
    name=appName,
    selector={ app: appName },
    ports=[
      k.core.v1.servicePort.new(80, 80)
    ]
  )
  + k.core.v1.service.metadata.withNamespace(namespace)
  + k.core.v1.service.spec.withType('ClusterIP'),
}
```

This Jsonnet code generates two Kubernetes resources. ArgoCD processes this file and applies the resulting manifests.

## Using external variables for environment-specific configuration

External variables (`extVars`) allow you to parameterize your Jsonnet code:

```jsonnet
// environments/app.jsonnet
local environment = std.extVar('environment');
local replicas = std.parseJson(std.extVar('replicas'));
local domain = std.extVar('domain');

local config = {
  dev: {
    resources: {
      requests: { cpu: '100m', memory: '128Mi' },
      limits: { cpu: '200m', memory: '256Mi' },
    },
    storageClass: 'standard',
  },
  staging: {
    resources: {
      requests: { cpu: '200m', memory: '256Mi' },
      limits: { cpu: '500m', memory: '512Mi' },
    },
    storageClass: 'fast',
  },
  production: {
    resources: {
      requests: { cpu: '500m', memory: '512Mi' },
      limits: { cpu: '1', memory: '1Gi' },
    },
    storageClass: 'fast-ssd',
  },
}[environment];

{
  apiVersion: 'apps/v1',
  kind: 'Deployment',
  metadata: {
    name: 'web-app',
    namespace: environment,
  },
  spec: {
    replicas: replicas,
    selector: {
      matchLabels: { app: 'web-app' },
    },
    template: {
      metadata: {
        labels: { app: 'web-app', environment: environment },
      },
      spec: {
        containers: [
          {
            name: 'app',
            image: 'myorg/web-app:latest',
            resources: config.resources,
            env: [
              { name: 'ENVIRONMENT', value: environment },
              { name: 'DOMAIN', value: domain },
            ],
          },
        ],
      },
    },
  },
}
```

Configure the Application to pass these variables:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web-app-production
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/app-repo.git
    targetRevision: main
    path: environments
    directory:
      jsonnet:
        extVars:
          - name: environment
            value: production
          - name: replicas
            value: "5"
          - name: domain
            value: app.example.com
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

## Building reusable Jsonnet libraries

Create reusable libraries to standardize application definitions:

```jsonnet
// lib/app.libsonnet
local k = import 'kubernetes.libsonnet';

{
  // Function to create a standard web application
  webApp(name, namespace, image, replicas=3, port=8080):: {
    local labels = { app: name },

    deployment: k.apps.v1.deployment.new(
      name=name,
      replicas=replicas,
      containers=[
        k.core.v1.container.new(name=name, image=image)
        + k.core.v1.container.withPorts([
          k.core.v1.containerPort.new(port)
        ])
        + k.core.v1.container.livenessProbe.httpGet.withPath('/health')
        + k.core.v1.container.livenessProbe.httpGet.withPort(port)
        + k.core.v1.container.readinessProbe.httpGet.withPath('/ready')
        + k.core.v1.container.readinessProbe.httpGet.withPort(port)
      ]
    )
    + k.apps.v1.deployment.metadata.withNamespace(namespace)
    + k.apps.v1.deployment.metadata.withLabels(labels)
    + k.apps.v1.deployment.spec.selector.withMatchLabels(labels),

    service: k.core.v1.service.new(
      name=name,
      selector=labels,
      ports=[k.core.v1.servicePort.new(port, port)]
    )
    + k.core.v1.service.metadata.withNamespace(namespace),

    ingress: k.networking.v1.ingress.new(name)
    + k.networking.v1.ingress.metadata.withNamespace(namespace)
    + k.networking.v1.ingress.spec.withRules([
      k.networking.v1.ingressRule.new()
      + k.networking.v1.ingressRule.http.withPaths([
        k.networking.v1.httpIngressPath.new(path='/')
        + k.networking.v1.httpIngressPath.backend.service.withName(name)
        + k.networking.v1.httpIngressPath.backend.service.port.withNumber(port)
      ])
    ]),
  },

  // Function to add resource requests/limits
  withResources(obj, requests, limits)::
    obj {
      deployment+: {
        spec+: {
          template+: {
            spec+: {
              containers: [
                c + {
                  resources: {
                    requests: requests,
                    limits: limits,
                  },
                }
                for c in super.containers
              ],
            },
          },
        },
      },
    },
}
```

Use this library to create applications concisely:

```jsonnet
// apps/frontend.jsonnet
local app = import '../lib/app.libsonnet';

local frontend = app.webApp(
  name='frontend',
  namespace='production',
  image='myorg/frontend:v1.2.3',
  replicas=5,
  port=3000
);

app.withResources(
  frontend,
  requests={ cpu: '200m', memory: '256Mi' },
  limits={ cpu: '500m', memory: '512Mi' }
)
```

## Generating multiple applications with Jsonnet

Use Jsonnet to generate multiple similar applications from a single definition:

```jsonnet
// microservices.jsonnet
local app = import 'lib/app.libsonnet';

local services = [
  { name: 'api', port: 8080, replicas: 3 },
  { name: 'auth', port: 8081, replicas: 2 },
  { name: 'notification', port: 8082, replicas: 2 },
  { name: 'scheduler', port: 8083, replicas: 1 },
];

local namespace = 'production';
local imageTag = 'v1.0.0';

{
  [service.name]: app.webApp(
    name=service.name,
    namespace=namespace,
    image='myorg/' + service.name + ':' + imageTag,
    replicas=service.replicas,
    port=service.port
  )
  for service in services
}
```

This single Jsonnet file generates Deployments, Services, and Ingresses for four microservices.

## Implementing Jsonnet with ArgoCD ApplicationSets

Combine Jsonnet with ApplicationSets to generate multiple Applications:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: microservices
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - service: api
            port: "8080"
            replicas: "3"
          - service: auth
            port: "8081"
            replicas: "2"
          - service: notification
            port: "8082"
            replicas: "2"
  template:
    metadata:
      name: '{{service}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/services.git
        targetRevision: main
        path: jsonnet
        directory:
          jsonnet:
            extVars:
              - name: serviceName
                value: '{{service}}'
              - name: port
                value: '{{port}}'
              - name: replicas
                value: '{{replicas}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: production
```

The Jsonnet file receives these variables and generates appropriate manifests for each service.

## Using Jsonnet TLAs (Top-Level Arguments)

TLAs allow passing complex objects to Jsonnet:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: app-with-tla
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/app.git
    targetRevision: main
    path: jsonnet
    directory:
      jsonnet:
        tlas:
          - name: config
            code: |
              {
                replicas: 3,
                resources: {
                  cpu: '500m',
                  memory: '512Mi'
                },
                features: ['auth', 'logging', 'metrics']
              }
```

Access TLAs in your Jsonnet:

```jsonnet
// main.jsonnet
function(config) {
  apiVersion: 'apps/v1',
  kind: 'Deployment',
  metadata: { name: 'app' },
  spec: {
    replicas: config.replicas,
    template: {
      spec: {
        containers: [{
          name: 'app',
          resources: {
            requests: {
              cpu: config.resources.cpu,
              memory: config.resources.memory,
            },
          },
          env: [
            { name: 'FEATURE_' + std.asciiUpper(f), value: 'true' }
            for f in config.features
          ],
        }],
      },
    },
  },
}
```

## Advanced Jsonnet patterns

**Conditional resource generation:**

```jsonnet
local enableIngress = std.extVar('enableIngress') == 'true';

{
  deployment: { /* deployment definition */ },
  service: { /* service definition */ },
} + if enableIngress then {
  ingress: { /* ingress definition */ },
} else {}
```

**Merging configurations:**

```jsonnet
local baseConfig = {
  replicas: 1,
  image: 'nginx:latest',
};

local prodConfig = baseConfig + {
  replicas: 5,
  resources: { /* production resources */ },
};
```

**Dynamic namespace generation:**

```jsonnet
local environments = ['dev', 'staging', 'production'];

{
  ['namespace-' + env]: {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: { name: env },
  }
  for env in environments
}
```

## Debugging Jsonnet in ArgoCD

When Jsonnet fails to render:

```bash
# View rendered manifests
argocd app manifests my-jsonnet-app

# Get detailed error messages
argocd app get my-jsonnet-app --show-params

# Test Jsonnet locally
jsonnet --ext-str environment=production \
        --ext-str replicas=3 \
        main.jsonnet
```

Common Jsonnet errors:
- Undefined external variables
- Syntax errors in Jsonnet code
- Import path issues with libraries
- Type mismatches (string vs. number)

## Best practices for Jsonnet with ArgoCD

1. **Keep Jsonnet files simple:** Complex logic makes debugging difficult.
2. **Use libraries for common patterns:** Create reusable functions for standard resources.
3. **Validate generated YAML:** Use `kubeval` or similar tools in CI.
4. **Version your Jsonnet libraries:** Use Git submodules or vendoring for library dependencies.
5. **Document external variables:** List required `extVars` in README files.
6. **Test across environments:** Ensure Jsonnet generates valid manifests for all environments.
7. **Use Jsonnet formatter:** Run `jsonnetfmt` to maintain consistent style.

## Conclusion

Jsonnet transforms how you define Kubernetes applications in ArgoCD by enabling programmatic manifest generation. With functions, variables, and powerful composition features, Jsonnet eliminates YAML duplication and makes it easy to manage multiple similar applications. By combining Jsonnet with ArgoCD's GitOps workflow, you create a maintainable, scalable configuration management system that grows with your infrastructure.
