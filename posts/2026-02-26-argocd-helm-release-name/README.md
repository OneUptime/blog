# How to Use Helm Release Name in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Configuration

Description: Learn how to configure and manage Helm release names in ArgoCD applications, including naming strategies, defaults, and common patterns.

---

When ArgoCD deploys a Helm chart, it creates a Helm release with a specific name. This release name is used in Helm's internal tracking, in template rendering (via `.Release.Name`), and often appears in Kubernetes resource names. Getting the release name right matters because it affects resource naming, Helm history, and how you interact with releases through the Helm CLI.

This guide covers how to set the Helm release name in ArgoCD, what the defaults are, and how to handle common scenarios around release naming.

## Default Release Name Behavior

By default, ArgoCD uses the Application name as the Helm release name. If your Application is named `my-app`, the Helm release will also be named `my-app`.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  # This name is used as the default Helm release name
  name: my-app
  namespace: argocd
spec:
  source:
    chart: nginx
    repoURL: https://charts.bitnami.com/bitnami
    targetRevision: 15.4.0
  destination:
    server: https://kubernetes.default.svc
    namespace: web
```

In this example, the Helm release name will be `my-app`, and templates that reference `.Release.Name` will output `my-app`.

## Setting a Custom Release Name

To use a different release name, set the `releaseName` field in the Helm configuration:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: production-nginx  # ArgoCD application name
  namespace: argocd
spec:
  source:
    chart: nginx
    repoURL: https://charts.bitnami.com/bitnami
    targetRevision: 15.4.0
    helm:
      # Custom Helm release name (different from the application name)
      releaseName: nginx-web
  destination:
    server: https://kubernetes.default.svc
    namespace: web
```

Using the CLI:

```bash
argocd app create production-nginx \
  --repo https://charts.bitnami.com/bitnami \
  --helm-chart nginx \
  --revision 15.4.0 \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace web \
  --release-name nginx-web
```

Now the Helm release is named `nginx-web`, while the ArgoCD Application is named `production-nginx`. Any template references to `.Release.Name` will output `nginx-web`.

## Why the Release Name Matters

The release name shows up in several places:

### 1. Resource Names

Many Helm charts use `.Release.Name` in resource names:

```yaml
# Chart template example
apiVersion: apps/v1
kind: Deployment
metadata:
  # If releaseName is "nginx-web", this becomes "nginx-web-nginx"
  name: {{ .Release.Name }}-{{ .Chart.Name }}
```

### 2. Helm History

The release name is used for Helm's revision history:

```bash
# List Helm releases in the namespace
helm list -n web
# NAME       NAMESPACE  REVISION  STATUS    CHART
# nginx-web  web        3         deployed  nginx-15.4.0

# View release history
helm history nginx-web -n web
```

### 3. Labels and Selectors

Charts often include the release name in labels:

```yaml
metadata:
  labels:
    app.kubernetes.io/instance: {{ .Release.Name }}
    helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
```

### 4. Service Discovery

Other applications might reference services by name, and if the service name includes the release name, you need to know what it will be.

## Common Release Name Patterns

### Pattern 1: Environment Prefix

Prefix the release name with the environment:

```yaml
# Development
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-dev
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/charts.git
    path: charts/my-app
    helm:
      releaseName: dev-my-app
  destination:
    server: https://kubernetes.default.svc
    namespace: dev
---
# Production
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-prod
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/charts.git
    path: charts/my-app
    helm:
      releaseName: prod-my-app
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

### Pattern 2: Consistent Short Names

Keep release names short and consistent, independent of the ArgoCD application name:

```yaml
# ArgoCD app name is descriptive (for humans)
# Release name is short (for Kubernetes resource names)
metadata:
  name: production-us-east-payment-service
spec:
  source:
    helm:
      releaseName: payment-svc  # Short and consistent
```

This is useful because Kubernetes has a 63-character limit on most resource names.

### Pattern 3: ApplicationSet with Templated Release Names

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: dev
            release: dev-my-app
          - env: staging
            release: staging-my-app
          - env: production
            release: prod-my-app
  template:
    metadata:
      name: 'my-app-{{env}}'
    spec:
      source:
        repoURL: https://github.com/myorg/charts.git
        path: charts/my-app
        helm:
          releaseName: '{{release}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{env}}'
```

## Release Name Constraints

Helm release names must follow these rules:

- Maximum 53 characters (Helm's limit)
- Must start with a lowercase letter or number
- Can only contain lowercase letters, numbers, and hyphens
- Must end with a lowercase letter or number

```yaml
# Valid release names
releaseName: my-app
releaseName: nginx-web-1
releaseName: prod-payment-service

# Invalid release names
releaseName: My-App        # Uppercase letters
releaseName: -my-app       # Starts with hyphen
releaseName: my_app        # Underscores not allowed
```

## Changing the Release Name

Changing the release name of an existing application is a destructive operation. ArgoCD treats it as a new release and the old release's resources become orphaned.

If you need to change the release name:

```bash
# Step 1: Delete the old application (be careful with prune settings)
argocd app delete my-app --cascade=false  # Keep the resources

# Step 2: Clean up old Helm release metadata
helm uninstall old-release-name -n web

# Step 3: Create the application with the new release name
argocd app create my-app \
  --repo https://github.com/myorg/charts.git \
  --path charts/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace web \
  --release-name new-release-name
```

## Viewing the Current Release Name

```bash
# Check the release name in the Application spec
argocd app get my-app -o json | jq '.spec.source.helm.releaseName'

# If null, the release name defaults to the application name
argocd app get my-app -o json | jq '.metadata.name'

# List Helm releases in the namespace
helm list -n web
```

## Release Name with Multi-Source Applications

For multi-source applications, the `releaseName` is set on the Helm source:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  sources:
    - chart: nginx
      repoURL: https://charts.bitnami.com/bitnami
      targetRevision: 15.4.0
      helm:
        releaseName: nginx-web  # Set on the Helm source
        valueFiles:
          - $values/nginx/production-values.yaml
    - repoURL: https://github.com/myorg/helm-values.git
      targetRevision: main
      ref: values
  destination:
    server: https://kubernetes.default.svc
    namespace: web
```

## Summary

The Helm release name in ArgoCD defaults to the Application name but can be customized with the `releaseName` field. The release name affects resource naming, Helm history, and template rendering via `.Release.Name`. Keep release names short (under 53 characters), use consistent naming patterns across environments, and avoid changing release names on existing applications as it creates orphaned resources. For dynamically managing release names across environments, use ApplicationSets with templated release names.
