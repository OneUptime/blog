# How to Implement Helm Subcharts Dependencies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Helm, Kubernetes, Charts, Dependencies

Description: Manage Helm chart dependencies with subcharts for modular application deployments, version constraints, and conditional inclusion.

---

## Introduction

Helm subcharts allow you to break down complex Kubernetes deployments into reusable, modular components. Instead of maintaining one massive chart with hundreds of templates, you can compose your application from smaller, focused charts that handle specific concerns like databases, caching layers, or monitoring stacks.

This guide walks through implementing Helm subchart dependencies from scratch. You will learn how to declare dependencies, configure repositories, pass values between charts, and conditionally include or exclude components based on your deployment needs.

## Prerequisites

Before starting, ensure you have:

- Helm 3.x installed
- kubectl configured with cluster access
- Basic familiarity with Helm chart structure

Verify your Helm installation:

```bash
helm version
# version.BuildInfo{Version:"v3.14.0", GitCommit:"...", GitTreeState:"clean", GoVersion:"go1.21.6"}
```

## Understanding Chart Dependencies

Helm dependencies work through the `Chart.yaml` file. When you declare a dependency, Helm downloads that chart and packages it into your chart's `charts/` directory during the build process.

### The Dependency Lifecycle

Here is how Helm processes dependencies:

1. You declare dependencies in `Chart.yaml`
2. Running `helm dependency update` downloads charts to `charts/`
3. A `Chart.lock` file records exact versions
4. During install/upgrade, Helm renders all charts together
5. Values flow from parent to child charts through scoped configuration

## Project Structure

A typical parent chart with subcharts follows this structure:

```
my-application/
├── Chart.yaml           # Declares dependencies here
├── Chart.lock           # Auto-generated lock file
├── values.yaml          # Configuration for parent and subcharts
├── templates/           # Parent chart templates
│   ├── deployment.yaml
│   ├── service.yaml
│   └── _helpers.tpl
└── charts/              # Downloaded subcharts live here
    ├── postgresql-12.5.8.tgz
    └── redis-17.11.3.tgz
```

## Declaring Dependencies in Chart.yaml

The `dependencies` section in `Chart.yaml` defines which subcharts your application needs.

### Basic Dependency Declaration

This example shows a web application that requires PostgreSQL and Redis:

```yaml
# Chart.yaml
apiVersion: v2
name: my-web-app
description: A web application with database and cache dependencies
type: application
version: 1.0.0
appVersion: "2.0.0"

dependencies:
  - name: postgresql
    version: "12.5.8"
    repository: "https://charts.bitnami.com/bitnami"
  - name: redis
    version: "17.11.3"
    repository: "https://charts.bitnami.com/bitnami"
```

### Dependency Fields Reference

The following table describes all available fields for dependency entries:

| Field | Required | Description |
|-------|----------|-------------|
| name | Yes | Chart name as it appears in the repository |
| version | Yes | SemVer version constraint (exact or range) |
| repository | Yes | URL of the chart repository or alias |
| condition | No | YAML path that enables/disables the chart |
| tags | No | List of tags for bulk enable/disable |
| alias | No | Alternative name for the chart |
| import-values | No | Import values from child to parent |

## Repository Configuration

Before downloading dependencies, Helm needs to know where to find them. You have several options for specifying repositories.

### Adding Repositories Manually

Add repositories to your local Helm configuration:

```bash
# Add the Bitnami repository
helm repo add bitnami https://charts.bitnami.com/bitnami

# Add other common repositories
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add jetstack https://charts.jetstack.io
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

# Update repository cache
helm repo update
```

### Using Repository Aliases

Once added, reference repositories by their alias using the `@` prefix:

```yaml
# Chart.yaml with repository aliases
dependencies:
  - name: postgresql
    version: "12.5.8"
    repository: "@bitnami"
  - name: ingress-nginx
    version: "4.7.1"
    repository: "@ingress-nginx"
```

### Using Local Charts

For charts stored in your filesystem, use the `file://` protocol:

```yaml
# Chart.yaml with local dependency
dependencies:
  - name: common-lib
    version: "1.0.0"
    repository: "file://../common-lib"
  - name: internal-service
    version: "2.3.0"
    repository: "file://./charts/internal-service"
```

This approach works well for:

- Shared library charts within a monorepo
- Charts under active development
- Internal charts not published to a repository

### OCI Registry Support

Helm 3.8+ supports OCI registries for chart storage:

```yaml
# Chart.yaml with OCI dependency
dependencies:
  - name: my-chart
    version: "1.0.0"
    repository: "oci://ghcr.io/my-org/charts"
```

## Version Constraints

Helm uses SemVer for version constraints, giving you flexibility in how you pin dependency versions.

### Version Constraint Patterns

| Pattern | Example | Matches |
|---------|---------|---------|
| Exact | `1.2.3` | Only 1.2.3 |
| Range | `>=1.2.0` | 1.2.0 and higher |
| Caret | `^1.2.0` | >=1.2.0, <2.0.0 |
| Tilde | `~1.2.0` | >=1.2.0, <1.3.0 |
| Wildcard | `1.2.x` | >=1.2.0, <1.3.0 |
| Combined | `>=1.2.0 <1.5.0` | 1.2.0 to 1.4.x |

### Practical Version Examples

```yaml
# Chart.yaml with various version constraints
dependencies:
  # Pin to exact version for production stability
  - name: postgresql
    version: "12.5.8"
    repository: "@bitnami"

  # Allow patch updates for security fixes
  - name: redis
    version: "~17.11.0"
    repository: "@bitnami"

  # Allow minor updates, lock major version
  - name: prometheus
    version: "^22.0.0"
    repository: "@prometheus-community"

  # Flexible range for development
  - name: grafana
    version: ">=6.50.0 <7.0.0"
    repository: "@grafana"
```

## Building and Updating Dependencies

### Initial Dependency Download

After declaring dependencies, download them with:

```bash
# Navigate to your chart directory
cd my-web-app

# Download all dependencies
helm dependency update

# Output:
# Hang tight while we grab the latest from your chart repositories...
# ...Successfully got an update from the "bitnami" chart repository
# Update Complete. Happy Helming!
# Saving 2 charts
# Downloading postgresql from repo https://charts.bitnami.com/bitnami
# Downloading redis from repo https://charts.bitnami.com/bitnami
# Deleting outdated charts
```

This command creates:

- `charts/postgresql-12.5.8.tgz` - Compressed subchart
- `charts/redis-17.11.3.tgz` - Compressed subchart
- `Chart.lock` - Records resolved versions

### The Chart.lock File

Helm generates `Chart.lock` to record exactly which versions were resolved:

```yaml
# Chart.lock (auto-generated)
dependencies:
- name: postgresql
  repository: https://charts.bitnami.com/bitnami
  version: 12.5.8
- name: redis
  repository: https://charts.bitnami.com/bitnami
  version: 17.11.3
digest: sha256:abc123...
generated: "2026-01-30T10:15:30.123456789Z"
```

### Dependency Build vs Update

Two commands handle dependencies, but they behave differently:

```bash
# helm dependency update
# - Resolves versions from Chart.yaml constraints
# - Downloads fresh charts from repositories
# - Regenerates Chart.lock
helm dependency update

# helm dependency build
# - Uses exact versions from Chart.lock
# - Faster, does not contact repositories unless needed
# - Fails if Chart.lock is missing or outdated
helm dependency build
```

Use `dependency update` when:
- Adding new dependencies
- Changing version constraints
- Wanting to pull newer versions

Use `dependency build` when:
- Running in CI/CD pipelines
- Ensuring reproducible builds
- Working offline with cached charts

### Listing Dependencies

Check the status of your dependencies:

```bash
helm dependency list

# NAME         VERSION   REPOSITORY                               STATUS
# postgresql   12.5.8    https://charts.bitnami.com/bitnami      ok
# redis        17.11.3   https://charts.bitnami.com/bitnami      ok
```

Status values:
- `ok` - Chart is downloaded and version matches
- `missing` - Chart not found in charts/ directory
- `unpacked` - Chart exists as directory, not archive
- `wrong version` - Downloaded version does not match constraint

## Configuring Subchart Values

Values flow from the parent chart to subcharts through scoped sections in `values.yaml`.

### Basic Value Configuration

Configure subcharts by creating sections that match the chart name:

```yaml
# values.yaml

# Parent chart values
replicaCount: 3
image:
  repository: my-app
  tag: "2.0.0"

# PostgreSQL subchart values (matches dependency name)
postgresql:
  auth:
    username: myapp
    password: secretpassword
    database: myapp_production
  primary:
    persistence:
      enabled: true
      size: 20Gi
    resources:
      requests:
        memory: 256Mi
        cpu: 250m
      limits:
        memory: 512Mi
        cpu: 500m

# Redis subchart values
redis:
  architecture: standalone
  auth:
    enabled: true
    password: redis-secret
  master:
    persistence:
      enabled: true
      size: 8Gi
```

### Using Aliases for Multiple Instances

Deploy multiple instances of the same subchart using aliases:

```yaml
# Chart.yaml
dependencies:
  - name: postgresql
    version: "12.5.8"
    repository: "@bitnami"
    alias: primary-db
  - name: postgresql
    version: "12.5.8"
    repository: "@bitnami"
    alias: analytics-db
```

Configure each instance separately in values:

```yaml
# values.yaml

# Primary database configuration
primary-db:
  auth:
    username: app_user
    database: production
  primary:
    persistence:
      size: 50Gi

# Analytics database configuration
analytics-db:
  auth:
    username: analytics_user
    database: analytics
  primary:
    persistence:
      size: 100Gi
    resources:
      requests:
        memory: 1Gi
```

### Global Values

Share values across all charts using the `global` section:

```yaml
# values.yaml
global:
  # Available to parent and ALL subcharts
  storageClass: "fast-ssd"
  imagePullSecrets:
    - name: registry-credentials
  environment: production

postgresql:
  # Can reference global.storageClass in templates
  primary:
    persistence:
      storageClass: ""  # Empty uses global default

redis:
  master:
    persistence:
      storageClass: ""  # Empty uses global default
```

In subchart templates, access global values:

```yaml
# Inside a subchart template
storageClassName: {{ .Values.global.storageClass }}
```

### Importing Values from Subcharts

Pull values from a child chart into the parent using `import-values`:

```yaml
# Chart.yaml
dependencies:
  - name: postgresql
    version: "12.5.8"
    repository: "@bitnami"
    import-values:
      - child: primary.service
        parent: database
```

This imports the child's `primary.service` values into the parent's `database` key, making them available in parent templates.

## Conditional Dependencies

Control whether subcharts are installed based on values. This lets you create flexible charts that adapt to different environments.

### Using Conditions

The `condition` field specifies a values path that enables or disables a subchart:

```yaml
# Chart.yaml
dependencies:
  - name: postgresql
    version: "12.5.8"
    repository: "@bitnami"
    condition: postgresql.enabled
  - name: redis
    version: "17.11.3"
    repository: "@bitnami"
    condition: redis.enabled
  - name: elasticsearch
    version: "19.10.0"
    repository: "@bitnami"
    condition: elasticsearch.enabled
```

```yaml
# values.yaml
postgresql:
  enabled: true
  auth:
    username: myapp

redis:
  enabled: true
  architecture: standalone

elasticsearch:
  enabled: false  # Not installed by default
```

### Environment-Specific Configurations

Create separate values files for each environment:

```yaml
# values-development.yaml
postgresql:
  enabled: true
  primary:
    persistence:
      enabled: false  # No persistence in dev

redis:
  enabled: false  # Skip redis in dev

elasticsearch:
  enabled: false
```

```yaml
# values-production.yaml
postgresql:
  enabled: true
  primary:
    persistence:
      enabled: true
      size: 100Gi

redis:
  enabled: true
  replica:
    replicaCount: 3

elasticsearch:
  enabled: true
  master:
    replicaCount: 3
```

Deploy with environment-specific values:

```bash
# Development
helm upgrade --install my-app ./my-web-app \
  -f values-development.yaml \
  --namespace dev

# Production
helm upgrade --install my-app ./my-web-app \
  -f values-production.yaml \
  --namespace production
```

### Using Tags for Bulk Control

Tags let you enable or disable groups of dependencies together:

```yaml
# Chart.yaml
dependencies:
  - name: postgresql
    version: "12.5.8"
    repository: "@bitnami"
    tags:
      - databases
      - backend
  - name: redis
    version: "17.11.3"
    repository: "@bitnami"
    tags:
      - databases
      - caching
  - name: prometheus
    version: "22.0.0"
    repository: "@prometheus-community"
    tags:
      - monitoring
  - name: grafana
    version: "6.57.0"
    repository: "@grafana"
    tags:
      - monitoring
```

```yaml
# values.yaml
tags:
  databases: true
  caching: true
  monitoring: false  # Disable all monitoring charts
```

### Combining Conditions and Tags

When both condition and tags are present, condition takes precedence:

```yaml
# Chart.yaml
dependencies:
  - name: redis
    version: "17.11.3"
    repository: "@bitnami"
    condition: redis.enabled
    tags:
      - caching
```

```yaml
# values.yaml
tags:
  caching: true

redis:
  enabled: false  # This wins - redis will NOT be installed
```

## Working with Library Charts

Library charts contain shared templates but produce no Kubernetes resources themselves.

### Creating a Library Chart

```yaml
# common-lib/Chart.yaml
apiVersion: v2
name: common-lib
description: Shared templates and helpers
type: library  # Key difference
version: 1.0.0
```

Library charts contain only `_helpers.tpl` or similar template files:

```yaml
# common-lib/templates/_labels.tpl
{{- define "common.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
environment: {{ .Values.global.environment | default "development" }}
{{- end -}}

{{- define "common.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
```

### Using Library Charts

Reference the library in your application chart:

```yaml
# my-app/Chart.yaml
apiVersion: v2
name: my-app
version: 1.0.0

dependencies:
  - name: common-lib
    version: "1.0.0"
    repository: "file://../common-lib"
```

Use library templates in your chart:

```yaml
# my-app/templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
  labels:
    {{- include "common.labels" . | nindent 4 }}
spec:
  selector:
    matchLabels:
      {{- include "common.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "common.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
```

## Complete Example: Multi-Tier Application

Here is a complete example of a production-ready chart with multiple dependencies.

### Chart.yaml

```yaml
# Chart.yaml
apiVersion: v2
name: ecommerce-platform
description: E-commerce platform with database, cache, search, and monitoring
type: application
version: 2.0.0
appVersion: "3.5.0"

dependencies:
  # Database layer
  - name: postgresql
    version: "12.5.8"
    repository: "@bitnami"
    condition: postgresql.enabled
    alias: primary-db

  - name: postgresql
    version: "12.5.8"
    repository: "@bitnami"
    condition: postgresql.readReplica.enabled
    alias: read-replica

  # Caching layer
  - name: redis
    version: "17.11.3"
    repository: "@bitnami"
    condition: redis.enabled
    tags:
      - caching

  # Search engine
  - name: elasticsearch
    version: "19.10.0"
    repository: "@bitnami"
    condition: elasticsearch.enabled
    tags:
      - search

  # Message queue
  - name: rabbitmq
    version: "12.0.0"
    repository: "@bitnami"
    condition: rabbitmq.enabled
    tags:
      - messaging

  # Monitoring stack
  - name: prometheus
    version: "^22.0.0"
    repository: "@prometheus-community"
    condition: monitoring.prometheus.enabled
    tags:
      - monitoring

  - name: grafana
    version: "~6.57.0"
    repository: "@grafana"
    condition: monitoring.grafana.enabled
    tags:
      - monitoring

  # Shared templates
  - name: common
    version: "1.0.0"
    repository: "file://../common"
```

### values.yaml

```yaml
# values.yaml

# Global configuration shared across all charts
global:
  storageClass: "standard"
  environment: "production"
  imagePullSecrets:
    - name: docker-registry

# Tag-based feature flags
tags:
  caching: true
  search: true
  messaging: true
  monitoring: true

# Application configuration
replicaCount: 3
image:
  repository: mycompany/ecommerce-api
  tag: "3.5.0"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 8080

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: api.example.com
      paths:
        - path: /
          pathType: Prefix

# Primary database
primary-db:
  enabled: true
  auth:
    username: ecommerce
    database: ecommerce_prod
    existingSecret: postgresql-credentials
  primary:
    persistence:
      enabled: true
      size: 100Gi
      storageClass: "fast-ssd"
    resources:
      requests:
        memory: 1Gi
        cpu: 500m
      limits:
        memory: 2Gi
        cpu: 1000m
  metrics:
    enabled: true

# Read replica for reporting queries
read-replica:
  enabled: true
  auth:
    username: ecommerce_readonly
    database: ecommerce_prod
    existingSecret: postgresql-readonly-credentials
  primary:
    persistence:
      enabled: true
      size: 100Gi
  readReplicas:
    replicaCount: 2

postgresql:
  enabled: true
  readReplica:
    enabled: true

# Redis cache
redis:
  enabled: true
  architecture: replication
  auth:
    enabled: true
    existingSecret: redis-credentials
  master:
    persistence:
      enabled: true
      size: 10Gi
  replica:
    replicaCount: 2
    persistence:
      enabled: true
      size: 10Gi

# Elasticsearch for product search
elasticsearch:
  enabled: true
  master:
    replicaCount: 3
    persistence:
      enabled: true
      size: 50Gi
  data:
    replicaCount: 2
    persistence:
      enabled: true
      size: 100Gi
  coordinating:
    replicaCount: 2

# RabbitMQ for async processing
rabbitmq:
  enabled: true
  auth:
    username: ecommerce
    existingPasswordSecret: rabbitmq-credentials
  replicaCount: 3
  persistence:
    enabled: true
    size: 20Gi

# Monitoring configuration
monitoring:
  prometheus:
    enabled: true
  grafana:
    enabled: true

prometheus:
  alertmanager:
    enabled: true
  server:
    persistence:
      enabled: true
      size: 50Gi

grafana:
  adminUser: admin
  adminPassword: ""
  persistence:
    enabled: true
    size: 10Gi
  datasources:
    datasources.yaml:
      apiVersion: 1
      datasources:
        - name: Prometheus
          type: prometheus
          url: http://{{ .Release.Name }}-prometheus-server
          isDefault: true
```

### Deployment Commands

```bash
# Add required repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Download dependencies
cd ecommerce-platform
helm dependency update

# Validate the chart
helm lint .

# Dry run to see generated manifests
helm template my-release . --debug > /tmp/manifests.yaml

# Install to staging
helm upgrade --install ecommerce-staging . \
  --namespace staging \
  --create-namespace \
  -f values.yaml \
  -f values-staging.yaml

# Install to production
helm upgrade --install ecommerce-prod . \
  --namespace production \
  --create-namespace \
  -f values.yaml \
  -f values-production.yaml \
  --wait \
  --timeout 10m
```

## Debugging Dependency Issues

### Common Problems and Solutions

**Problem: "repository not found"**

```bash
# Error: repository "bitnami" not found
# Solution: Add the repository
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

**Problem: "chart not found"**

```bash
# Error: chart "postgresql" version "99.0.0" not found
# Solution: Check available versions
helm search repo bitnami/postgresql --versions
```

**Problem: "dependency update fails"**

```bash
# Clear the charts directory and rebuild
rm -rf charts/
rm Chart.lock
helm dependency update
```

### Inspecting Subchart Values

See all configurable values for a subchart:

```bash
# View default values for a dependency
helm show values bitnami/postgresql

# Search for specific value
helm show values bitnami/postgresql | grep -A5 "persistence:"
```

### Template Debugging

Render templates locally to inspect output:

```bash
# Render all templates
helm template my-release . --debug

# Render specific subchart templates
helm template my-release . --debug | grep -A50 "# Source: my-app/charts/postgresql"

# Check computed values
helm get values my-release -n production
```

## Best Practices

### Version Pinning Strategy

| Environment | Strategy | Example |
|-------------|----------|---------|
| Development | Flexible ranges | `^12.0.0` |
| Staging | Minor pinning | `~12.5.0` |
| Production | Exact versions | `12.5.8` |

### Repository Management

1. Mirror public charts to internal registry for air-gapped environments
2. Use Chart.lock in version control for reproducible deployments
3. Run `helm dependency update` in CI, not manually
4. Document repository requirements in chart README

### Value Organization

```yaml
# values.yaml structure recommendation

# 1. Global values first
global:
  environment: production

# 2. Tags for feature flags
tags:
  monitoring: true

# 3. Parent chart values
replicaCount: 3
image:
  repository: myapp
  tag: latest

# 4. Subchart values (alphabetically)
elasticsearch:
  enabled: true

postgresql:
  enabled: true

redis:
  enabled: true
```

### Security Considerations

- Never commit secrets in values files
- Use `existingSecret` references for credentials
- Scan dependencies for vulnerabilities with `helm audit`
- Review subchart RBAC requirements before deployment

## Summary

Helm subchart dependencies provide a powerful mechanism for building modular, maintainable Kubernetes deployments. Key takeaways:

1. Declare dependencies in `Chart.yaml` with version constraints
2. Use `helm dependency update` to download charts
3. Configure subcharts through scoped values sections
4. Enable conditional installation with `condition` and `tags`
5. Use aliases to deploy multiple instances of the same chart
6. Share configuration across charts with global values
7. Leverage library charts for common templates

Start with simple dependencies and gradually add complexity as your deployment requirements grow. The modular approach pays dividends as your application scales and team members can work on individual components independently.

## Additional Resources

- Helm Documentation: https://helm.sh/docs/
- Chart Repository: https://artifacthub.io/
- Helm Best Practices: https://helm.sh/docs/chart_best_practices/
- SemVer Specification: https://semver.org/
