# How to Use Go Templates in ArgoCD ApplicationSets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, ApplicationSets, Go Templates

Description: Learn how to use Go template syntax in ArgoCD ApplicationSets for advanced string manipulation, conditionals, and dynamic application generation.

---

ArgoCD ApplicationSets support two templating approaches: the default string substitution with `{{parameter}}` syntax, and the more powerful Go template engine. Go templates unlock conditionals, loops, string functions, and complex logic that the basic substitution simply cannot handle.

This guide walks you through enabling Go templates, understanding the syntax differences, and applying practical patterns that solve real-world problems.

## Enabling Go Templates

Go templates are not enabled by default. You must explicitly opt in by setting `goTemplate: true` in your ApplicationSet spec. Once enabled, the template syntax changes from `{{parameter}}` to `{{.parameter}}` (note the dot prefix).

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-apps
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - list:
        elements:
          - name: frontend
            env: production
            replicas: "3"
  template:
    metadata:
      # Go template syntax uses dot notation
      name: '{{.name}}-{{.env}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/apps.git
        targetRevision: HEAD
        path: '{{.name}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{.name}}'
```

The `goTemplateOptions` field is important. Setting `missingkey=error` causes the template to fail if you reference a parameter that does not exist, which helps catch typos early.

## Basic String Functions

Go templates come with a rich set of built-in functions through the Sprig library that ArgoCD includes. Here are the most commonly used ones.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: formatted-apps
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - list:
        elements:
          - name: My Frontend Service
            env: PRODUCTION
            team: Platform Engineering
  template:
    metadata:
      # Convert to lowercase and replace spaces with hyphens
      name: '{{.name | normalize}}'
      labels:
        # Convert to lowercase
        environment: '{{.env | lower}}'
        # Convert to kebab-case
        team: '{{.team | lower | replace " " "-"}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/apps.git
        targetRevision: HEAD
        path: 'apps/{{.name | normalize}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{.env | lower}}'
```

The `normalize` function is particularly useful. It converts strings to a DNS-compatible format by lowercasing and replacing non-alphanumeric characters with hyphens.

## Conditionals with if/else

Go templates let you use conditionals to dynamically change parts of your ApplicationSet template.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: conditional-apps
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - list:
        elements:
          - name: api-service
            env: production
            ha: "true"
          - name: api-service
            env: staging
            ha: "false"
  template:
    metadata:
      name: '{{.name}}-{{.env}}'
      annotations:
        # Conditional annotation based on environment
        notifications.argoproj.io/subscribe.on-sync-succeeded.slack: '{{if eq .env "production"}}prod-deploys{{else}}dev-deploys{{end}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/apps.git
        targetRevision: '{{if eq .env "production"}}main{{else}}develop{{end}}'
        path: 'overlays/{{.env}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{.name}}-{{.env}}'
      syncPolicy:
        automated:
          prune: true
          # Only enable self-heal in production
          selfHeal: {{if eq .ha "true"}}true{{else}}false{{end}}
```

Conditionals help you maintain a single ApplicationSet while varying behavior across environments. Without Go templates, you would need separate ApplicationSets for each variation.

## String Comparison and Logic Operators

Go templates support several comparison operators.

```yaml
# Equality check
'{{if eq .env "production"}}prod-value{{end}}'

# Not equal
'{{if ne .env "development"}}non-dev{{end}}'

# AND condition
'{{if and (eq .env "production") (eq .region "us-east-1")}}'

# OR condition
'{{if or (eq .env "production") (eq .env "staging")}}'

# NOT condition
'{{if not (eq .env "development")}}'
```

Here is a practical example combining multiple conditions.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: multi-condition-apps
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - clusters:
        selector:
          matchLabels:
            argocd.argoproj.io/secret-type: cluster
  template:
    metadata:
      name: 'ingress-{{.name}}'
      annotations:
        # Only add PagerDuty annotation for production clusters
        {{- if and (eq .metadata.labels.environment "production") (eq .metadata.labels.tier "critical") }}
        notifications.argoproj.io/subscribe.on-health-degraded.pagerduty: critical-team
        {{- end }}
    spec:
      project: infrastructure
      source:
        repoURL: https://github.com/myorg/infra.git
        targetRevision: HEAD
        path: 'ingress/{{if eq .metadata.labels.cloud "aws"}}aws{{else if eq .metadata.labels.cloud "gcp"}}gcp{{else}}generic{{end}}'
      destination:
        server: '{{.server}}'
        namespace: ingress-nginx
```

## Using the index Function for Nested Data

When working with the cluster generator, cluster labels are accessible through nested paths. Use the `index` function to access map values safely.

```yaml
# Access cluster label values
name: '{{index .metadata.labels "environment"}}'

# Access nested map values with a default
name: '{{default "unknown" (index .metadata.labels "team")}}'
```

## Default Values

The `default` function prevents empty values when a parameter might be missing.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: apps-with-defaults
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - git:
        repoURL: https://github.com/myorg/services.git
        revision: HEAD
        files:
          - path: 'services/*/config.json'
  template:
    metadata:
      # Use a default namespace if not specified in config
      name: '{{.name}}'
    spec:
      project: '{{default "default" .project}}'
      source:
        repoURL: https://github.com/myorg/services.git
        targetRevision: '{{default "HEAD" .revision}}'
        path: 'services/{{.name}}/manifests'
      destination:
        server: '{{default "https://kubernetes.default.svc" .cluster_url}}'
        namespace: '{{default .name .namespace}}'
```

## String Manipulation Functions

Go templates with Sprig provide extensive string operations.

```yaml
# Truncate a string
name: '{{.name | trunc 63}}'

# Trim whitespace
name: '{{.name | trim}}'

# Replace characters
path: '{{.path | replace "/" "-"}}'

# Convert to title case
label: '{{.team | title}}'

# Join a string with separator (useful with list data)
annotation: '{{.tags | join ","}}'

# Substring
prefix: '{{.name | trunc 5}}'

# Contains check
'{{if contains "prod" .env}}production-config{{end}}'

# HasPrefix / HasSuffix
'{{if hasPrefix "us-" .region}}north-america{{end}}'
```

## Practical Example: Multi-Environment with Go Templates

Here is a complete example showing how Go templates simplify multi-environment management.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: platform-services
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - matrix:
        generators:
          - list:
              elements:
                - env: dev
                  cluster_url: https://dev.example.com
                  values_file: values-dev.yaml
                - env: staging
                  cluster_url: https://staging.example.com
                  values_file: values-staging.yaml
                - env: production
                  cluster_url: https://prod.example.com
                  values_file: values-prod.yaml
          - git:
              repoURL: https://github.com/myorg/platform.git
              revision: HEAD
              directories:
                - path: 'charts/*'
  template:
    metadata:
      name: '{{.path.basename}}-{{.env}}'
      labels:
        app: '{{.path.basename}}'
        env: '{{.env}}'
      annotations:
        # Dynamic notification channel
        notifications.argoproj.io/subscribe.on-sync-failed.slack: >-
          {{if eq .env "production"}}prod-alerts{{else}}{{.env}}-deploys{{end}}
    spec:
      project: '{{if eq .env "production"}}production{{else}}non-production{{end}}'
      source:
        repoURL: https://github.com/myorg/platform.git
        targetRevision: '{{if eq .env "production"}}main{{else if eq .env "staging"}}release{{else}}develop{{end}}'
        path: 'charts/{{.path.basename}}'
        helm:
          valueFiles:
            - '{{.values_file}}'
      destination:
        server: '{{.cluster_url}}'
        namespace: '{{.path.basename}}'
      syncPolicy:
        automated:
          prune: {{if eq .env "production"}}false{{else}}true{{end}}
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

## Debugging Go Templates

When Go templates produce unexpected results, check these common issues.

First, make sure `goTemplate: true` is set. If you use `{{.name}}` without enabling Go templates, the ApplicationSet controller treats it as literal text.

Second, check your template with the ArgoCD CLI.

```bash
# View the generated applications
kubectl get applicationset platform-services -n argocd -o yaml

# Check the status conditions for template errors
kubectl describe applicationset platform-services -n argocd
```

Third, use `goTemplateOptions: ["missingkey=error"]` during development. This makes missing keys fail loudly instead of silently producing empty strings.

Go templates are a significant upgrade over basic string substitution. They allow you to handle complex scenarios with a single ApplicationSet instead of maintaining multiple separate ones. For monitoring the applications generated by your templated ApplicationSets, tools like [OneUptime](https://oneuptime.com/blog/post/2026-02-26-argocd-applicationset-post-selectors/view) can help you track sync status and health across all your dynamically generated applications.
