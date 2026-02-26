# How to Use kubeval and kubeconform to Validate Manifests Before ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Validation, CI/CD

Description: Learn how to use kubeval and kubeconform to validate Kubernetes manifests before ArgoCD syncs them, catching schema errors in your CI pipeline.

---

ArgoCD is great at syncing manifests to your cluster, but it does not validate them deeply before attempting the sync. If your manifests have invalid field names, wrong types, or missing required fields, you will only discover this when the sync fails. kubeval and its successor kubeconform let you catch these errors much earlier - in your CI pipeline or even on your laptop.

This guide covers both tools, when to use each, and how to integrate them into your ArgoCD workflow.

## kubeval vs kubeconform: Which One?

kubeval was the original Kubernetes manifest validation tool. kubeconform is its spiritual successor, built to address kubeval's limitations:

| Feature | kubeval | kubeconform |
|---------|---------|-------------|
| Active development | Archived | Active |
| CRD support | Limited | Full |
| Performance | Good | Better (parallel) |
| Schema sources | Built-in only | Multiple sources |
| Output formats | JSON, TAP | JSON, TAP, JUnit |
| K8s version range | Up to 1.24 | Up to latest |

For new projects, use kubeconform. If you have existing kubeval pipelines, consider migrating.

## Installing kubeconform

```bash
# macOS
brew install kubeconform

# Linux
curl -L https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz | \
  tar xz -C /usr/local/bin/

# Docker
docker run --rm -v $(pwd):/manifests ghcr.io/yannh/kubeconform:latest /manifests/
```

## Basic Manifest Validation

Start with basic validation against the default Kubernetes schemas:

```bash
# Validate a single file
kubeconform deployment.yaml

# Validate a directory recursively
kubeconform -summary apps/

# Specify Kubernetes version
kubeconform -kubernetes-version 1.29.0 apps/

# Get detailed output
kubeconform -verbose -summary apps/
```

Example output for a manifest with errors:

```
apps/my-app/deployment.yaml - Deployment my-app is invalid:
  problem validating against schema for Deployment:
  - spec.template.spec.containers.0.ports.0:
    Additional property "containerPort_typo" is not allowed

Summary: 12 resources found - Valid: 11, Invalid: 1, Errors: 0, Skipped: 0
```

## Validating CRDs (Including ArgoCD Resources)

Kubernetes CRDs like ArgoCD Applications, Argo Rollouts, and Istio VirtualServices are not included in the default schemas. You need additional schema sources:

```bash
# Use the community CRD catalog
kubeconform \
  -kubernetes-version 1.29.0 \
  -schema-location default \
  -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  -summary \
  apps/

# For faster validation, download schemas locally
mkdir -p /tmp/schemas
curl -L 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/argoproj.io/application_v1alpha1.json' \
  -o /tmp/schemas/application_v1alpha1.json

kubeconform \
  -schema-location default \
  -schema-location '/tmp/schemas/{{ .ResourceKind }}_{{ .ResourceAPIVersion }}.json' \
  -summary \
  argocd-apps/
```

## Handling Multi-Document YAML

ArgoCD manifests often use multi-document YAML files (separated by `---`). kubeconform handles these natively:

```yaml
# multi-resource.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: myorg/my-app:v1.0.0
          ports:
            - containerPort: 8080
```

```bash
# Both resources in the file are validated
kubeconform multi-resource.yaml
```

## Validating Helm-Rendered Manifests

ArgoCD renders Helm charts before applying them. You should validate the rendered output, not the raw templates:

```bash
# Render Helm templates and pipe to kubeconform
helm template my-release ./charts/my-app \
  --values values/production.yaml \
  --namespace production \
  --api-versions networking.k8s.io/v1/Ingress | \
  kubeconform \
    -kubernetes-version 1.29.0 \
    -schema-location default \
    -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
    -summary
```

For Helm charts with subcharts:

```bash
# Update dependencies first
helm dependency update ./charts/my-app

# Render including subchart templates
helm template my-release ./charts/my-app \
  --values values/production.yaml \
  --include-crds | \
  kubeconform -kubernetes-version 1.29.0 -summary
```

## Validating Kustomize Output

Similarly, validate the built Kustomize output:

```bash
# Build and validate Kustomize overlay
kustomize build apps/my-app/overlays/production | \
  kubeconform \
    -kubernetes-version 1.29.0 \
    -summary

# With Helm support in Kustomize
kustomize build --enable-helm apps/my-app/overlays/production | \
  kubeconform -kubernetes-version 1.29.0 -summary
```

## CI Pipeline Integration

### GitHub Actions

```yaml
name: Validate Manifests
on:
  pull_request:
    paths:
      - 'apps/**'
      - 'charts/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install kubeconform
        run: |
          curl -L https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz | \
            tar xz -C /usr/local/bin/

      - name: Validate plain manifests
        run: |
          kubeconform \
            -kubernetes-version 1.29.0 \
            -schema-location default \
            -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
            -summary \
            -output json \
            apps/

      - name: Validate Helm charts
        run: |
          for chart_dir in charts/*/; do
            chart_name=$(basename "$chart_dir")
            echo "Validating chart: $chart_name"
            helm template "$chart_name" "$chart_dir" \
              --values "values/${chart_name}/production.yaml" | \
              kubeconform \
                -kubernetes-version 1.29.0 \
                -summary
          done
```

### GitLab CI

```yaml
validate-manifests:
  stage: validate
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
    - curl -L https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz | tar xz -C /usr/local/bin/
  script:
    - kubeconform -kubernetes-version 1.29.0 -summary -output json apps/
  rules:
    - changes:
        - apps/**/*
        - charts/**/*
```

## Handling Validation Exceptions

Some resources might intentionally use features not in the schema, or you might have custom resources without published schemas:

```bash
# Skip unknown resource types instead of failing
kubeconform \
  -kubernetes-version 1.29.0 \
  -skip CustomResourceDefinition \
  -summary \
  apps/

# Ignore specific files
kubeconform \
  -kubernetes-version 1.29.0 \
  -ignore-filename-pattern '.*test.*' \
  -summary \
  apps/

# Strict mode - fail on any unknown fields
kubeconform \
  -kubernetes-version 1.29.0 \
  -strict \
  -summary \
  apps/
```

## Common Validation Errors and Fixes

Here are the most common errors you will catch:

### Wrong API Version

```yaml
# Error: apiVersion networking.k8s.io/v1beta1 is not valid
# Fix: Use the correct API version for your cluster version
apiVersion: networking.k8s.io/v1  # Correct for K8s 1.22+
kind: Ingress
```

### Missing Required Fields

```yaml
# Error: spec.selector is required
# Fix: Add the missing selector
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  selector:          # This was missing
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: myorg/my-app:v1.0.0
```

### Type Mismatches

```yaml
# Error: spec.replicas must be integer
# Fix: Use the correct type
spec:
  replicas: 3       # Correct (integer)
  # replicas: "3"   # Wrong (string)
```

### Unknown Fields

```yaml
# Error: Additional property "containerPort_name" is not allowed
ports:
  - containerPort: 8080  # Correct field name
    name: http           # Correct
    # containerPort_name: http  # Typo - caught by kubeconform
```

## Combining with ArgoCD Diff

After schema validation, use ArgoCD diff for a final check:

```bash
# First pass: schema validation
kubeconform -kubernetes-version 1.29.0 -summary apps/my-app/

# Second pass: ArgoCD diff against live cluster
argocd app diff my-app --local apps/my-app/production/
```

This two-layer approach catches both schema errors and logical differences between your desired and live state.

## Monitoring Validation Results

Track your validation success rate over time. A decreasing pass rate might indicate your team needs better documentation or tooling. Use [OneUptime](https://oneuptime.com) to set up dashboards that track CI pipeline metrics including manifest validation results.

## Conclusion

Manifest validation with kubeconform is a critical safety net in your GitOps workflow. It catches errors that ArgoCD would only discover during sync, shifting failure detection left to your CI pipeline or even your local development environment. Start with basic schema validation, add CRD support, and integrate it into your CI pipeline. The few seconds of validation time save minutes of debugging failed syncs.
