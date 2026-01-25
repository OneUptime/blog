# How to Pass Dynamic Values to Kubernetes YAML Manifests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, YAML, Helm, Kustomize, Configuration

Description: Learn how to inject dynamic values into Kubernetes YAML manifests. This guide covers environment variables, Helm templates, Kustomize overlays, and envsubst for variable substitution.

---

Kubernetes YAML manifests are static files, but real deployments need dynamic values: environment-specific configurations, version numbers, secrets, and resource limits. This guide covers multiple approaches to inject dynamic values into your manifests.

## Method 1: envsubst (Simple Variable Substitution)

The simplest approach uses `envsubst` to replace environment variables in YAML:

```yaml
# deployment.template.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${APP_NAME}
  namespace: ${NAMESPACE}
spec:
  replicas: ${REPLICAS}
  selector:
    matchLabels:
      app: ${APP_NAME}
  template:
    metadata:
      labels:
        app: ${APP_NAME}
    spec:
      containers:
      - name: ${APP_NAME}
        image: ${IMAGE_REPO}:${IMAGE_TAG}
        resources:
          limits:
            memory: ${MEMORY_LIMIT}
            cpu: ${CPU_LIMIT}
```

Apply with environment variables:

```bash
# Set variables
export APP_NAME=web-api
export NAMESPACE=production
export REPLICAS=3
export IMAGE_REPO=myregistry/web-api
export IMAGE_TAG=v1.2.3
export MEMORY_LIMIT=256Mi
export CPU_LIMIT=500m

# Substitute and apply
envsubst < deployment.template.yaml | kubectl apply -f -

# Or save the rendered manifest
envsubst < deployment.template.yaml > deployment.yaml
kubectl apply -f deployment.yaml
```

For selective substitution (only specific variables):

```bash
# Only substitute APP_NAME and IMAGE_TAG, leave others as-is
envsubst '${APP_NAME} ${IMAGE_TAG}' < deployment.template.yaml | kubectl apply -f -
```

## Method 2: Helm Templates

Helm is the standard tool for templating Kubernetes manifests:

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-{{ .Chart.Name }}
  namespace: {{ .Values.namespace }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicas }}
  selector:
    matchLabels:
      app: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app: {{ .Release.Name }}
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        {{- if .Values.resources }}
        resources:
          {{- toYaml .Values.resources | nindent 10 }}
        {{- end }}
        env:
        {{- range $key, $value := .Values.env }}
        - name: {{ $key }}
          value: {{ $value | quote }}
        {{- end }}
```

Values file:

```yaml
# values.yaml
namespace: default
replicas: 2

image:
  repository: myregistry/web-api
  tag: v1.2.3

resources:
  limits:
    memory: 256Mi
    cpu: 500m
  requests:
    memory: 128Mi
    cpu: 250m

env:
  LOG_LEVEL: info
  DATABASE_URL: postgres://db:5432/app
```

Install or upgrade:

```bash
# Install with custom values
helm install myapp ./mychart -f values.yaml

# Override specific values
helm install myapp ./mychart \
  --set image.tag=v1.2.4 \
  --set replicas=5

# Preview rendered templates
helm template myapp ./mychart -f values.yaml
```

## Method 3: Kustomize Overlays

Kustomize patches base manifests without templating:

```
myapp/
├── base/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   └── service.yaml
└── overlays/
    ├── dev/
    │   ├── kustomization.yaml
    │   └── replica-patch.yaml
    └── prod/
        ├── kustomization.yaml
        └── replica-patch.yaml
```

Base deployment:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web-api
  template:
    metadata:
      labels:
        app: web-api
    spec:
      containers:
      - name: web-api
        image: myregistry/web-api:latest
```

Base kustomization:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- deployment.yaml
- service.yaml
```

Production overlay:

```yaml
# overlays/prod/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../../base
namespace: production
namePrefix: prod-
images:
- name: myregistry/web-api
  newTag: v1.2.3
patches:
- path: replica-patch.yaml
```

```yaml
# overlays/prod/replica-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
spec:
  replicas: 5
```

Apply with kustomize:

```bash
# Preview
kubectl kustomize overlays/prod

# Apply
kubectl apply -k overlays/prod
```

## Method 4: sed/awk for Simple Replacements

Quick and dirty for CI/CD pipelines:

```bash
# Replace image tag
sed -i "s|image: myregistry/web-api:.*|image: myregistry/web-api:${IMAGE_TAG}|g" deployment.yaml

# Replace with awk
awk -v tag="$IMAGE_TAG" '{gsub(/image: myregistry\/web-api:.*/, "image: myregistry/web-api:"tag)}1' deployment.yaml
```

## Method 5: yq for YAML-Aware Editing

`yq` understands YAML structure for safer editing:

```bash
# Install yq (https://github.com/mikefarah/yq)

# Update image tag
yq -i '.spec.template.spec.containers[0].image = "myregistry/web-api:v1.2.3"' deployment.yaml

# Update replicas
yq -i '.spec.replicas = 5' deployment.yaml

# Add or update environment variable
yq -i '.spec.template.spec.containers[0].env += {"name": "LOG_LEVEL", "value": "debug"}' deployment.yaml

# Use environment variable
export NEW_TAG=v1.2.3
yq -i '.spec.template.spec.containers[0].image = "myregistry/web-api:" + env(NEW_TAG)' deployment.yaml
```

## Method 6: ConfigMap and Secret References

Let pods read dynamic values at runtime instead of build time:

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  LOG_LEVEL: info
  API_ENDPOINT: https://api.example.com
---
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
spec:
  template:
    spec:
      containers:
      - name: web-api
        image: myregistry/web-api:v1.2.3
        envFrom:
        - configMapRef:
            name: app-config
```

Update ConfigMap, then restart pods:

```bash
# Update ConfigMap
kubectl create configmap app-config \
  --from-literal=LOG_LEVEL=debug \
  --from-literal=API_ENDPOINT=https://api.staging.example.com \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart deployment to pick up changes
kubectl rollout restart deployment/web-api
```

## Comparison of Methods

| Method | Best For | Pros | Cons |
|--------|----------|------|------|
| envsubst | Simple CI/CD | No dependencies | No logic, no loops |
| Helm | Complex apps | Full templating, charts | Learning curve |
| Kustomize | Environment overlays | Built into kubectl | Verbose patches |
| yq | One-off edits | YAML-aware | Manual scripting |
| ConfigMaps | Runtime config | No redeploy | Pod restart needed |

## CI/CD Pipeline Example

Here is a GitLab CI example combining methods:

```yaml
# .gitlab-ci.yml
variables:
  IMAGE_TAG: $CI_COMMIT_SHORT_SHA

stages:
  - build
  - deploy

build:
  stage: build
  script:
    - docker build -t myregistry/web-api:$IMAGE_TAG .
    - docker push myregistry/web-api:$IMAGE_TAG

deploy-staging:
  stage: deploy
  script:
    # Method 1: envsubst
    - export NAMESPACE=staging REPLICAS=2
    - envsubst < k8s/deployment.template.yaml | kubectl apply -f -

deploy-production:
  stage: deploy
  script:
    # Method 2: Kustomize with image override
    - cd k8s/overlays/prod
    - kustomize edit set image myregistry/web-api:$IMAGE_TAG
    - kubectl apply -k .
```

## Summary

There is no single best way to inject dynamic values into Kubernetes manifests. Use `envsubst` for simple variable substitution in CI/CD. Use Helm for complex applications with many configurable options. Use Kustomize for environment-specific overlays without templating complexity. Use yq for programmatic YAML editing. Use ConfigMaps and Secrets when values should change at runtime without redeploying. Choose based on your team's needs and complexity level.
