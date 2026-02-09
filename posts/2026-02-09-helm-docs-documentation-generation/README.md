# How to Implement Helm Chart Documentation Generation with helm-docs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, Documentation

Description: Learn how to automate Helm chart documentation using helm-docs to generate comprehensive README files from your Chart.yaml and values.yaml with minimal effort and maximum consistency.

---

Documentation is essential for Helm charts, but keeping it synchronized with your actual chart configuration is challenging. The helm-docs tool solves this problem by automatically generating documentation from your chart metadata, values file, and template comments. This approach ensures your documentation stays accurate and reduces the manual effort required to maintain it.

## Installing helm-docs

Install helm-docs using your preferred method:

```bash
# Using Homebrew on macOS
brew install norwoodj/tap/helm-docs

# Using Go
go install github.com/norwoodj/helm-docs/cmd/helm-docs@latest

# Using Docker
docker pull jnorwood/helm-docs:latest

# Download binary directly
curl -LSs https://github.com/norwoodj/helm-docs/releases/download/v1.11.0/helm-docs_1.11.0_Linux_x86_64.tar.gz | tar xz
sudo mv helm-docs /usr/local/bin/
```

Verify the installation:

```bash
helm-docs --version
```

## Basic Documentation Generation

Navigate to your chart directory and run helm-docs:

```bash
cd mychart
helm-docs
```

This generates a README.md file based on your chart's metadata and values. The tool looks for Chart.yaml, values.yaml, and any existing README template files.

## Documenting Values with Comments

Add documentation comments above each value in your values.yaml:

```yaml
# values.yaml

# -- Number of replicas for the deployment
replicaCount: 1

image:
  # -- Container image repository
  repository: nginx
  # -- Image pull policy
  pullPolicy: IfNotPresent
  # -- Container image tag (defaults to chart appVersion)
  tag: ""

# -- Image pull secrets for private registries
imagePullSecrets: []

# -- Override the chart name
nameOverride: ""

# -- Override the full resource name
fullnameOverride: ""

serviceAccount:
  # -- Enable service account creation
  create: true
  # -- Annotations for the service account
  annotations: {}
  # -- Name of the service account (generated if not set)
  name: ""

# -- Pod annotations
podAnnotations: {}

# -- Pod security context
# @default -- See values.yaml
podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000

# -- Container security context
# @default -- See values.yaml
securityContext:
  allowPrivilegeEscalation: false
  capabilities:
    drop:
    - ALL
  readOnlyRootFilesystem: true

service:
  # -- Service type
  type: ClusterIP
  # -- Service port
  port: 80

ingress:
  # -- Enable ingress
  enabled: false
  # -- Ingress class name
  className: ""
  # -- Ingress annotations
  annotations: {}
    # kubernetes.io/ingress.class: nginx
    # cert-manager.io/cluster-issuer: letsencrypt-prod
  # -- Ingress hosts configuration
  hosts:
    - host: chart-example.local
      paths:
        - path: /
          pathType: ImplementationSpecific
  # -- Ingress TLS configuration
  tls: []

resources:
  # -- Resource limits
  # @default -- See values.yaml
  limits:
    cpu: 100m
    memory: 128Mi
  # -- Resource requests
  # @default -- See values.yaml
  requests:
    cpu: 100m
    memory: 128Mi

# -- Node selector for pod assignment
nodeSelector: {}

# -- Tolerations for pod assignment
tolerations: []

# -- Affinity rules for pod assignment
affinity: {}
```

The `--` comment syntax tells helm-docs to include that comment in the generated documentation. The `@default` annotation provides information about default values when they're complex.

## Creating a README Template

Customize the generated documentation by creating a README.md.gotmpl file:

```markdown
# {{ .Project.Name }}

{{ .Project.Description }}

{{ template "chart.versionBadge" . }}{{ template "chart.typeBadge" . }}{{ template "chart.appVersionBadge" . }}

## Overview

{{ .Project.Description }}

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+

## Installation

Add the Helm repository:

```bash
helm repo add myrepo https://charts.example.com
helm repo update
```

Install the chart:

```bash
helm install my-release myrepo/{{ .Project.Name }}
```

## Configuration

The following table lists the configurable parameters and their default values.

{{ template "chart.valuesTable" . }}

## Examples

### Basic Installation

```bash
helm install my-app myrepo/{{ .Project.Name }}
```

### Custom Configuration

```bash
helm install my-app myrepo/{{ .Project.Name }} \
  --set replicaCount=3 \
  --set image.tag=v1.2.3 \
  --set ingress.enabled=true
```

### Using a Values File

Create a custom values file:

```yaml
replicaCount: 3

image:
  repository: myapp/app
  tag: v1.2.3

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: myapp.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: myapp-tls
      hosts:
        - myapp.example.com
```

Install with custom values:

```bash
helm install my-app myrepo/{{ .Project.Name }} -f custom-values.yaml
```

## Upgrading

```bash
helm upgrade my-app myrepo/{{ .Project.Name }} --version {{ .Project.Version }}
```

## Uninstalling

```bash
helm uninstall my-app
```

{{ template "chart.maintainersSection" . }}

{{ template "chart.requirementsSection" . }}

{{ template "helm-docs.versionFooter" . }}
```

## Advanced Value Documentation

Use extended comment syntax for complex values:

```yaml
database:
  # -- Enable database deployment
  enabled: true
  # -- Database type (postgres, mysql, mongodb)
  type: postgres
  # -- Database connection configuration
  # @default -- See below
  connection:
    # -- Database hostname
    host: postgres.default.svc.cluster.local
    # -- Database port
    # @default -- 5432 for postgres, 3306 for mysql, 27017 for mongodb
    port: 5432
    # -- Database name
    database: myapp
    # -- Database username
    username: dbuser
    # -- Existing secret name for credentials
    # @ignored
    existingSecret: ""

# -- Additional environment variables
# @default -- See values.yaml for examples
extraEnv: []
  # - name: DEBUG
  #   value: "true"
  # - name: API_KEY
  #   valueFrom:
  #     secretKeyRef:
  #       name: api-secret
  #       key: key

# -- Additional volumes
# @ignored
extraVolumes: []

# -- Additional volume mounts
# @ignored
extraVolumeMounts: []
```

The `@ignored` annotation excludes sensitive or complex values from the generated table.

## Documenting Chart Dependencies

Update Chart.yaml with detailed dependency information:

```yaml
apiVersion: v2
name: myapp
description: A comprehensive application chart
type: application
version: 1.0.0
appVersion: "1.0.0"
keywords:
  - application
  - web
  - api
home: https://github.com/myorg/myapp
sources:
  - https://github.com/myorg/myapp
maintainers:
  - name: DevOps Team
    email: devops@example.com
    url: https://example.com

dependencies:
  - name: postgresql
    version: "12.1.0"
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled
    tags:
      - database
  - name: redis
    version: "17.0.0"
    repository: https://charts.bitnami.com/bitnami
    condition: redis.enabled
    tags:
      - cache
```

## Custom Documentation Sections

Add custom sections to your README template:

```markdown
## Architecture

{{ .Project.Name }} consists of the following components:

- **API Server**: Handles HTTP requests
- **Worker**: Processes background jobs
- **Database**: PostgreSQL for persistent storage
- **Cache**: Redis for session storage

## Security Considerations

This chart implements several security best practices:

- Non-root user execution
- Read-only root filesystem
- Dropped capabilities
- Network policies for pod communication

## Monitoring

The chart exposes Prometheus metrics on port 9090:

```yaml
metrics:
  enabled: true
  port: 9090
  path: /metrics
```

## Troubleshooting

### Pod Fails to Start

Check pod events:

```bash
kubectl describe pod -l app.kubernetes.io/name={{ .Project.Name }}
```

View logs:

```bash
kubectl logs -l app.kubernetes.io/name={{ .Project.Name }}
```

### Database Connection Issues

Verify database credentials:

```bash
kubectl get secret {{ .Project.Name }}-db-secret -o yaml
```
```

## Automating Documentation in CI/CD

Add helm-docs to your GitHub Actions workflow:

```yaml
# .github/workflows/docs.yaml
name: Generate Documentation

on:
  push:
    branches:
      - main
    paths:
      - 'charts/**/Chart.yaml'
      - 'charts/**/values.yaml'
      - 'charts/**/README.md.gotmpl'

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout
      uses: actions/checkout@v3

    - name: Install helm-docs
      run: |
        curl -LSs https://github.com/norwoodj/helm-docs/releases/download/v1.11.0/helm-docs_1.11.0_Linux_x86_64.tar.gz | tar xz
        sudo mv helm-docs /usr/local/bin/

    - name: Generate documentation
      run: |
        for chart in charts/*/; do
          helm-docs "$chart"
        done

    - name: Check for changes
      id: verify
      run: |
        if git diff --quiet; then
          echo "changed=false" >> $GITHUB_OUTPUT
        else
          echo "changed=true" >> $GITHUB_OUTPUT
        fi

    - name: Commit changes
      if: steps.verify.outputs.changed == 'true'
      run: |
        git config user.name "GitHub Actions"
        git config user.email "actions@github.com"
        git add charts/*/README.md
        git commit -m "docs: update chart documentation [skip ci]"
        git push
```

## Pre-commit Hook for Documentation

Ensure documentation stays updated with a pre-commit hook:

```bash
# .git/hooks/pre-commit
#!/bin/bash

# Generate documentation for all charts
for chart in charts/*/; do
    if [ -f "$chart/Chart.yaml" ]; then
        echo "Generating docs for $chart"
        helm-docs "$chart" --dry-run > /dev/null
        if [ $? -ne 0 ]; then
            echo "Error generating docs for $chart"
            exit 1
        fi
        helm-docs "$chart"
        git add "$chart/README.md"
    fi
done
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

## Configuration Options

Customize helm-docs behavior with a configuration file:

```yaml
# .helm-docs.yaml
badge-style: flat-square
chart-search-root: charts
ignore-file: .helmdocsignore
output-file: README.md
sort-values-order: file
template-files:
  - README.md.gotmpl
  - _templates.gotmpl
```

Create an ignore file:

```
# .helmdocsignore
charts/deprecated/*
charts/experimental/*
```

## Validating Generated Documentation

Check that documentation is up to date:

```bash
# Generate docs and check for differences
helm-docs --dry-run

# Or use in CI
helm-docs
if ! git diff --quiet; then
    echo "Documentation is out of date"
    exit 1
fi
```

helm-docs transforms chart documentation from a manual chore into an automated process. By embedding documentation in your values file and using templates, you ensure that your README stays synchronized with your actual chart configuration, saving time and reducing errors.
