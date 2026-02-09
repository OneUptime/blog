# How to Use Helm Post-Renderer Hooks to Apply Kustomize Patches to Rendered Manifests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, Kustomize

Description: Learn how to use Helm post-renderer hooks to apply Kustomize patches and transformations to rendered manifests, combining the strengths of both tools.

---

Helm post-renderers modify manifests after template rendering but before applying them to the cluster. This hook mechanism allows you to use Kustomize to patch Helm charts without forking them. You get Helm's package management plus Kustomize's powerful patching capabilities.

## Understanding Post-Renderer Hooks

When Helm renders templates, it generates Kubernetes manifests. Post-renderers intercept these manifests, transform them, and return the modified version. Helm then applies the transformed manifests to the cluster.

The post-renderer runs as an executable that receives manifests on stdin and outputs modified manifests on stdout. This simple interface allows integration with any tool that can process YAML.

## Setting Up a Basic Kustomize Post-Renderer

Create a shell script that pipes Helm output through Kustomize.

```bash
#!/bin/bash
# scripts/kustomize-post-renderer.sh

# Create temporary directory for kustomization
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Read Helm rendered manifests from stdin
cat > "$TEMP_DIR/resources.yaml"

# Create kustomization.yaml
cat > "$TEMP_DIR/kustomization.yaml" << 'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - resources.yaml

# Add common labels to all resources
commonLabels:
  managed-by: helm-kustomize
  environment: production

# Add namespace to all resources
namespace: ${NAMESPACE:-default}

# Strategic merge patches
patchesStrategicMerge:
  - patches/add-monitoring.yaml
  - patches/security-context.yaml

# JSON6902 patches for precise modifications
patchesJson6902:
  - target:
      group: apps
      version: v1
      kind: Deployment
      name: ".*"
    patch: |-
      - op: add
        path: /spec/template/spec/securityContext
        value:
          runAsNonRoot: true
          runAsUser: 1000
EOF

# Create patches directory
mkdir -p "$TEMP_DIR/patches"

# Create monitoring patch
cat > "$TEMP_DIR/patches/add-monitoring.yaml" << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: not-important
spec:
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: /metrics
EOF

# Create security context patch
cat > "$TEMP_DIR/patches/security-context.yaml" << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: not-important
spec:
  template:
    spec:
      securityContext:
        fsGroup: 2000
      containers:
      - name: not-important
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
EOF

# Run kustomize and output to stdout
kustomize build "$TEMP_DIR"
```

Make the script executable.

```bash
chmod +x scripts/kustomize-post-renderer.sh
```

Use the post-renderer during Helm installation.

```bash
# Install with post-renderer
helm install myapp ./mychart \
  --post-renderer ./scripts/kustomize-post-renderer.sh \
  --namespace production

# Upgrade with post-renderer
helm upgrade myapp ./mychart \
  --post-renderer ./scripts/kustomize-post-renderer.sh \
  --namespace production
```

## Creating Reusable Post-Renderer Configurations

Build a more flexible post-renderer that accepts configuration.

```bash
#!/bin/bash
# scripts/kustomize-renderer.sh

set -e

# Configuration
KUSTOMIZE_DIR=${KUSTOMIZE_DIR:-./kustomize}
NAMESPACE=${NAMESPACE:-default}
ENVIRONMENT=${ENVIRONMENT:-production}

TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Save stdin to file
cat > "$TEMP_DIR/resources.yaml"

# Copy kustomize configuration
cp -r "$KUSTOMIZE_DIR"/* "$TEMP_DIR/" 2>/dev/null || true

# Create or update kustomization.yaml
cat > "$TEMP_DIR/kustomization.yaml" << EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - resources.yaml

namespace: $NAMESPACE

commonLabels:
  environment: $ENVIRONMENT
  managed-by: helm

# Include environment-specific patches
patchesStrategicMerge:
EOF

# Add environment-specific patches if they exist
for patch in "$KUSTOMIZE_DIR/patches/$ENVIRONMENT"/*.yaml; do
  if [ -f "$patch" ]; then
    cp "$patch" "$TEMP_DIR/"
    echo "  - $(basename $patch)" >> "$TEMP_DIR/kustomization.yaml"
  fi
done

# Run kustomize
kustomize build "$TEMP_DIR"
```

Organize your kustomize patches by environment.

```
kustomize/
├── patches/
│   ├── production/
│   │   ├── resources.yaml
│   │   ├── replicas.yaml
│   │   └── monitoring.yaml
│   ├── staging/
│   │   ├── resources.yaml
│   │   └── debug.yaml
│   └── development/
│       ├── resources.yaml
│       └── debug-verbose.yaml
└── transformers/
    └── namespace.yaml
```

Example production patch that increases resources.

```yaml
# kustomize/patches/production/resources.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: not-important
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: not-important
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

Use environment-specific patches.

```bash
# Deploy to production
ENVIRONMENT=production \
KUSTOMIZE_DIR=./kustomize \
helm upgrade --install myapp ./mychart \
  --post-renderer ./scripts/kustomize-renderer.sh

# Deploy to staging
ENVIRONMENT=staging \
KUSTOMIZE_DIR=./kustomize \
helm upgrade --install myapp ./mychart \
  --post-renderer ./scripts/kustomize-renderer.sh
```

## Advanced JSON Patches

Apply precise modifications using JSON6902 patches.

```yaml
# kustomize/patches/production/precise-patches.yaml
- target:
    group: apps
    version: v1
    kind: Deployment
  patch: |-
    - op: add
      path: /spec/template/spec/containers/0/env/-
      value:
        name: ENVIRONMENT
        value: production
    - op: replace
      path: /spec/strategy/type
      value: RollingUpdate
    - op: add
      path: /spec/strategy/rollingUpdate
      value:
        maxSurge: 1
        maxUnavailable: 0

- target:
    version: v1
    kind: Service
  patch: |-
    - op: add
      path: /metadata/annotations
      value:
        service.beta.kubernetes.io/aws-load-balancer-type: nlb
        service.beta.kubernetes.io/aws-load-balancer-internal: "true"
```

Reference these patches in kustomization.yaml.

```yaml
# kustomization.yaml
patchesJson6902:
  - path: patches/production/precise-patches.yaml
```

## Combining Multiple Transformation Layers

Stack multiple Kustomize transformations for complex scenarios.

```bash
#!/bin/bash
# scripts/multi-layer-renderer.sh

set -e

TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Read Helm output
cat > "$TEMP_DIR/helm-output.yaml"

# Layer 1: Base transformations
cat > "$TEMP_DIR/layer1/kustomization.yaml" << 'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../helm-output.yaml

# Add common annotations
commonAnnotations:
  managed-by: helm-kustomize
  deployment-date: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Prefix resources
namePrefix: prod-
EOF

# Layer 2: Security policies
mkdir -p "$TEMP_DIR/layer2"
cat > "$TEMP_DIR/layer2/kustomization.yaml" << 'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../layer1

patchesStrategicMerge:
  - security-patch.yaml
EOF

cat > "$TEMP_DIR/layer2/security-patch.yaml" << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: not-important
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: not-important
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
EOF

# Layer 3: Monitoring and observability
mkdir -p "$TEMP_DIR/layer3"
cat > "$TEMP_DIR/layer3/kustomization.yaml" << 'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../layer2

patchesStrategicMerge:
  - monitoring-patch.yaml
EOF

cat > "$TEMP_DIR/layer3/monitoring-patch.yaml" << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: not-important
spec:
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
    spec:
      containers:
      - name: not-important
        env:
        - name: ENABLE_METRICS
          value: "true"
        - name: METRICS_PORT
          value: "8080"
EOF

# Build final output
kustomize build "$TEMP_DIR/layer3"
```

## Integrating with ConfigMap Generators

Generate ConfigMaps from files using Kustomize.

```bash
#!/bin/bash
# scripts/configmap-renderer.sh

TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

cat > "$TEMP_DIR/resources.yaml"

# Create application config files
mkdir -p "$TEMP_DIR/configs"
cat > "$TEMP_DIR/configs/app.conf" << 'EOF'
server.port=8080
server.threads=10
cache.enabled=true
cache.ttl=3600
EOF

cat > "$TEMP_DIR/configs/logging.conf" << 'EOF'
log.level=info
log.format=json
log.output=stdout
EOF

# Kustomization with ConfigMap generator
cat > "$TEMP_DIR/kustomization.yaml" << 'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - resources.yaml

configMapGenerator:
  - name: app-config
    files:
      - configs/app.conf
      - configs/logging.conf
    options:
      labels:
        app: myapp
      annotations:
        config-version: "1.0"

generatorOptions:
  disableNameSuffixHash: false
EOF

kustomize build "$TEMP_DIR"
```

## Testing Post-Renderers Locally

Verify post-renderer behavior before deploying.

```bash
#!/bin/bash
# scripts/test-renderer.sh

set -e

CHART=$1
POST_RENDERER=$2

echo "Testing post-renderer: $POST_RENDERER"
echo "Chart: $CHART"

# Generate Helm template output
echo "Generating Helm templates..."
helm template test-release $CHART > /tmp/helm-output.yaml

echo "Original manifest line count: $(wc -l < /tmp/helm-output.yaml)"

# Apply post-renderer
echo "Applying post-renderer..."
cat /tmp/helm-output.yaml | $POST_RENDERER > /tmp/rendered-output.yaml

echo "Post-rendered manifest line count: $(wc -l < /tmp/rendered-output.yaml)"

# Validate output
echo "Validating Kubernetes manifests..."
kubectl apply --dry-run=client -f /tmp/rendered-output.yaml

echo "Post-renderer test completed successfully"

# Show diff
echo "Changes made by post-renderer:"
diff -u /tmp/helm-output.yaml /tmp/rendered-output.yaml || true
```

Run the test.

```bash
./scripts/test-renderer.sh ./mychart ./scripts/kustomize-post-renderer.sh
```

## CI/CD Integration

Use post-renderers in automated pipelines.

```yaml
# .github/workflows/deploy.yaml
name: Deploy with Kustomize Post-Renderer

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Install Kustomize
        run: |
          curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
          sudo mv kustomize /usr/local/bin/

      - name: Install Helm
        uses: azure/setup-helm@v3

      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG }}

      - name: Make post-renderer executable
        run: chmod +x ./scripts/kustomize-post-renderer.sh

      - name: Deploy with post-renderer
        env:
          ENVIRONMENT: production
          KUSTOMIZE_DIR: ./kustomize
        run: |
          helm upgrade --install myapp ./charts/myapp \
            --namespace production \
            --create-namespace \
            --post-renderer ./scripts/kustomize-post-renderer.sh \
            --wait
```

## Debugging Post-Renderer Issues

Add logging to troubleshoot problems.

```bash
#!/bin/bash
# scripts/debug-renderer.sh

set -e

LOG_FILE="/tmp/post-renderer-debug.log"
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "=== Post-renderer execution started at $(date) ===" >> "$LOG_FILE"

# Save input
tee "$TEMP_DIR/input.yaml" | tee -a "$LOG_FILE" > "$TEMP_DIR/resources.yaml"

echo "Input saved, creating kustomization..." >> "$LOG_FILE"

# Create kustomization
cat > "$TEMP_DIR/kustomization.yaml" << 'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - resources.yaml
EOF

echo "Running kustomize build..." >> "$LOG_FILE"

# Run kustomize and capture output
if OUTPUT=$(kustomize build "$TEMP_DIR" 2>&1); then
  echo "Kustomize build successful" >> "$LOG_FILE"
  echo "$OUTPUT" | tee -a "$LOG_FILE"
else
  echo "Kustomize build failed!" >> "$LOG_FILE"
  echo "$OUTPUT" >> "$LOG_FILE"
  exit 1
fi

echo "=== Post-renderer execution completed ===" >> "$LOG_FILE"
```

Post-renderer hooks let you combine Helm's packaging with Kustomize's patching capabilities. Use them to add organization-wide policies, inject environment-specific configuration, and apply security controls without modifying upstream charts. Build reusable post-renderer scripts that work across different charts and environments, and test them thoroughly before production deployment.
