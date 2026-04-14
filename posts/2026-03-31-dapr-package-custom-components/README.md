# How to Package Custom Dapr Components for Distribution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Packaging, Docker, Helm, Custom Component

Description: Learn how to package a custom Dapr pluggable component as a Docker image and Helm chart for reproducible distribution and Kubernetes deployment.

---

## Packaging Strategy for Pluggable Components

A custom Dapr pluggable component is a standalone process. Packaging it as a Docker image and distributing it via a Helm chart makes deployment reproducible and version-controlled. Consumers reference the image in their deployment and mount a shared volume for the Unix socket.

## Building a Minimal Docker Image

Use a multi-stage build to keep the image small:

```dockerfile
# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /custom-state-store ./cmd/component

# Runtime stage
FROM gcr.io/distroless/static-debian12

COPY --from=builder /custom-state-store /custom-state-store

USER nonroot:nonroot
ENTRYPOINT ["/custom-state-store"]
```

Build and push:

```bash
docker build -t myorg/dapr-custom-state:v1.0.0 .
docker push myorg/dapr-custom-state:v1.0.0
```

## Creating a Helm Chart

Initialize the chart structure:

```bash
helm create dapr-custom-state
# Remove unnecessary templates
rm -rf dapr-custom-state/templates/ingress.yaml
rm -rf dapr-custom-state/templates/hpa.yaml
```

The main template injects the component as a sidecar container:

```yaml
# templates/component-sidecar.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "dapr-custom-state.fullname" . }}-patch
data:
  patch.yaml: |
    spec:
      template:
        spec:
          volumes:
          - name: dapr-unix-domain-socket
            emptyDir: {}
          containers:
          - name: custom-state-store
            image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
            imagePullPolicy: {{ .Values.image.pullPolicy }}
            volumeMounts:
            - name: dapr-unix-domain-socket
              mountPath: /tmp/dapr-components-sockets
```

Define default values:

```yaml
# values.yaml
image:
  repository: myorg/dapr-custom-state
  tag: v1.0.0
  pullPolicy: IfNotPresent

component:
  socketFolder: /tmp/dapr-components-sockets
  config:
    connectionString: ""
    maxConnections: "10"
```

## Dapr Component YAML Template

Include the Dapr Component resource in the chart:

```yaml
# templates/dapr-component.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: {{ .Values.component.name | default "custom-state" }}
  namespace: {{ .Release.Namespace }}
spec:
  type: state.{{ .Values.component.name | default "custom-state" }}
  version: v1
  metadata:
  - name: socketFolder
    value: {{ .Values.component.socketFolder | quote }}
  {{- if .Values.component.config.connectionString }}
  - name: connectionString
    secretKeyRef:
      name: {{ include "dapr-custom-state.fullname" . }}-secret
      key: connectionString
  {{- end }}
```

## Secret for Sensitive Metadata

If the component requires a connection string or other secrets, include a Secret template:

```yaml
# templates/secret.yaml
{{- if .Values.component.config.connectionString }}
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "dapr-custom-state.fullname" . }}-secret
type: Opaque
stringData:
  connectionString: {{ .Values.component.config.connectionString | quote }}
{{- end }}
```

## Publishing to Helm OCI Registry

```bash
# Package the chart
helm package ./dapr-custom-state --version 1.0.0

# Push to OCI registry
helm push dapr-custom-state-1.0.0.tgz oci://registry.myorg.com/helm-charts
```

## Installing the Component

```bash
helm install my-custom-state \
  oci://registry.myorg.com/helm-charts/dapr-custom-state \
  --version 1.0.0 \
  --set component.config.connectionString="host=db port=5432 user=app"
```

## Summary

Packaging a custom Dapr pluggable component as a distroless Docker image minimizes attack surface and image size. A Helm chart that includes both the container sidecar configuration and the Dapr Component YAML makes deployment declarative and repeatable. Publishing the chart to an OCI registry enables versioned distribution that teams can pin and upgrade independently.
