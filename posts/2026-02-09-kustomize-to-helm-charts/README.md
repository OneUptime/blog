# How to Convert Kustomize Overlays to Helm Charts for Kubernetes Application Packaging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Helm, Kustomize

Description: Learn how to convert Kustomize-based Kubernetes deployments to Helm charts for better templating, versioning, and distribution capabilities across teams and environments.

---

Kustomize provides template-free customization through overlays, while Helm offers templating, versioning, and a package registry. Converting from Kustomize to Helm enables better application distribution, dependency management, and release tracking. This guide shows you how to migrate Kustomize overlays to Helm charts while preserving multi-environment configuration.

## Analyzing Existing Kustomize Structure

Understand your current Kustomize organization before converting.

```bash
#!/bin/bash
# Audit Kustomize structure

echo "=== Kustomize Structure Analysis ==="

# Find all kustomization files
find . -name "kustomization.yaml" -o -name "kustomization.yml"

# Analyze base directory
echo -e "\n=== Base Resources ==="
kubectl kustomize base/ --dry-run=client -o yaml | kubectl get -f - --show-kind --ignore-not-found=true

# Analyze overlays
for OVERLAY in overlays/*; do
  if [ -d "$OVERLAY" ]; then
    echo -e "\n=== Overlay: $OVERLAY ==="
    kubectl kustomize $OVERLAY --dry-run=client -o yaml | grep -E "^kind:|name:" | head -20
  fi
done

echo -e "\n=== Patch Files ==="
find . -name "*.yaml" -path "*/patches/*"

echo -e "\n=== ConfigMap Generators ==="
grep -r "configMapGenerator" . --include="kustomization.yaml"
```

This reveals the structure you need to replicate in Helm.

## Creating Helm Chart from Kustomize Base

Convert the base directory to Helm templates.

```yaml
# Original Kustomize structure:
# base/
#   kustomization.yaml
#   deployment.yaml
#   service.yaml
#   configmap.yaml
# overlays/
#   dev/
#   staging/
#   production/

# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- deployment.yaml
- service.yaml
- configmap.yaml

# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
```

```bash
#!/bin/bash
# Initialize Helm chart

helm create myapp

# Clean default templates
rm -rf myapp/templates/*

# Copy base resources as templates
cp base/*.yaml myapp/templates/

# Note: We'll add templating next
```

Start with the base resources as a foundation.

## Adding Helm Templating

Replace hardcoded values with Helm template expressions.

```yaml
# templates/deployment.yaml (converted from Kustomize base)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
        imagePullPolicy: {{ .Values.image.pullPolicy }}
        ports:
        - name: http
          containerPort: {{ .Values.service.targetPort }}
          protocol: TCP
        env:
        {{- range .Values.env }}
        - name: {{ .name }}
          value: {{ .value | quote }}
        {{- end }}
        resources:
          {{- toYaml .Values.resources | nindent 10 }}
---
# templates/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  type: {{ .Values.service.type }}
  ports:
  - port: {{ .Values.service.port }}
    targetPort: http
    protocol: TCP
    name: http
  selector:
    {{- include "myapp.selectorLabels" . | nindent 4 }}
---
# templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
data:
  {{- range $key, $value := .Values.configData }}
  {{ $key }}: {{ $value | quote }}
  {{- end }}
```

Helm templates provide dynamic value substitution.

## Converting Kustomize Overlays to Values Files

Map each overlay to a Helm values file.

```yaml
# overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
bases:
- ../../base
namePrefix: dev-
namespace: development
replicas:
- name: myapp
  count: 2
images:
- name: myapp
  newTag: dev-latest
configMapGenerator:
- name: app-config
  literals:
  - LOG_LEVEL=debug
  - ENVIRONMENT=development
```

```yaml
# values-dev.yaml (converted from overlay)
nameOverride: ""
fullnameOverride: "dev-myapp"

replicaCount: 2

image:
  repository: myapp
  tag: "dev-latest"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
  targetPort: 8080

configData:
  LOG_LEVEL: "debug"
  ENVIRONMENT: "development"

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

env:
- name: NAMESPACE
  value: "development"
---
# values-staging.yaml
nameOverride: ""
fullnameOverride: "staging-myapp"

replicaCount: 3

image:
  repository: myapp
  tag: "staging-v1.2.0"
  pullPolicy: IfNotPresent

configData:
  LOG_LEVEL: "info"
  ENVIRONMENT: "staging"

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi
---
# values-production.yaml
nameOverride: ""
fullnameOverride: "prod-myapp"

replicaCount: 5

image:
  repository: myapp
  tag: "v1.2.0"
  pullPolicy: IfNotPresent

configData:
  LOG_LEVEL: "warn"
  ENVIRONMENT: "production"

resources:
  limits:
    cpu: 2000m
    memory: 2Gi
  requests:
    cpu: 1000m
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 5
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70
```

Environment-specific values replace Kustomize overlays.

## Converting Kustomize Patches

Translate Kustomize patches to Helm conditionals.

```yaml
# Kustomize strategic merge patch
# overlays/production/patches/deployment-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - myapp
            topologyKey: kubernetes.io/hostname
```

```yaml
# Helm template equivalent
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
spec:
  template:
    spec:
      {{- if .Values.affinity }}
      affinity:
        {{- toYaml .Values.affinity | nindent 8 }}
      {{- end }}
      containers:
      - name: app
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"

# values-production.yaml
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchExpressions:
        - key: app
          operator: In
          values:
          - myapp
      topologyKey: kubernetes.io/hostname
```

Helm conditionals replace Kustomize patches.

## Handling ConfigMap Generators

Convert Kustomize ConfigMap generators to Helm templates.

```yaml
# Kustomize configMapGenerator
configMapGenerator:
- name: app-config
  files:
  - config.properties
  - database.yaml
  literals:
  - LOG_LEVEL=info
```

```yaml
# Helm template
# templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "myapp.fullname" . }}-config
data:
  config.properties: |
{{ .Files.Get "files/config.properties" | indent 4 }}
  database.yaml: |
{{ .Files.Get "files/database.yaml" | indent 4 }}
  LOG_LEVEL: {{ .Values.logLevel | quote }}

# Move files to chart directory
# myapp/
#   files/
#     config.properties
#     database.yaml
```

Helm's `.Files` provides similar functionality to ConfigMap generators.

## Creating Migration Script

Automate the conversion process.

```bash
#!/bin/bash
# kustomize-to-helm.sh

KUSTOMIZE_DIR="$1"
CHART_NAME="$2"

if [ -z "$KUSTOMIZE_DIR" ] || [ -z "$CHART_NAME" ]; then
  echo "Usage: $0 <kustomize-dir> <chart-name>"
  exit 1
fi

echo "Converting Kustomize to Helm chart: $CHART_NAME"

# Create Helm chart
helm create $CHART_NAME
rm -rf $CHART_NAME/templates/*

# Convert base resources
echo "Converting base resources..."
for file in $KUSTOMIZE_DIR/base/*.yaml; do
  filename=$(basename $file)
  echo "  Processing $filename..."

  # Basic conversion: add Helm template syntax
  cat $file | \
    sed 's/name: myapp/name: {{ include "'"$CHART_NAME"'.fullname" . }}/g' | \
    sed 's/replicas: [0-9]*/replicas: {{ .Values.replicaCount }}/g' | \
    sed 's/image: .*/image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"/g' \
    > $CHART_NAME/templates/$filename
done

# Create values files from overlays
for overlay_dir in $KUSTOMIZE_DIR/overlays/*; do
  if [ -d "$overlay_dir" ]; then
    env=$(basename $overlay_dir)
    echo "Creating values-$env.yaml..."

    # Extract values from kustomization
    kubectl kustomize $overlay_dir --dry-run=client -o yaml > /tmp/overlay-$env.yaml

    # Parse and create values file (simplified)
    cat > $CHART_NAME/values-$env.yaml <<EOF
# Generated from Kustomize overlay: $env
replicaCount: $(kubectl kustomize $overlay_dir -o yaml | yq eval 'select(.kind == "Deployment") | .spec.replicas' -)
image:
  repository: $(kubectl kustomize $overlay_dir -o yaml | yq eval 'select(.kind == "Deployment") | .spec.template.spec.containers[0].image' - | cut -d: -f1)
  tag: "$(kubectl kustomize $overlay_dir -o yaml | yq eval 'select(.kind == "Deployment") | .spec.template.spec.containers[0].image' - | cut -d: -f2)"
EOF
  fi
done

echo "Conversion complete. Review and adjust $CHART_NAME/"
```

This script provides a starting point for conversion.

## Testing Helm Chart

Validate the converted chart matches Kustomize output.

```bash
#!/bin/bash
# Test Helm chart against Kustomize

KUSTOMIZE_DIR="overlays/production"
HELM_CHART="myapp"
VALUES_FILE="values-production.yaml"

# Generate Kustomize output
kubectl kustomize $KUSTOMIZE_DIR -o yaml > /tmp/kustomize-output.yaml

# Generate Helm output
helm template $HELM_CHART ./$HELM_CHART -f ./$HELM_CHART/$VALUES_FILE > /tmp/helm-output.yaml

# Compare (accounting for differences in metadata)
echo "=== Comparing Kustomize vs Helm output ==="

# Extract resource types and counts
echo "Kustomize resources:"
cat /tmp/kustomize-output.yaml | yq eval '.kind' - | sort | uniq -c

echo "Helm resources:"
cat /tmp/helm-output.yaml | yq eval '.kind' - | sort | uniq -c

# Detailed diff (may show metadata differences)
diff -u <(kubectl get -f /tmp/kustomize-output.yaml --dry-run=client -o yaml) \
        <(kubectl get -f /tmp/helm-output.yaml --dry-run=client -o yaml) || true

echo "Review differences above"
```

Ensure functional equivalence between Kustomize and Helm outputs.

## Deploying with Helm

Replace Kustomize commands with Helm equivalents.

```bash
#!/bin/bash
# Deploy using Helm instead of Kustomize

# Old Kustomize deployment
# kubectl apply -k overlays/production

# New Helm deployment
helm upgrade --install myapp ./myapp \
  --namespace production \
  --create-namespace \
  --values ./myapp/values-production.yaml \
  --wait \
  --timeout 10m

# View deployed resources
helm list -n production
helm get manifest myapp -n production

# Rollback if needed
# helm rollback myapp -n production
```

Helm provides release management features unavailable in Kustomize.

## Conclusion

Converting from Kustomize to Helm provides better package management and distribution. Analyze your existing Kustomize structure including base resources, overlays, and patches. Create a Helm chart and convert base resources to templates with dynamic value substitution. Map each Kustomize overlay to an environment-specific values file. Convert strategic merge patches to Helm conditionals and template logic. Handle ConfigMap generators using Helm's `.Files` functionality. Create automated conversion scripts for repeatable migrations. Test that Helm templates produce functionally equivalent output to Kustomize. Deploy using Helm's release management features for versioning and rollback capabilities. While Kustomize excels at template-free customization, Helm provides superior distribution, dependency management, and chart repositories for sharing across teams and organizations.
