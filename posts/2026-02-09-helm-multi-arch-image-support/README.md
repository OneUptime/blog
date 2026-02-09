# How to Build Helm Charts with Multi-Architecture Image Support Using Values

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, Docker

Description: Build Helm charts that support multi-architecture container images for seamless deployment across x86 and ARM platforms using values-based configuration.

---

Multi-architecture support in Helm charts allows the same chart to deploy applications on different processor architectures like x86-64 and ARM64. This flexibility is critical as ARM-based infrastructure becomes more common in cloud and edge environments. Proper multi-arch support requires careful values configuration and template logic.

## Why Multi-Architecture Matters

Kubernetes clusters increasingly run on diverse hardware. AWS Graviton instances use ARM processors, Apple Silicon uses ARM for local development, and edge devices often run on ARM. A chart without multi-arch support fails when scheduled on incompatible nodes.

Docker multi-arch images solve this by packaging binaries for multiple architectures in a single image tag. The container runtime automatically selects the correct variant based on the node's architecture. Your Helm chart needs to support this pattern while allowing users to override behavior when needed.

## Structuring Values for Multi-Arch Images

Design your values.yaml to handle both simple single-arch scenarios and complex multi-arch deployments.

```yaml
# values.yaml
image:
  # Primary image configuration
  repository: mycompany/myapp
  tag: "1.2.3"
  pullPolicy: IfNotPresent

  # Multi-arch support
  multiArch:
    enabled: true
    # Platform-specific overrides
    platforms:
      amd64:
        repository: mycompany/myapp
        tag: "1.2.3-amd64"
      arm64:
        repository: mycompany/myapp
        tag: "1.2.3-arm64"
      arm:
        repository: mycompany/myapp
        tag: "1.2.3-armv7"

  # Fallback for single-arch images
  platform: ""  # auto-detect if empty

# Node affinity rules for architecture
nodeSelector: {}

affinity:
  # Can be overridden for specific architectures
  nodeAffinity: {}

# Tolerations for mixed-architecture clusters
tolerations: []
```

This structure provides flexibility. Most users can ignore multi-arch settings and use manifest lists, while advanced users can specify architecture-specific images.

## Creating Smart Image Selection Templates

Build template helpers that select the correct image based on configuration and node architecture.

```yaml
# templates/_helpers.tpl
{{/*
Expand the image name based on architecture settings
*/}}
{{- define "myapp.image" -}}
{{- if .Values.image.multiArch.enabled -}}
  {{- if .Values.image.platform -}}
    {{- $platform := .Values.image.platform -}}
    {{- $platformConfig := index .Values.image.multiArch.platforms $platform -}}
    {{- if $platformConfig -}}
      {{- printf "%s:%s" $platformConfig.repository $platformConfig.tag -}}
    {{- else -}}
      {{- printf "%s:%s" .Values.image.repository .Values.image.tag -}}
    {{- end -}}
  {{- else -}}
    {{- printf "%s:%s" .Values.image.repository .Values.image.tag -}}
  {{- end -}}
{{- else -}}
  {{- printf "%s:%s" .Values.image.repository .Values.image.tag -}}
{{- end -}}
{{- end -}}

{{/*
Generate node affinity for specific architecture
*/}}
{{- define "myapp.nodeAffinity" -}}
{{- if .Values.image.platform -}}
nodeAffinity:
  requiredDuringSchedulingIgnoredDuringExecution:
    nodeSelectorTerms:
    - matchExpressions:
      - key: kubernetes.io/arch
        operator: In
        values:
        - {{ .Values.image.platform }}
{{- else if .Values.affinity.nodeAffinity -}}
nodeAffinity:
  {{- toYaml .Values.affinity.nodeAffinity | nindent 2 }}
{{- end -}}
{{- end -}}
```

Use these helpers in your deployment template.

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: {{ include "myapp.image" . }}
        imagePullPolicy: {{ .Values.image.pullPolicy }}
        ports:
        - name: http
          containerPort: 8080
          protocol: TCP
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- if or .Values.image.platform .Values.affinity.nodeAffinity }}
      affinity:
        {{- include "myapp.nodeAffinity" . | nindent 8 }}
      {{- end }}
```

## Supporting Docker Manifest Lists

Docker manifest lists are the preferred multi-arch approach. A single tag points to architecture-specific images.

```yaml
# values.yaml for manifest list approach
image:
  # This tag points to a manifest list containing all architectures
  repository: mycompany/myapp
  tag: "1.2.3"
  pullPolicy: IfNotPresent

# No architecture-specific configuration needed
# The container runtime selects the right image automatically
```

Your deployment template stays simple.

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: {{ .Chart.Name }}
        # Container runtime auto-selects correct architecture
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
```

This approach works seamlessly across architectures without any chart modifications.

## Building Multi-Arch Images in CI/CD

Create multi-arch images using Docker buildx in your CI pipeline.

```yaml
# .github/workflows/build-multiarch.yaml
name: Build Multi-Arch Image

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v2

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Registry
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: mycompany/myapp
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}

      - name: Build and push multi-arch image
        uses: docker/build-push-action@v4
        with:
          context: .
          platforms: linux/amd64,linux/arm64,linux/arm/v7
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

This creates a single image tag that works across multiple architectures.

## Handling Architecture-Specific Dependencies

Some applications need different base images or dependencies per architecture.

```dockerfile
# Dockerfile with multi-stage build for multi-arch
FROM --platform=${BUILDPLATFORM} golang:1.21 AS builder

ARG TARGETPLATFORM
ARG BUILDPLATFORM
ARG TARGETOS
ARG TARGETARCH

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build for target architecture
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -ldflags="-w -s" -o /app/server .

# Use architecture-specific base image if needed
FROM alpine:3.18

# Install architecture-specific runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Copy binary from builder
COPY --from=builder /app/server /usr/local/bin/server

ENTRYPOINT ["/usr/local/bin/server"]
```

Reference this in your values file.

```yaml
# values.yaml
image:
  repository: mycompany/myapp
  tag: "1.2.3"
  # Multi-arch build automatically handles architecture
  pullPolicy: IfNotPresent
```

## Supporting Sidecar Containers

When using sidecar containers, ensure they also support multi-arch.

```yaml
# values.yaml
sidecars:
  - name: log-collector
    image:
      repository: fluent/fluent-bit
      tag: "2.1.0"  # Multi-arch manifest list
    resources:
      limits:
        memory: 100Mi
      requests:
        memory: 50Mi

  - name: metrics-exporter
    image:
      repository: prom/statsd-exporter
      tag: "v0.24.0"  # Multi-arch manifest list
```

Include sidecars in your deployment.

```yaml
# templates/deployment.yaml
spec:
  template:
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: {{ include "myapp.image" . }}
      {{- range .Values.sidecars }}
      - name: {{ .name }}
        image: "{{ .image.repository }}:{{ .image.tag }}"
        {{- with .resources }}
        resources:
          {{- toYaml . | nindent 10 }}
        {{- end }}
      {{- end }}
```

## Testing Multi-Arch Deployments

Create test values files for different architectures.

```yaml
# test-values-amd64.yaml
image:
  platform: amd64

nodeSelector:
  kubernetes.io/arch: amd64
```

```yaml
# test-values-arm64.yaml
image:
  platform: arm64

nodeSelector:
  kubernetes.io/arch: arm64
```

Test installations with architecture-specific values.

```bash
# Test on AMD64 nodes
helm install myapp-amd64 ./mychart \
  --values test-values-amd64.yaml \
  --namespace test-amd64 \
  --create-namespace

# Test on ARM64 nodes
helm install myapp-arm64 ./mychart \
  --values test-values-arm64.yaml \
  --namespace test-arm64 \
  --create-namespace

# Verify correct architecture
kubectl get pod -n test-amd64 -o jsonpath='{.items[0].spec.containers[0].image}'
kubectl get pod -n test-arm64 -o jsonpath='{.items[0].spec.containers[0].image}'
```

## Documenting Multi-Arch Support

Update your chart's README to explain multi-arch capabilities.

```markdown
# MyApp Helm Chart

## Multi-Architecture Support

This chart supports deployment on multiple architectures:
- linux/amd64 (x86-64)
- linux/arm64 (ARM 64-bit)
- linux/arm/v7 (ARM 32-bit)

### Default Behavior

By default, the chart uses Docker manifest lists. The container runtime
automatically selects the correct image for your node's architecture.

No configuration changes are needed for multi-arch support.

### Architecture-Specific Images

For advanced scenarios requiring architecture-specific images:

```yaml
image:
  multiArch:
    enabled: true
    platforms:
      amd64:
        repository: mycompany/myapp
        tag: "1.2.3-amd64"
      arm64:
        repository: mycompany/myapp
        tag: "1.2.3-arm64"
```

### Constraining to Specific Architecture

To run only on specific architecture:

```yaml
image:
  platform: arm64

nodeSelector:
  kubernetes.io/arch: arm64
```
```

## Handling Init Containers

Init containers also need multi-arch support.

```yaml
# values.yaml
initContainers:
  - name: migration
    image:
      repository: mycompany/myapp-migrations
      tag: "1.2.3"  # Multi-arch manifest
    command: ['sh', '-c', 'run-migrations']
```

Include in deployment template.

```yaml
# templates/deployment.yaml
spec:
  template:
    spec:
      {{- if .Values.initContainers }}
      initContainers:
      {{- range .Values.initContainers }}
      - name: {{ .name }}
        image: "{{ .image.repository }}:{{ .image.tag }}"
        {{- with .command }}
        command:
          {{- toYaml . | nindent 10 }}
        {{- end }}
      {{- end }}
      {{- end }}
```

Multi-architecture support in Helm charts requires thoughtful values design and template logic. Use Docker manifest lists for the simplest experience, allowing the container runtime to select the correct architecture automatically. For advanced cases, provide architecture-specific configuration options while maintaining sensible defaults. Test your charts on different architectures to ensure compatibility and document multi-arch capabilities clearly.
