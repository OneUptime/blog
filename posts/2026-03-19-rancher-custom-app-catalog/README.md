# How to Create a Custom App Catalog in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Helm, App Catalog

Description: Learn how to create a custom app catalog in Rancher with your own Helm charts, including chart structure, questions files, and catalog organization.

A custom app catalog in Rancher lets you provide a curated set of applications for your teams to deploy. By creating your own catalog, you control which applications are available, standardize configurations through questions files, and maintain versioned chart releases. This guide covers building a custom catalog from scratch and integrating it with Rancher.

## Prerequisites

- A running Rancher instance (v2.7 or later)
- A Git repository or HTTP server to host your catalog
- Helm CLI installed locally for chart development
- Basic knowledge of Helm chart structure

## Understanding Rancher Catalogs

A Rancher custom catalog is typically either a standard HTTP-based Helm chart repository or a Git repository with a Rancher-specific chart layout. Rancher adds features on top of standard Helm charts:

- **questions.yaml**: Generates a form-based UI for chart configuration
- **app-readme.md**: Provides a summary shown in the Rancher UI
- **Chart annotations and keywords**: Set UI defaults, dependencies, and categories

## Step 1: Create the Catalog Structure

Set up your Git repository with the following structure:

```plaintext
my-catalog/
├── charts/
│   ├── my-web-app/
│   │   ├── v1.0.0/
│   │   │   ├── Chart.yaml
│   │   │   ├── values.yaml
│   │   │   ├── questions.yaml
│   │   │   ├── app-readme.md
│   │   │   └── templates/
│   │   │       ├── deployment.yaml
│   │   │       ├── service.yaml
│   │   │       └── _helpers.tpl
│   │   └── v1.1.0/
│   │       ├── Chart.yaml
│   │       ├── values.yaml
│   │       ├── questions.yaml
│   │       ├── app-readme.md
│   │       └── templates/
│   │           └── ...
│   └── my-api/
│       └── v1.0.0/
│           └── ...
└── README.md
```

For a traditional Helm repository, package each chart and publish the resulting `.tgz` archives with an `index.yaml` instead of using version directories in Git.

## Step 2: Create a Helm Chart

### Chart.yaml

```yaml
apiVersion: v2
name: my-web-app
description: A custom web application for internal use
version: 1.0.0
appVersion: "2.0.0"
type: application
keywords:
  - web
  - application
maintainers:
  - name: Platform Team
    email: platform@example.com
annotations:
  catalog.cattle.io/display-name: My Web Application
  catalog.cattle.io/namespace: default
  catalog.cattle.io/release-name: my-web-app
```

Key Rancher annotations:

- `catalog.cattle.io/display-name`: Friendly name shown in the UI
- `catalog.cattle.io/namespace`: Fixed installation namespace
- `catalog.cattle.io/release-name`: Fixed release name
- `catalog.cattle.io/auto-install`: Install another chart and version before this chart

Use the `keywords` field in `Chart.yaml` to define categories in the Rancher UI.

### values.yaml

```yaml
replicaCount: 1

image:
  repository: my-registry.example.com/my-web-app
  tag: "2.0.0"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: false
  hostname: ""
  tls: false

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 256Mi

persistence:
  enabled: false
  size: 1Gi
  storageClass: ""

env:
  LOG_LEVEL: "info"
  NODE_ENV: "production"
```

## Step 3: Create a questions.yaml File

The `questions.yaml` file generates a form in the Rancher UI for users to configure the chart without editing YAML directly.

```yaml
questions:
  - variable: replicaCount
    default: 1
    description: "Number of replicas to run"
    type: int
    required: true
    label: "Replica Count"
    group: "General"

  - variable: image.repository
    default: "my-registry.example.com/my-web-app"
    description: "Container image repository"
    type: string
    required: true
    label: "Image Repository"
    group: "Container Image"

  - variable: image.tag
    default: "2.0.0"
    description: "Container image tag"
    type: string
    required: true
    label: "Image Tag"
    group: "Container Image"

  - variable: service.type
    default: "ClusterIP"
    description: "Kubernetes service type"
    type: enum
    options:
      - ClusterIP
      - NodePort
      - LoadBalancer
    required: true
    label: "Service Type"
    group: "Networking"

  - variable: ingress.enabled
    default: false
    description: "Enable Ingress for external access"
    type: boolean
    required: false
    label: "Enable Ingress"
    group: "Networking"
    show_subquestion_if: "true"
    subquestions:
      - variable: ingress.hostname
        default: ""
        description: "Hostname for the Ingress"
        type: hostname
        required: true
        label: "Ingress Hostname"
      - variable: ingress.tls
        default: false
        description: "Enable TLS for the Ingress"
        type: boolean
        label: "Enable TLS"

  - variable: resources.requests.cpu
    default: "100m"
    description: "CPU request for the container"
    type: string
    label: "CPU Request"
    group: "Resources"

  - variable: resources.requests.memory
    default: "128Mi"
    description: "Memory request for the container"
    type: string
    label: "Memory Request"
    group: "Resources"

  - variable: persistence.enabled
    default: false
    description: "Enable persistent storage"
    type: boolean
    label: "Enable Persistence"
    group: "Storage"
    show_subquestion_if: "true"
    subquestions:
      - variable: persistence.size
        default: "1Gi"
        description: "Size of the persistent volume"
        type: string
        label: "Storage Size"
      - variable: persistence.storageClass
        default: ""
        description: "StorageClass for the PVC (leave empty for default)"
        type: storageclass
        label: "Storage Class"
```

### Question Types

| Type | Description |
|------|-------------|
| `string` | Text input |
| `multiline` | Multi-line text input |
| `int` | Integer input |
| `boolean` | Checkbox |
| `enum` | Dropdown with predefined options |
| `password` | Password input (masked) |
| `hostname` | Hostname validation |
| `storageclass` | StorageClass selector |
| `pvc` | PVC selector |
| `secret` | Secret selector |
| `cloudcredential` | Cloud credential selector |

## Step 4: Create an app-readme.md

This file provides a summary shown in the Rancher chart detail page:

```markdown
# My Web Application

This chart deploys the internal web application with configurable replicas,
resource limits, and optional Ingress support.

## Features

- Configurable replica count for high availability
- Optional persistent storage
- Ingress support with TLS
- Resource limits and requests

## Quick Start

1. Set the image tag to match your release version
2. Configure the replica count based on expected traffic
3. Enable Ingress if external access is needed
```

## Step 5: Create the Templates

### templates/deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "my-web-app.fullname" . }}
  labels:
    {{- include "my-web-app.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "my-web-app.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "my-web-app.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: 80
              protocol: TCP
          env:
            {{- range $key, $value := .Values.env }}
            - name: {{ $key }}
              value: {{ $value | quote }}
            {{- end }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
```

## Step 6: Package and Publish

### Option A: Git Repository

Push your catalog structure to a Git repository and add it to Rancher as a Git-based repository:

```bash
git init -b main
git add .
git commit -m "Initial catalog"
git remote add origin https://github.com/my-org/rancher-catalog.git
git push -u origin main
```

In the target cluster's dashboard in Rancher, go to **Apps > Repositories** and add the Git repository.

### Option B: Helm Repository

Package the charts and create an index:

```bash
cd charts/my-web-app/v1.0.0
helm package .
mv my-web-app-1.0.0.tgz /path/to/repo/
cd /path/to/repo/
helm repo index . --url https://charts.example.com
```

Host the files on any HTTP server and add the URL in Rancher.

## Step 7: Verify in Rancher

1. In the target cluster, go to **Apps > Charts**
2. Filter by your repository name
3. Your custom chart should appear with the display name from `Chart.yaml`
4. Click on it to see the questions form and chart documentation

## Summary

Creating a custom app catalog in Rancher lets you provide standardized, self-service application deployment for your teams. The `questions.yaml` file generates an intuitive configuration form, while standard Helm templating handles the underlying Kubernetes resources. Host your catalog in a Git repository or as a traditional Helm repository, and add it to Rancher to make it available on the target cluster.
