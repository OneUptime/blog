# How to Set Up Helm Charts for Your Kubernetes Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Helm, DevOps, CI/CD, Package Management

Description: A comprehensive guide to creating, managing, and deploying Helm charts, from basic templating to advanced patterns like library charts, hooks, and chart repositories.

---

Helm is the package manager for Kubernetes. It lets you template manifests, manage releases, and share applications. If you're copy-pasting YAML between environments, Helm is the answer.

## Installing Helm

Install the Helm CLI on your local machine. Helm 3 is the current major version and does not require Tiller, making it simpler and more secure than Helm 2.

```bash
# macOS - using Homebrew package manager
brew install helm

# Linux - using the official installation script
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify installation - should show version 3.x
helm version
```

## Helm Basics

### Finding Charts

Helm repositories contain packaged charts. Adding common repositories gives you access to thousands of pre-built applications that you can deploy with a single command.

```bash
# Add commonly used Helm repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update                   # Refresh repo index

# Search for charts in added repos
helm search repo nginx
helm search hub postgresql         # Search Artifact Hub (all public charts)
```

### Installing a Chart

These commands demonstrate different ways to install Helm charts. You can override default values using files or command-line flags to customize the deployment for your environment.

```bash
# Basic install - uses default values
helm install my-nginx ingress-nginx/ingress-nginx

# With namespace - creates namespace if it doesn't exist
helm install my-nginx ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace

# With custom values file - overrides defaults from values.yaml
helm install my-nginx ingress-nginx/ingress-nginx -f values.yaml

# Override specific values inline - useful for quick changes
helm install my-nginx ingress-nginx/ingress-nginx --set controller.replicaCount=3
```

### Managing Releases

After installation, Helm tracks releases and their history. These commands help you manage the lifecycle of your deployed applications including upgrades, rollbacks, and removal.

```bash
# List all releases across namespaces
helm list -A

# Check detailed status of a release
helm status my-nginx -n ingress-nginx

# Upgrade release with new values - preserves release history
helm upgrade my-nginx ingress-nginx/ingress-nginx -f values.yaml

# Rollback to previous revision (revision 1)
helm rollback my-nginx 1

# Uninstall release - removes all resources
helm uninstall my-nginx -n ingress-nginx
```

## Creating Your First Chart

### Generate Chart Scaffold

The helm create command generates a complete chart structure with best-practice templates. This gives you a working starting point that you can customize for your application.

```bash
# Create new chart scaffold
helm create myapp

# Structure:
# myapp/
# ├── Chart.yaml          # Chart metadata
# ├── values.yaml         # Default values
# ├── templates/          # Template files
# │   ├── deployment.yaml
# │   ├── service.yaml
# │   ├── hpa.yaml
# │   ├── ingress.yaml
# │   ├── serviceaccount.yaml
# │   ├── _helpers.tpl    # Template helpers
# │   └── NOTES.txt       # Post-install notes
# └── charts/             # Dependencies
```

### Chart.yaml

The Chart.yaml file contains metadata about your chart. The version field tracks chart changes, while appVersion tracks the version of the application being deployed.

```yaml
apiVersion: v2                     # Helm 3 chart API version
name: myapp
description: A Helm chart for MyApp
type: application                  # application or library
version: 0.1.0                     # Chart version (SemVer)
appVersion: "1.0.0"                # Application version being deployed
maintainers:
  - name: Your Name
    email: you@example.com
dependencies:                      # Sub-charts to include
  - name: postgresql
    version: "12.x.x"              # SemVer constraint
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled  # Only include if enabled
```

### values.yaml

The values.yaml file defines all configurable parameters for your chart. Users can override these values at install time. Use descriptive names and sensible defaults.

```yaml
# Default values for myapp

# Number of pod replicas
replicaCount: 2

# Container image configuration
image:
  repository: myorg/myapp
  pullPolicy: IfNotPresent
  tag: ""                          # Defaults to appVersion if empty

imagePullSecrets: []               # Secrets for private registries
nameOverride: ""                   # Override chart name
fullnameOverride: ""               # Override full release name

# Service account configuration
serviceAccount:
  create: true                     # Create a service account
  annotations: {}                  # Add annotations (e.g., for IAM roles)
  name: ""                         # Override service account name

podAnnotations: {}                 # Annotations for pods
podSecurityContext:
  fsGroup: 1000                    # Group ID for mounted volumes

# Container security settings (principle of least privilege)
securityContext:
  runAsNonRoot: true               # Don't run as root
  runAsUser: 1000                  # Run as specific user
  allowPrivilegeEscalation: false  # Prevent privilege escalation
  capabilities:
    drop:
      - ALL                        # Drop all Linux capabilities

# Service configuration
service:
  type: ClusterIP                  # ClusterIP, NodePort, or LoadBalancer
  port: 80

# Ingress configuration
ingress:
  enabled: false                   # Disabled by default
  className: nginx
  annotations: {}
  hosts:
    - host: myapp.local
      paths:
        - path: /
          pathType: Prefix
  tls: []

# Resource requests and limits
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 256Mi

# Autoscaling configuration
autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80

nodeSelector: {}                   # Node selection constraints
tolerations: []                    # Tolerate node taints
affinity: {}                       # Affinity rules

# Application-specific config
config:
  logLevel: info
  database:
    host: localhost
    port: 5432
    name: myapp

# PostgreSQL subchart configuration
postgresql:
  enabled: true                    # Enable PostgreSQL dependency
  auth:
    database: myapp
    username: myapp
```

## Template Syntax

### Basic Templating

This deployment template demonstrates core Helm templating features including value references, conditionals, includes, and YAML formatting functions. The checksum annotation triggers pod restarts when config changes.

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  # Use helper template for consistent naming
  name: {{ include "myapp.fullname" . }}
  labels:
    # Include standard labels from helper template
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  # Only set replicas if autoscaling is disabled
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      annotations:
        # Trigger pod restart when configmap changes
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
      # Include imagePullSecrets if defined
      {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      serviceAccountName: {{ include "myapp.serviceAccountName" . }}
      securityContext:
        {{- toYaml .Values.podSecurityContext | nindent 8 }}
      containers:
        - name: {{ .Chart.Name }}
          securityContext:
            {{- toYaml .Values.securityContext | nindent 12 }}
          # Use tag from values, falling back to appVersion
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: 8080
              protocol: TCP
          env:
            # Reference values with quote function for safety
            - name: LOG_LEVEL
              value: {{ .Values.config.logLevel | quote }}
            - name: DB_HOST
              value: {{ .Values.config.database.host | quote }}
          envFrom:
            # Load secrets from generated secret
            - secretRef:
                name: {{ include "myapp.fullname" . }}-secrets
          livenessProbe:
            httpGet:
              path: /healthz
              port: http
          readinessProbe:
            httpGet:
              path: /ready
              port: http
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
      # Include nodeSelector if defined
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
```

### Helper Templates

Helper templates in _helpers.tpl provide reusable template definitions. These ensure consistent naming and labeling across all resources in your chart.

```yaml
# templates/_helpers.tpl

{{/*
Expand the name of the chart.
Truncates to 63 chars (Kubernetes name limit) and removes trailing hyphens.
*/}}
{{- define "myapp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
Uses release name and chart name, handling various override scenarios.
*/}}
{{- define "myapp.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Common labels applied to all resources.
Following Kubernetes recommended labels for app identification.
*/}}
{{- define "myapp.labels" -}}
helm.sh/chart: {{ include "myapp.chart" . }}
{{ include "myapp.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels used for pod selection.
These must match between Deployment selector and Pod labels.
*/}}
{{- define "myapp.selectorLabels" -}}
app.kubernetes.io/name: {{ include "myapp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use.
Returns created account name or default if not creating.
*/}}
{{- define "myapp.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "myapp.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
```

### Conditional Resources

The Ingress template shows how to conditionally include entire resources and handle complex nested structures like TLS configuration and path routing.

```yaml
# templates/ingress.yaml
# Only create Ingress if enabled in values
{{- if .Values.ingress.enabled -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
  # Include annotations if any are defined
  {{- with .Values.ingress.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  # Include ingressClassName if specified
  {{- if .Values.ingress.className }}
  ingressClassName: {{ .Values.ingress.className }}
  {{- end }}
  # TLS configuration - iterate over tls entries
  {{- if .Values.ingress.tls }}
  tls:
    {{- range .Values.ingress.tls }}
    - hosts:
        {{- range .hosts }}
        - {{ . | quote }}
        {{- end }}
      secretName: {{ .secretName }}
    {{- end }}
  {{- end }}
  # Routing rules - iterate over hosts and paths
  rules:
    {{- range .Values.ingress.hosts }}
    - host: {{ .host | quote }}
      http:
        paths:
          {{- range .paths }}
          - path: {{ .path }}
            pathType: {{ .pathType }}
            backend:
              service:
                # Use $ to access root context within range
                name: {{ include "myapp.fullname" $ }}
                port:
                  number: {{ $.Values.service.port }}
          {{- end }}
    {{- end }}
{{- end }}
```

## Chart Hooks

### Pre-Install Database Migration

Hooks run at specific points in the release lifecycle. This pre-install/pre-upgrade hook runs database migrations before the main application deploys, ensuring the database schema is ready.

```yaml
# templates/migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "myapp.fullname" . }}-migrate
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
  annotations:
    # Run before install and upgrade
    "helm.sh/hook": pre-install,pre-upgrade
    # Run before other hooks (lower weight = earlier)
    "helm.sh/hook-weight": "-5"
    # Delete previous job, keep on success
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          # Use same image as main app
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          command: ["./migrate.sh"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: {{ include "myapp.fullname" . }}-secrets
                  key: database-url
  backoffLimit: 3                  # Retry up to 3 times on failure
```

### Post-Install Notification

This post-install hook sends a notification after successful deployment. It's useful for alerting teams or triggering downstream processes.

```yaml
# templates/post-install-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "myapp.fullname" . }}-notify
  annotations:
    # Run after all resources are installed
    "helm.sh/hook": post-install
    # Clean up after success
    "helm.sh/hook-delete-policy": hook-succeeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: notify
          image: curlimages/curl
          command:
            - curl
            - -X
            - POST
            - -d
            # Include release info in notification
            - '{"text":"{{ .Release.Name }} deployed to {{ .Release.Namespace }}"}'
            - {{ .Values.slack.webhookUrl }}
```

## Testing Charts

### Lint

The lint command checks your chart for issues including syntax errors, best practice violations, and template problems. Always lint before packaging or deploying.

```bash
# Check chart for errors and best practices
helm lint myapp/
```

### Template Rendering

Render templates locally without installing to verify the generated YAML is correct. This is invaluable for debugging template issues before deployment.

```bash
# Render templates locally - outputs generated YAML
helm template myapp myapp/

# With specific values file
helm template myapp myapp/ -f production-values.yaml

# Debug mode - shows more details and template info
helm template myapp myapp/ --debug
```

### Dry Run Install

Dry run sends manifests to the Kubernetes API server for validation without actually creating resources. This catches issues that template rendering alone might miss.

```bash
# Validate against cluster without installing
helm install myapp myapp/ --dry-run --debug
```

### Chart Testing

Test resources are pods that run after installation to verify the release is working correctly. They're triggered by helm test and report success or failure.

```yaml
# templates/tests/test-connection.yaml
apiVersion: v1
kind: Pod
metadata:
  name: "{{ include "myapp.fullname" . }}-test-connection"
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
  annotations:
    # Mark as test resource
    "helm.sh/hook": test
spec:
  containers:
    - name: wget
      image: busybox
      command: ['wget']
      # Test that service is accessible
      args: ['{{ include "myapp.fullname" . }}:{{ .Values.service.port }}']
  restartPolicy: Never
```

Run tests:

```bash
# Run all test pods for a release
helm test myapp
```

## Managing Dependencies

### Add Dependencies

Dependencies are other charts that your chart requires. Define them in Chart.yaml with version constraints and optional conditions to control when they're included.

```yaml
# Chart.yaml
dependencies:
  # PostgreSQL database
  - name: postgresql
    version: "12.x.x"              # Accept any 12.x version
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled  # Include only if enabled
  # Redis cache
  - name: redis
    version: "17.x.x"
    repository: "https://charts.bitnami.com/bitnami"
    condition: redis.enabled
```

### Update Dependencies

These commands download and package dependencies into the charts/ directory. Run them after modifying dependencies in Chart.yaml.

```bash
# Download dependencies to charts/ directory
helm dependency update myapp/
# Rebuild dependency lock file
helm dependency build myapp/
```

### Override Dependency Values

Override subchart values by nesting them under the dependency name. This allows customizing dependencies without modifying their charts.

```yaml
# values.yaml
postgresql:
  enabled: true                    # Enable PostgreSQL dependency
  auth:
    database: myapp                # Database name
    username: myapp                # Database user
  primary:
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
```

## Environment-Specific Values

### values-production.yaml

Create separate values files for each environment. These override the base values.yaml with environment-specific configuration like replica counts, resources, and ingress settings.

```yaml
# Production overrides for higher availability and resources
replicaCount: 5                    # More replicas for production

resources:
  requests:
    cpu: 500m                      # Higher resource allocation
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 2Gi

autoscaling:
  enabled: true                    # Enable autoscaling in production
  minReplicas: 5
  maxReplicas: 20

ingress:
  enabled: true                    # Expose via Ingress
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod  # Auto TLS
  hosts:
    - host: myapp.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: myapp-tls
      hosts:
        - myapp.example.com

config:
  logLevel: warn                   # Less verbose logging in production
```

### Install with Environment Values

Layer values files to build up configuration. Files specified later override earlier ones, allowing base values to be customized per environment.

```bash
# Install with base values plus production overrides
helm install myapp myapp/ \
  -f values.yaml \                 # Base values
  -f values-production.yaml \      # Production overrides
  -n production
```

## Publishing Charts

### Package Chart

Packaging creates a versioned, compressed archive of your chart. This is the distributable format for sharing charts with others or storing in repositories.

```bash
# Package chart into tarball
helm package myapp/
# Creates myapp-0.1.0.tgz
```

### Create Chart Repository

Chart repositories are HTTP servers hosting packaged charts and an index file. You can use any static file hosting like S3, GCS, or a web server.

```bash
# Generate index.yaml from packaged charts
helm repo index . --url https://charts.example.com

# Push to static file hosting (e.g., S3)
aws s3 sync . s3://my-helm-charts/
```

### Use OCI Registry

OCI (Open Container Initiative) registries like ghcr.io, Docker Hub, or ECR can host Helm charts alongside container images, simplifying artifact management.

```bash
# Login to OCI registry
helm registry login ghcr.io

# Push packaged chart to OCI registry
helm push myapp-0.1.0.tgz oci://ghcr.io/myorg/charts

# Install directly from OCI registry
helm install myapp oci://ghcr.io/myorg/charts/myapp --version 0.1.0
```

## Best Practices

### 1. Use Semantic Versioning

Semantic versioning communicates the nature of changes. Bump major version for breaking changes, minor for new features, and patch for bug fixes.

```yaml
# Chart.yaml
version: 1.2.3                     # Bump for chart changes
appVersion: "2.0.0"                # Track application version
```

### 2. Document Values

Helm-docs style comments generate documentation automatically. The -- prefix marks a value as documented, and the text becomes the description.

```yaml
# values.yaml

# -- Number of replicas for the deployment
replicaCount: 2

# -- Image configuration
image:
  # -- Image repository
  repository: myorg/myapp
  # -- Image pull policy
  pullPolicy: IfNotPresent
  # -- Image tag (defaults to appVersion)
  tag: ""
```

Generate docs with helm-docs:

```bash
# Generate README.md from values.yaml comments
helm-docs myapp/
```

### 3. Validate Input

Add validation in templates to catch configuration errors early. The fail function stops rendering with a descriptive error message.

```yaml
# templates/deployment.yaml
# Validate that replicaCount is at least 1
{{- if lt (int .Values.replicaCount) 1 }}
{{- fail "replicaCount must be at least 1" }}
{{- end }}
```

### 4. Use NOTES.txt

NOTES.txt is displayed after installation to provide helpful information to users. Include access instructions and next steps for the operator.

```
# templates/NOTES.txt
Thank you for installing {{ .Chart.Name }}.

Your release is named {{ .Release.Name }}.

To access the application:
{{- if .Values.ingress.enabled }}
  Visit https://{{ (index .Values.ingress.hosts 0).host }}
{{- else }}
  kubectl port-forward svc/{{ include "myapp.fullname" . }} 8080:{{ .Values.service.port }}
  Then visit http://localhost:8080
{{- end }}
```

---

Helm transforms raw Kubernetes manifests into reusable, configurable packages. Start with the generated scaffold, customize for your application, and iterate. Once you have a working chart, you'll never go back to copy-pasting YAML.
