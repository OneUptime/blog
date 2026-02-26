# How to Use Helm Template Syntax in ArgoCD ApplicationSets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, ApplicationSets, Helm

Description: Learn how to use Helm-style template syntax in ArgoCD ApplicationSets as an alternative to the default fasttemplate substitution.

---

ArgoCD ApplicationSets support two primary templating mechanisms: the default fasttemplate (double curly brace) syntax and Go templates. While there is no separate "Helm template syntax" mode in ApplicationSets, many teams coming from Helm expect to use similar patterns. This guide explains how ApplicationSet templating relates to Helm templating, how to leverage Go templates for Helm-like behavior, and how to properly configure Helm-based sources within ApplicationSets.

## Default Template Syntax vs Go Templates

The default ApplicationSet template syntax uses double curly braces without a dot prefix.

```yaml
# Default fasttemplate syntax
name: '{{cluster}}-{{app}}'
```

When you enable Go templates, the syntax shifts to include a dot prefix, which is closer to what Helm users are familiar with.

```yaml
# Go template syntax (similar to Helm)
name: '{{.cluster}}-{{.app}}'
```

Helm users will recognize the `{{.Values.something}}` pattern. In ApplicationSets with Go templates enabled, your generator parameters act like Helm's `.Values` object, but they are accessed directly as `{{.parameterName}}`.

## Enabling Go Templates for Helm-Like Behavior

To get the closest experience to Helm templating, enable Go templates in your ApplicationSet.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: helm-style-apps
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - list:
        elements:
          - name: web-app
            environment: production
            replicas: "3"
            domain: app.example.com
          - name: web-app
            environment: staging
            replicas: "1"
            domain: staging.app.example.com
  template:
    metadata:
      name: '{{.name}}-{{.environment}}'
      labels:
        app.kubernetes.io/name: '{{.name}}'
        app.kubernetes.io/env: '{{.environment}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/charts.git
        targetRevision: HEAD
        path: 'charts/{{.name}}'
        helm:
          # Pass generator parameters as Helm values
          parameters:
            - name: replicaCount
              value: '{{.replicas}}'
            - name: ingress.host
              value: '{{.domain}}'
          valueFiles:
            - 'values-{{.environment}}.yaml'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{.name}}-{{.environment}}'
```

## Helm-Like Functions with Sprig

When Go templates are enabled, ArgoCD includes the Sprig template function library, which is the same library Helm uses. This means you have access to the same functions.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: sprig-functions-demo
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - list:
        elements:
          - name: My Application Service
            team: platform-engineering
            version: v2.5.1
  template:
    metadata:
      # Sprig functions familiar to Helm users
      name: '{{.name | kebabcase | trunc 63}}'
      labels:
        # Quote values like Helm's {{ .Values.x | quote }}
        team: '{{.team}}'
        # Upper case transformation
        version-label: '{{.version | upper}}'
      annotations:
        # Default values like Helm
        owner: '{{default "platform" .owner}}'
        # SHA256 for change detection
        config-hash: '{{.name | sha256sum | trunc 8}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/charts.git
        targetRevision: HEAD
        path: charts/my-app
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{.team}}'
```

Here are the Sprig functions most commonly used by Helm users that also work in ApplicationSet Go templates:

```yaml
# String manipulation (same as Helm)
'{{.name | lower}}'          # lowercase
'{{.name | upper}}'          # uppercase
'{{.name | title}}'          # Title Case
'{{.name | trim}}'           # strip whitespace
'{{.name | trimSuffix "-"}}' # remove suffix
'{{.name | trimPrefix "v"}}' # remove prefix
'{{.name | replace "." "-"}}' # replace characters
'{{.name | trunc 63}}'       # truncate to length
'{{.name | kebabcase}}'      # kebab-case
'{{.name | snakecase}}'      # snake_case
'{{.name | camelcase}}'      # camelCase

# Default values
'{{default "fallback" .value}}'

# Ternary (like Helm's ternary)
'{{ternary "yes" "no" (eq .env "production")}}'

# Contains
'{{if contains "prod" .env}}production{{end}}'
```

## Configuring Helm Sources with Dynamic Values

One of the most common patterns is using ApplicationSet templating to dynamically configure Helm chart deployments. Here is how to pass environment-specific Helm values.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: helm-per-env
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - list:
        elements:
          - env: dev
            cluster: https://dev.example.com
            helm_values: |
              replicaCount: 1
              resources:
                requests:
                  memory: 256Mi
                  cpu: 100m
          - env: staging
            cluster: https://staging.example.com
            helm_values: |
              replicaCount: 2
              resources:
                requests:
                  memory: 512Mi
                  cpu: 250m
          - env: production
            cluster: https://prod.example.com
            helm_values: |
              replicaCount: 3
              resources:
                requests:
                  memory: 1Gi
                  cpu: 500m
  template:
    metadata:
      name: 'myapp-{{.env}}'
    spec:
      project: default
      source:
        repoURL: https://charts.example.com
        chart: myapp
        targetRevision: 1.2.3
        helm:
          # Use inline values from the generator
          values: '{{.helm_values}}'
      destination:
        server: '{{.cluster}}'
        namespace: myapp
```

## Using Multiple Values Files with Helm

A common Helm pattern is overlaying multiple values files. ApplicationSets handle this cleanly.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: helm-multi-values
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
                  cluster: https://dev.example.com
                - env: production
                  cluster: https://prod.example.com
          - list:
              elements:
                - app: frontend
                  chart_path: charts/frontend
                - app: backend
                  chart_path: charts/backend
  template:
    metadata:
      name: '{{.app}}-{{.env}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/helm-configs.git
        targetRevision: HEAD
        path: '{{.chart_path}}'
        helm:
          valueFiles:
            # Base values
            - values.yaml
            # Environment-specific overrides
            - 'values-{{.env}}.yaml'
      destination:
        server: '{{.cluster}}'
        namespace: '{{.app}}'
```

## Conditional Helm Parameters

Go templates let you conditionally add or change Helm parameters, which is something basic substitution cannot do.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: conditional-helm
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - list:
        elements:
          - name: api
            env: production
            tls: "true"
            domain: api.example.com
          - name: api
            env: dev
            tls: "false"
            domain: api.dev.example.com
  template:
    metadata:
      name: '{{.name}}-{{.env}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/charts.git
        targetRevision: HEAD
        path: 'charts/{{.name}}'
        helm:
          parameters:
            - name: ingress.host
              value: '{{.domain}}'
            - name: ingress.tls.enabled
              value: '{{.tls}}'
            - name: ingress.annotations.cert-manager\.io/cluster-issuer
              value: '{{if eq .tls "true"}}letsencrypt-prod{{else}}{{end}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{.name}}-{{.env}}'
```

## Whitespace Control

Just like Helm, Go templates in ApplicationSets support whitespace trimming with `{{-` and `-}}`.

```yaml
# Without whitespace control (may produce blank lines)
annotations:
  {{if eq .env "production"}}
  monitoring: enabled
  {{end}}

# With whitespace control (clean output)
annotations:
  {{- if eq .env "production"}}
  monitoring: enabled
  {{- end}}
```

This is especially important in ApplicationSet templates where stray whitespace can cause YAML parsing issues.

## Common Pitfalls for Helm Users

There are a few differences between Helm templating and ApplicationSet Go templates that Helm users should watch out for.

First, there is no `.Values` prefix. In Helm you write `{{.Values.name}}`, but in ApplicationSets you write `{{.name}}` directly.

Second, ApplicationSet templates operate on the ApplicationSet manifest itself, not on arbitrary Kubernetes resources. You are templating the Application spec, not the deployed workload.

Third, you cannot use `range` to iterate over lists in the same way Helm does, because generator parameters are flat key-value pairs. If you need iteration, structure your generators to produce one entry per item.

```bash
# Verify your ApplicationSet template rendering
kubectl get applicationset conditional-helm -n argocd -o yaml | \
  yq '.status'
```

For teams transitioning from Helm-only workflows to ArgoCD ApplicationSets, the Go template support makes the learning curve much smoother. The familiar Sprig functions and similar syntax patterns mean you can apply most of your existing Helm templating knowledge directly.

To monitor the health of all your Helm-based ApplicationSet deployments, consider using [OneUptime](https://oneuptime.com/blog/post/2026-02-26-argocd-applicationset-go-templates/view) for centralized observability across environments.
