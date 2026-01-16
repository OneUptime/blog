# How to Use Helm for Kubernetes on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, Ubuntu, Package Manager, DevOps, Container Orchestration, Charts, Cloud Native

Description: A comprehensive guide to installing, configuring, and using Helm package manager for Kubernetes on Ubuntu to simplify application deployment and management.

---

## Introduction

Managing applications on Kubernetes can become complex as your deployments grow. Installing, upgrading, and managing the lifecycle of Kubernetes applications involves dealing with numerous YAML manifests, configurations, and dependencies. This is where Helm comes in as a powerful package manager that simplifies these tasks significantly.

Helm is often referred to as the "package manager for Kubernetes," similar to how apt works for Ubuntu or npm for Node.js. It allows you to define, install, and upgrade even the most complex Kubernetes applications with ease.

## What is Helm and Why Use It?

Helm is an open-source project originally created by Deis (now part of Microsoft) and is now maintained by the Cloud Native Computing Foundation (CNCF). It provides several key benefits:

### Benefits of Using Helm

1. **Simplified Deployment**: Package multiple Kubernetes resources into a single unit called a "chart"
2. **Version Control**: Track and manage different versions of your deployments
3. **Reproducibility**: Deploy the same application consistently across different environments
4. **Rollback Capabilities**: Easily revert to previous versions if something goes wrong
5. **Dependency Management**: Handle application dependencies automatically
6. **Templating**: Use Go templates to create dynamic, reusable configurations
7. **Community Charts**: Access thousands of pre-built charts for popular applications
8. **Configuration Management**: Separate configuration from application logic

## Prerequisites

Before installing Helm on Ubuntu, ensure you have the following prerequisites in place.

You need a running Kubernetes cluster that you can connect to. This can be a local cluster like Minikube, kind, or a managed cluster like EKS, GKE, or AKS.

```bash
# Verify kubectl is installed and configured
kubectl version --client

# Check cluster connectivity
kubectl cluster-info

# Verify you have proper permissions
kubectl auth can-i create deployments --namespace default
```

Make sure your Ubuntu system is up to date before proceeding with the installation.

```bash
# Update package lists
sudo apt update

# Upgrade existing packages
sudo apt upgrade -y
```

## Installing Helm on Ubuntu

There are several methods to install Helm on Ubuntu. We will cover the most common approaches.

### Method 1: Using the Official Installation Script

The easiest way to install Helm is using the official installation script provided by the Helm team.

```bash
# Download and run the official Helm installation script
# This script automatically detects your OS and installs the appropriate binary
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### Method 2: Using Snap Package Manager

Ubuntu's Snap package manager provides an easy installation method with automatic updates.

```bash
# Install Helm using Snap
# The --classic flag allows Helm to access system resources
sudo snap install helm --classic
```

### Method 3: Using APT Repository

For more control over updates, you can add the official Helm repository to APT.

```bash
# Install required dependencies for adding repositories
sudo apt install -y apt-transport-https gnupg

# Add the Helm GPG key for package verification
curl https://baltocdn.com/helm/signing.asc | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null

# Add the Helm stable repository to APT sources
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] https://baltocdn.com/helm/stable/debian/ all main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list

# Update package lists and install Helm
sudo apt update
sudo apt install helm
```

### Method 4: Manual Binary Installation

For environments with restricted internet access or specific version requirements.

```bash
# Download Helm binary (replace VERSION with desired version)
VERSION="v3.14.0"
wget https://get.helm.sh/helm-${VERSION}-linux-amd64.tar.gz

# Extract the archive
tar -zxvf helm-${VERSION}-linux-amd64.tar.gz

# Move the binary to a location in your PATH
sudo mv linux-amd64/helm /usr/local/bin/helm

# Clean up downloaded files
rm -rf linux-amd64 helm-${VERSION}-linux-amd64.tar.gz
```

### Verify Installation

After installation, verify that Helm is working correctly.

```bash
# Check Helm version
helm version

# Expected output similar to:
# version.BuildInfo{Version:"v3.14.0", GitCommit:"...", GitTreeState:"clean", GoVersion:"go1.21.5"}
```

## Helm Concepts: Charts, Releases, and Repositories

Understanding Helm's core concepts is essential for effective usage.

### Charts

A Helm chart is a collection of files that describe a related set of Kubernetes resources. Think of it as a package containing all the Kubernetes manifests, configurations, and metadata needed to deploy an application.

```bash
# View the structure of a chart
# Charts follow a specific directory structure
helm create mychart
tree mychart/

# Output:
# mychart/
# ├── Chart.yaml          # Chart metadata
# ├── values.yaml         # Default configuration values
# ├── charts/             # Dependencies (subcharts)
# ├── templates/          # Template files
# │   ├── deployment.yaml
# │   ├── service.yaml
# │   ├── _helpers.tpl
# │   └── ...
# └── .helmignore         # Files to ignore when packaging
```

### Releases

A release is an instance of a chart running in a Kubernetes cluster. Each time you install a chart, a new release is created. You can have multiple releases of the same chart with different configurations.

```bash
# List all releases in the current namespace
helm list

# List releases across all namespaces
helm list --all-namespaces

# Get detailed information about a specific release
helm status my-release
```

### Repositories

A Helm repository is a location where packaged charts are stored and shared. Similar to apt repositories in Ubuntu, Helm repositories allow you to search for and download charts.

```bash
# List configured repositories
helm repo list

# The output shows repository names and URLs
# NAME            URL
# stable          https://charts.helm.sh/stable
# bitnami         https://charts.bitnami.com/bitnami
```

## Adding and Managing Repositories

Helm repositories provide access to thousands of pre-built charts for popular applications.

### Adding Repositories

Add popular chart repositories to access commonly used applications.

```bash
# Add the Bitnami repository (contains many popular applications)
helm repo add bitnami https://charts.bitnami.com/bitnami

# Add the Prometheus community repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

# Add the Grafana repository
helm repo add grafana https://grafana.github.io/helm-charts

# Add the Ingress-NGINX repository
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx

# Add the Jetstack repository for cert-manager
helm repo add jetstack https://charts.jetstack.io
```

### Updating Repositories

Keep your repository indexes up to date to access the latest chart versions.

```bash
# Update all repository indexes
# This fetches the latest chart information from all configured repos
helm repo update

# Output:
# Hang tight while we grab the latest from your chart repositories...
# ...Successfully got an update from the "bitnami" chart repository
# ...Successfully got an update from the "prometheus-community" chart repository
# Update Complete. Happy Helming!
```

### Removing Repositories

Remove repositories you no longer need.

```bash
# Remove a repository by name
helm repo remove bitnami

# Verify removal
helm repo list
```

## Searching for Charts

Find charts available in your configured repositories or on Artifact Hub.

### Searching Local Repositories

Search through your configured repository indexes.

```bash
# Search for charts containing "nginx" in configured repositories
helm search repo nginx

# Search with version information displayed
helm search repo nginx --versions

# Search for charts with specific keywords
helm search repo database

# Search for a specific chart
helm search repo bitnami/postgresql
```

### Searching Artifact Hub

Artifact Hub is a web-based application for finding, installing, and publishing Kubernetes packages.

```bash
# Search Artifact Hub for charts
helm search hub wordpress

# Search with output format as YAML for more details
helm search hub prometheus --output yaml

# Limit search results
helm search hub nginx --max-col-width 80
```

### Viewing Chart Information

Get detailed information about a specific chart before installing.

```bash
# Show chart information including description and maintainers
helm show chart bitnami/nginx

# Show all values that can be configured
helm show values bitnami/nginx

# Show the complete chart including README
helm show all bitnami/nginx

# Show only the README
helm show readme bitnami/nginx
```

## Installing and Upgrading Releases

Learn how to install charts and manage release lifecycles.

### Installing a Chart

Install a chart to create a new release.

```bash
# Basic installation with auto-generated release name
helm install bitnami/nginx --generate-name

# Install with a specific release name
helm install my-nginx bitnami/nginx

# Install in a specific namespace (creates namespace if it doesn't exist)
helm install my-nginx bitnami/nginx --namespace web --create-namespace

# Install and wait for all pods to be ready
helm install my-nginx bitnami/nginx --wait --timeout 5m

# Perform a dry-run to see what would be created without actually installing
helm install my-nginx bitnami/nginx --dry-run
```

### Checking Release Status

Monitor your release after installation.

```bash
# Get release status and notes
helm status my-nginx

# Get release status with detailed output
helm status my-nginx --show-desc

# Get release history
helm history my-nginx
```

### Upgrading a Release

Update an existing release with new chart version or configuration.

```bash
# Upgrade to the latest chart version
helm upgrade my-nginx bitnami/nginx

# Upgrade with new values
helm upgrade my-nginx bitnami/nginx --set replicaCount=3

# Upgrade using a values file
helm upgrade my-nginx bitnami/nginx -f custom-values.yaml

# Install if release doesn't exist, otherwise upgrade
helm upgrade --install my-nginx bitnami/nginx

# Upgrade with atomic flag (rollback on failure)
helm upgrade my-nginx bitnami/nginx --atomic --timeout 5m

# Reuse values from the previous release
helm upgrade my-nginx bitnami/nginx --reuse-values
```

### Uninstalling a Release

Remove a release and its associated resources.

```bash
# Uninstall a release
helm uninstall my-nginx

# Uninstall from a specific namespace
helm uninstall my-nginx --namespace web

# Keep release history after uninstall (allows rollback)
helm uninstall my-nginx --keep-history
```

## Customizing Values

Helm's templating system allows extensive customization through values.

### Using the --set Flag

Override individual values directly from the command line.

```bash
# Set a single value
helm install my-nginx bitnami/nginx --set replicaCount=3

# Set multiple values
helm install my-nginx bitnami/nginx \
  --set replicaCount=3 \
  --set service.type=LoadBalancer

# Set nested values using dot notation
helm install my-nginx bitnami/nginx \
  --set resources.limits.cpu=500m \
  --set resources.limits.memory=512Mi

# Set array values
helm install my-app mychart \
  --set "ingress.hosts[0].host=example.com" \
  --set "ingress.hosts[0].paths[0].path=/"

# Set string values that might be interpreted as numbers
helm install my-app mychart --set image.tag="1.0"
```

### Using Values Files

Create a YAML file with your custom values for more complex configurations.

```yaml
# custom-values.yaml
# This file contains custom configuration for the nginx deployment

# Number of nginx replicas to run
replicaCount: 3

# Image configuration
image:
  repository: nginx
  tag: "1.25"
  pullPolicy: IfNotPresent

# Service configuration
service:
  type: LoadBalancer
  port: 80

# Resource limits and requests
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

# Ingress configuration
ingress:
  enabled: true
  hostname: myapp.example.com
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod

# Autoscaling configuration
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPU: 80
```

Install or upgrade using the values file.

```bash
# Install with custom values file
helm install my-nginx bitnami/nginx -f custom-values.yaml

# Use multiple values files (later files override earlier ones)
helm install my-nginx bitnami/nginx \
  -f base-values.yaml \
  -f production-values.yaml

# Combine values file with --set (--set takes precedence)
helm install my-nginx bitnami/nginx \
  -f custom-values.yaml \
  --set replicaCount=5
```

### Viewing Computed Values

See the final computed values that will be used for a release.

```bash
# Get all computed values for an installed release
helm get values my-nginx --all

# Get only user-supplied values
helm get values my-nginx

# Output values as YAML
helm get values my-nginx --output yaml
```

## Creating Your Own Charts

Create custom Helm charts for your applications.

### Initializing a New Chart

Use the helm create command to scaffold a new chart.

```bash
# Create a new chart with default templates
helm create myapp

# This creates a directory structure with sample templates
ls -la myapp/
```

### Chart.yaml Configuration

The Chart.yaml file contains metadata about your chart.

```yaml
# myapp/Chart.yaml
# This file contains metadata about the chart

apiVersion: v2
name: myapp
description: A Helm chart for my custom application

# Chart type: application or library
type: application

# Chart version (increment when making changes to the chart)
version: 0.1.0

# Application version (version of the app being deployed)
appVersion: "1.0.0"

# Keywords for searching
keywords:
  - myapp
  - web
  - api

# Home page URL
home: https://github.com/myorg/myapp

# Source code URLs
sources:
  - https://github.com/myorg/myapp

# Maintainers
maintainers:
  - name: Your Name
    email: your.email@example.com
    url: https://github.com/yourusername

# Chart icon URL
icon: https://example.com/icon.png

# Annotations for additional metadata
annotations:
  category: Web Application
```

### Packaging and Distributing Charts

Package your chart for distribution.

```bash
# Lint the chart to check for issues
helm lint myapp/

# Package the chart into a .tgz archive
helm package myapp/

# This creates myapp-0.1.0.tgz

# Package with a specific version
helm package myapp/ --version 1.0.0

# Install from the local package
helm install my-release ./myapp-0.1.0.tgz

# Install directly from the chart directory
helm install my-release ./myapp/
```

## Chart Structure Explained

Understanding the chart directory structure is crucial for creating and customizing charts.

### Directory Layout

A complete chart directory has the following structure.

```
myapp/
├── Chart.yaml           # Required: Chart metadata and dependencies
├── Chart.lock           # Generated: Locked dependency versions
├── values.yaml          # Default configuration values
├── values.schema.json   # Optional: JSON Schema for values validation
├── charts/              # Directory for chart dependencies
├── crds/                # Custom Resource Definitions
├── templates/           # Template files
│   ├── NOTES.txt        # Usage notes displayed after installation
│   ├── _helpers.tpl     # Template helpers and partials
│   ├── deployment.yaml  # Deployment resource template
│   ├── service.yaml     # Service resource template
│   ├── ingress.yaml     # Ingress resource template
│   ├── configmap.yaml   # ConfigMap resource template
│   ├── secret.yaml      # Secret resource template
│   ├── hpa.yaml         # HorizontalPodAutoscaler template
│   ├── pvc.yaml         # PersistentVolumeClaim template
│   └── tests/           # Test templates
│       └── test-connection.yaml
├── .helmignore          # Files to ignore when packaging
└── README.md            # Documentation
```

### The .helmignore File

Specify files to exclude when packaging the chart.

```
# .helmignore
# Patterns to ignore when building packages

# Common VCS directories
.git/
.gitignore
.bzr/
.bzrignore
.hg/
.hgignore
.svn/

# Common backup files
*.swp
*.bak
*.tmp
*~

# Editor and IDE files
.project
.idea/
*.tmproj
.vscode/

# Documentation and test files (optional)
README.md
docs/
tests/

# OS generated files
.DS_Store
Thumbs.db
```

## Templates and Values

Helm uses Go templates to generate Kubernetes manifests dynamically.

### Template Basics

Create dynamic templates using Go template syntax.

```yaml
# templates/deployment.yaml
# This template creates a Kubernetes Deployment

apiVersion: apps/v1
kind: Deployment
metadata:
  # Use the Release name and chart name for unique naming
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  # Use values from values.yaml or user overrides
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      annotations:
        # Force pod restart when ConfigMap changes
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
      {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      serviceAccountName: {{ include "myapp.serviceAccountName" . }}
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.containerPort }}
              protocol: TCP
          {{- if .Values.livenessProbe.enabled }}
          livenessProbe:
            httpGet:
              path: {{ .Values.livenessProbe.path }}
              port: http
            initialDelaySeconds: {{ .Values.livenessProbe.initialDelaySeconds }}
            periodSeconds: {{ .Values.livenessProbe.periodSeconds }}
          {{- end }}
          {{- if .Values.readinessProbe.enabled }}
          readinessProbe:
            httpGet:
              path: {{ .Values.readinessProbe.path }}
              port: http
            initialDelaySeconds: {{ .Values.readinessProbe.initialDelaySeconds }}
            periodSeconds: {{ .Values.readinessProbe.periodSeconds }}
          {{- end }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          env:
            {{- range .Values.env }}
            - name: {{ .name }}
              value: {{ .value | quote }}
            {{- end }}
          {{- if .Values.envFrom }}
          envFrom:
            {{- toYaml .Values.envFrom | nindent 12 }}
          {{- end }}
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
```

### The _helpers.tpl File

Define reusable template functions and partials.

```yaml
# templates/_helpers.tpl
# This file contains helper templates for the chart

{{/*
Expand the name of the chart.
*/}}
{{- define "myapp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this.
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
Create chart name and version as used by the chart label.
*/}}
{{- define "myapp.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "myapp.labels" -}}
helm.sh/chart: {{ include "myapp.chart" . }}
{{ include "myapp.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "myapp.selectorLabels" -}}
app.kubernetes.io/name: {{ include "myapp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "myapp.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "myapp.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
```

### Default values.yaml

Define default values for your chart.

```yaml
# values.yaml
# Default values for myapp chart
# This is a YAML-formatted file

# Number of replicas to deploy
replicaCount: 1

# Container image configuration
image:
  repository: myorg/myapp
  pullPolicy: IfNotPresent
  # Overrides the image tag whose default is the chart appVersion
  tag: ""

# Image pull secrets for private registries
imagePullSecrets: []

# Override the chart name
nameOverride: ""
fullnameOverride: ""

# Service account configuration
serviceAccount:
  # Specifies whether a service account should be created
  create: true
  # Annotations to add to the service account
  annotations: {}
  # The name of the service account to use
  name: ""

# Pod annotations
podAnnotations: {}

# Pod security context
podSecurityContext: {}
  # fsGroup: 2000

# Container security context
securityContext: {}
  # capabilities:
  #   drop:
  #   - ALL
  # readOnlyRootFilesystem: true
  # runAsNonRoot: true
  # runAsUser: 1000

# Container port
containerPort: 8080

# Service configuration
service:
  type: ClusterIP
  port: 80

# Ingress configuration
ingress:
  enabled: false
  className: ""
  annotations: {}
  hosts:
    - host: chart-example.local
      paths:
        - path: /
          pathType: ImplementationSpecific
  tls: []

# Resource limits and requests
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi

# Liveness probe configuration
livenessProbe:
  enabled: true
  path: /healthz
  initialDelaySeconds: 30
  periodSeconds: 10

# Readiness probe configuration
readinessProbe:
  enabled: true
  path: /ready
  initialDelaySeconds: 5
  periodSeconds: 5

# Horizontal Pod Autoscaler
autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 100
  targetCPUUtilizationPercentage: 80
  # targetMemoryUtilizationPercentage: 80

# Node selector
nodeSelector: {}

# Tolerations
tolerations: []

# Affinity rules
affinity: {}

# Environment variables
env: []
  # - name: LOG_LEVEL
  #   value: info

# Environment variables from ConfigMaps or Secrets
envFrom: []
```

### Template Functions and Pipelines

Use Helm's built-in functions and pipelines.

```yaml
# examples/template-functions.yaml
# Demonstrating various Helm template functions

apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "myapp.fullname" . }}-config
data:
  # String functions
  app-name: {{ .Chart.Name | upper | quote }}
  description: {{ .Chart.Description | lower | trunc 50 }}

  # Default values
  log-level: {{ .Values.logLevel | default "info" | quote }}

  # Conditional logic
  {{- if .Values.debug }}
  debug-mode: "enabled"
  {{- else }}
  debug-mode: "disabled"
  {{- end }}

  # Range over lists
  allowed-hosts: |
    {{- range .Values.allowedHosts }}
    - {{ . | quote }}
    {{- end }}

  # Range over maps
  feature-flags: |
    {{- range $key, $value := .Values.features }}
    {{ $key }}: {{ $value | quote }}
    {{- end }}

  # toYaml for complex structures
  extra-config: |
    {{- toYaml .Values.extraConfig | nindent 4 }}

  # Lookup existing resources (use with caution)
  {{- $secret := lookup "v1" "Secret" .Release.Namespace "existing-secret" }}
  {{- if $secret }}
  existing-secret-found: "true"
  {{- end }}

  # Required values (fail if not provided)
  # database-host: {{ required "database.host is required" .Values.database.host }}
```

## Dependencies Management

Manage chart dependencies effectively using Chart.yaml.

### Declaring Dependencies

Specify dependencies in Chart.yaml.

```yaml
# Chart.yaml with dependencies
apiVersion: v2
name: myapp
version: 0.1.0
appVersion: "1.0.0"

# Dependencies section
dependencies:
  # PostgreSQL database dependency
  - name: postgresql
    version: "12.x.x"
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled
    tags:
      - database

  # Redis cache dependency
  - name: redis
    version: "17.x.x"
    repository: https://charts.bitnami.com/bitnami
    condition: redis.enabled
    tags:
      - cache

  # Local chart dependency
  - name: common
    version: "0.1.0"
    repository: "file://../common"

  # Optional dependency with alias
  - name: nginx
    version: "13.x.x"
    repository: https://charts.bitnami.com/bitnami
    alias: webserver
    condition: webserver.enabled
```

### Managing Dependencies

Use Helm commands to manage dependencies.

```bash
# Update dependencies (downloads charts to charts/ directory)
helm dependency update myapp/

# This creates Chart.lock with exact versions

# Build dependencies without updating
helm dependency build myapp/

# List dependencies and their status
helm dependency list myapp/

# Output shows:
# NAME          VERSION   REPOSITORY                              STATUS
# postgresql    12.x.x    https://charts.bitnami.com/bitnami      ok
# redis         17.x.x    https://charts.bitnami.com/bitnami      ok
```

### Configuring Dependencies

Configure dependency values in your parent chart's values.yaml.

```yaml
# values.yaml
# Configure dependencies using their chart name or alias as the key

# Main application settings
replicaCount: 2

# PostgreSQL configuration (dependency)
postgresql:
  enabled: true
  auth:
    username: myapp
    password: ""
    database: myapp_db
  primary:
    persistence:
      enabled: true
      size: 10Gi

# Redis configuration (dependency)
redis:
  enabled: true
  architecture: standalone
  auth:
    enabled: true
    password: ""
  master:
    persistence:
      enabled: true
      size: 5Gi

# Webserver (aliased nginx dependency)
webserver:
  enabled: false
```

### Conditional Dependencies

Enable or disable dependencies based on conditions.

```yaml
# values.yaml with dependency conditions

# Enable PostgreSQL database
postgresql:
  enabled: true

# Disable Redis (won't be installed)
redis:
  enabled: false

# Use external database instead
externalDatabase:
  enabled: false
  host: ""
  port: 5432
  user: ""
  password: ""
  database: ""
```

Reference these conditions in your templates.

```yaml
# templates/deployment.yaml
# Conditionally configure database connection

env:
  {{- if .Values.postgresql.enabled }}
  # Use bundled PostgreSQL
  - name: DB_HOST
    value: {{ include "myapp.fullname" . }}-postgresql
  - name: DB_PORT
    value: "5432"
  - name: DB_USER
    value: {{ .Values.postgresql.auth.username }}
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: {{ include "myapp.fullname" . }}-postgresql
        key: password
  - name: DB_NAME
    value: {{ .Values.postgresql.auth.database }}
  {{- else if .Values.externalDatabase.enabled }}
  # Use external database
  - name: DB_HOST
    value: {{ .Values.externalDatabase.host }}
  - name: DB_PORT
    value: {{ .Values.externalDatabase.port | quote }}
  - name: DB_USER
    value: {{ .Values.externalDatabase.user }}
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: {{ include "myapp.fullname" . }}-external-db
        key: password
  - name: DB_NAME
    value: {{ .Values.externalDatabase.database }}
  {{- end }}
```

## Helm Hooks

Helm hooks allow you to intervene at certain points in a release's lifecycle.

### Hook Types

Available hook types and when they execute.

```yaml
# Hook annotation values and their execution points:
# pre-install     - Executes after templates are rendered, before any resources are created
# post-install    - Executes after all resources are loaded into Kubernetes
# pre-delete      - Executes on a deletion request before any resources are deleted
# post-delete     - Executes on a deletion request after all resources have been deleted
# pre-upgrade     - Executes after templates are rendered, before any resources are updated
# post-upgrade    - Executes after all resources have been upgraded
# pre-rollback    - Executes after templates are rendered, before any resources are rolled back
# post-rollback   - Executes after all resources have been modified during rollback
# test            - Executes when the helm test subcommand is invoked
```

### Database Migration Hook Example

Run database migrations before deploying your application.

```yaml
# templates/migration-job.yaml
# This Job runs database migrations before the application starts

apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "myapp.fullname" . }}-migration
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
  annotations:
    # This is a pre-install and pre-upgrade hook
    "helm.sh/hook": pre-install,pre-upgrade
    # Run this hook before other pre-install hooks (lower weight = earlier)
    "helm.sh/hook-weight": "-5"
    # Delete this job before the next hook is executed
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  template:
    metadata:
      name: {{ include "myapp.fullname" . }}-migration
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
      restartPolicy: Never
      containers:
        - name: migration
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          command: ["./migrate.sh"]
          env:
            - name: DB_HOST
              value: {{ include "myapp.fullname" . }}-postgresql
            - name: DB_USER
              value: {{ .Values.postgresql.auth.username }}
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: {{ include "myapp.fullname" . }}-postgresql
                  key: password
            - name: DB_NAME
              value: {{ .Values.postgresql.auth.database }}
  backoffLimit: 3
```

### Post-Install Notification Hook

Send a notification after successful installation.

```yaml
# templates/post-install-notification.yaml
# Sends a Slack notification after successful deployment

apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "myapp.fullname" . }}-notify
  annotations:
    "helm.sh/hook": post-install,post-upgrade
    "helm.sh/hook-weight": "5"
    "helm.sh/hook-delete-policy": hook-succeeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: notify
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              curl -X POST $SLACK_WEBHOOK_URL \
                -H 'Content-type: application/json' \
                --data '{
                  "text": "Deployment successful!",
                  "blocks": [
                    {
                      "type": "section",
                      "text": {
                        "type": "mrkdwn",
                        "text": "*{{ .Chart.Name }}* version *{{ .Chart.AppVersion }}* deployed to *{{ .Release.Namespace }}*"
                      }
                    }
                  ]
                }'
          env:
            - name: SLACK_WEBHOOK_URL
              valueFrom:
                secretKeyRef:
                  name: {{ include "myapp.fullname" . }}-slack
                  key: webhook-url
  backoffLimit: 1
```

### Hook Delete Policies

Control when hook resources are deleted.

```yaml
# Hook delete policy options:
# before-hook-creation - Delete the previous resource before a new hook is launched (default)
# hook-succeeded       - Delete the resource after the hook is successfully executed
# hook-failed          - Delete the resource if the hook failed during execution

# Example: Keep failed hooks for debugging
annotations:
  "helm.sh/hook": pre-install
  "helm.sh/hook-delete-policy": hook-succeeded
  # Failed hooks will remain for troubleshooting
```

## Release Rollback

Roll back to a previous release version when issues occur.

### Viewing Release History

Check the history of releases to find rollback targets.

```bash
# View release history
helm history my-nginx

# Output shows revision numbers and statuses:
# REVISION  UPDATED                   STATUS      CHART           APP VERSION  DESCRIPTION
# 1         Mon Jan 15 10:00:00 2026  superseded  nginx-13.2.0    1.25.0       Install complete
# 2         Mon Jan 15 11:00:00 2026  superseded  nginx-13.2.1    1.25.1       Upgrade complete
# 3         Mon Jan 15 12:00:00 2026  deployed    nginx-13.2.2    1.25.2       Upgrade complete
```

### Performing a Rollback

Roll back to a specific revision.

```bash
# Roll back to the previous revision
helm rollback my-nginx

# Roll back to a specific revision number
helm rollback my-nginx 1

# Rollback with timeout
helm rollback my-nginx 2 --timeout 5m

# Dry-run rollback to see what would happen
helm rollback my-nginx 1 --dry-run

# Force rollback even if there are issues
helm rollback my-nginx 1 --force

# Rollback and wait for resources to be ready
helm rollback my-nginx 1 --wait
```

### Automatic Rollback with --atomic

Use atomic upgrades to automatically rollback on failure.

```bash
# Upgrade with automatic rollback on failure
helm upgrade my-nginx bitnami/nginx \
  --atomic \
  --timeout 5m \
  --set replicaCount=3

# If the upgrade fails (pods not ready within timeout),
# Helm automatically rolls back to the previous version
```

### Rollback Strategies

Implement rollback strategies for production deployments.

```bash
# Example: Canary deployment with rollback capability

# 1. Deploy with a small replica count
helm upgrade my-nginx bitnami/nginx \
  --set replicaCount=1 \
  --wait

# 2. Monitor for issues (use your monitoring tools)
# 3. If issues detected, rollback immediately
helm rollback my-nginx

# 4. If successful, scale up
helm upgrade my-nginx bitnami/nginx \
  --reuse-values \
  --set replicaCount=5 \
  --wait
```

## Troubleshooting

Common issues and how to resolve them.

### Debugging Templates

Use Helm's built-in debugging tools.

```bash
# Render templates locally without installing
helm template my-nginx bitnami/nginx -f values.yaml

# Render with debug output (shows computed values)
helm template my-nginx bitnami/nginx --debug

# Dry-run installation to see what would be created
helm install my-nginx bitnami/nginx --dry-run --debug

# Lint your chart for issues
helm lint myapp/

# Lint with strict mode
helm lint myapp/ --strict
```

### Getting Release Information

Retrieve detailed information about releases.

```bash
# Get all information about a release
helm get all my-nginx

# Get the manifest (rendered YAML)
helm get manifest my-nginx

# Get the computed values
helm get values my-nginx --all

# Get release notes
helm get notes my-nginx

# Get hooks
helm get hooks my-nginx
```

### Common Issues and Solutions

Solutions for frequently encountered problems.

```bash
# Issue: "Error: INSTALLATION FAILED: cannot re-use a name that is still in use"
# Solution: Either uninstall the existing release or use a different name
helm uninstall my-nginx
# Or use upgrade with --install flag
helm upgrade --install my-nginx bitnami/nginx

# Issue: "Error: UPGRADE FAILED: another operation (install/upgrade/rollback) is in progress"
# Solution: Wait for the operation to complete or force rollback
helm rollback my-nginx

# Issue: Release stuck in "pending-install" or "pending-upgrade" state
# Solution: Check for stuck resources and manually clean up
kubectl get all -l "app.kubernetes.io/instance=my-nginx"
# If necessary, delete the stuck release
helm uninstall my-nginx --no-hooks

# Issue: "Error: rendered manifests contain a resource that already exists"
# Solution: Either delete the existing resource or use a different release name
kubectl delete <resource-type> <resource-name>

# Issue: Values not being applied correctly
# Solution: Verify values file syntax and check computed values
helm get values my-nginx --all
helm template my-nginx bitnami/nginx -f values.yaml --debug
```

### Checking Kubernetes Resources

Verify deployed resources are working correctly.

```bash
# Check pods created by the release
kubectl get pods -l "app.kubernetes.io/instance=my-nginx"

# Describe a pod for detailed information
kubectl describe pod -l "app.kubernetes.io/instance=my-nginx"

# View pod logs
kubectl logs -l "app.kubernetes.io/instance=my-nginx" --tail=100

# Check events for issues
kubectl get events --sort-by='.lastTimestamp' | grep my-nginx

# Check if services are correctly configured
kubectl get svc -l "app.kubernetes.io/instance=my-nginx"

# Test service connectivity
kubectl port-forward svc/my-nginx 8080:80
```

### Helm Plugin for Debugging

Install helpful Helm plugins for advanced debugging.

```bash
# Install the diff plugin to see changes before upgrading
helm plugin install https://github.com/databus23/helm-diff

# Compare current release with proposed changes
helm diff upgrade my-nginx bitnami/nginx -f new-values.yaml

# Install the secrets plugin for managing secrets
helm plugin install https://github.com/jkroepke/helm-secrets

# List installed plugins
helm plugin list
```

## Best Practices

Follow these best practices for production Helm usage.

### Version Pinning

Always pin chart versions in production.

```bash
# Pin to a specific version
helm install my-nginx bitnami/nginx --version 13.2.0

# In dependencies, use specific versions
# Chart.yaml
dependencies:
  - name: postgresql
    version: "12.1.5"  # Pin to specific version, not "12.x.x"
    repository: https://charts.bitnami.com/bitnami
```

### Namespace Isolation

Use namespaces to isolate releases.

```bash
# Install in a dedicated namespace
helm install my-nginx bitnami/nginx \
  --namespace production \
  --create-namespace

# Use different namespaces for different environments
helm install my-nginx bitnami/nginx --namespace staging
helm install my-nginx bitnami/nginx --namespace production
```

### Values File Management

Organize values files for different environments.

```bash
# Directory structure for environment-specific values
myapp/
├── values.yaml           # Base values
├── values-dev.yaml       # Development overrides
├── values-staging.yaml   # Staging overrides
├── values-prod.yaml      # Production overrides

# Deploy to different environments
helm upgrade --install myapp ./myapp -f values.yaml -f values-dev.yaml --namespace dev
helm upgrade --install myapp ./myapp -f values.yaml -f values-staging.yaml --namespace staging
helm upgrade --install myapp ./myapp -f values.yaml -f values-prod.yaml --namespace production
```

### Security Considerations

Implement security best practices.

```bash
# Verify chart integrity before installation
helm verify myapp-0.1.0.tgz

# Use signed charts in production
helm package --sign --key mykey --keyring ~/.gnupg/secring.gpg myapp/

# Scan charts for security issues
# Install the kubesec plugin
helm plugin install https://github.com/controlplaneio/kubesec

# Never store secrets in values files
# Use external secret management tools like:
# - Kubernetes Secrets with encryption at rest
# - HashiCorp Vault
# - AWS Secrets Manager
# - External Secrets Operator
```

## Monitoring Your Helm Deployments with OneUptime

After deploying your applications with Helm, monitoring becomes crucial for maintaining reliability and performance. OneUptime provides comprehensive monitoring capabilities for your Kubernetes deployments.

OneUptime offers:

- **Infrastructure Monitoring**: Track the health and performance of your Kubernetes clusters, nodes, and pods deployed via Helm
- **Application Performance Monitoring**: Monitor response times, error rates, and throughput of your Helm-deployed applications
- **Alerting and Incident Management**: Get notified immediately when your deployments experience issues
- **Status Pages**: Communicate service status to your users with beautiful, customizable status pages
- **Log Management**: Centralize and analyze logs from all your Helm releases
- **Uptime Monitoring**: Ensure your services are available and responding correctly

You can even deploy OneUptime itself using Helm:

```bash
# Add the OneUptime Helm repository
helm repo add oneuptime https://helm.oneuptime.com

# Install OneUptime
helm install oneuptime oneuptime/oneuptime \
  --namespace oneuptime \
  --create-namespace
```

Visit [OneUptime](https://oneuptime.com) to learn more about monitoring your Kubernetes infrastructure and applications deployed with Helm.

## Conclusion

Helm is an indispensable tool for managing Kubernetes applications on Ubuntu. From simplifying deployments with pre-built charts to creating custom charts for your applications, Helm provides the flexibility and power needed for production Kubernetes environments.

Key takeaways from this guide:

1. **Installation is straightforward** with multiple methods available for Ubuntu
2. **Charts, releases, and repositories** form the core concepts of Helm
3. **Customization through values** allows you to adapt charts to your needs
4. **Creating your own charts** enables packaging and sharing your applications
5. **Dependencies management** simplifies complex application stacks
6. **Hooks provide lifecycle control** for migrations and notifications
7. **Rollback capabilities** ensure you can recover from failed deployments
8. **Proper troubleshooting techniques** help resolve issues quickly

Start small with existing charts from popular repositories, and gradually move to creating your own charts as your comfort level grows. Combined with proper monitoring using tools like OneUptime, Helm becomes a powerful foundation for your Kubernetes workflow.
