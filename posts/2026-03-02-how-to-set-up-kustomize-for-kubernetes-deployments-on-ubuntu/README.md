# How to Set Up Kustomize for Kubernetes Deployments on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kubernetes, Kustomize, DevOps, GitOps

Description: Learn how to install Kustomize on Ubuntu and use it to manage Kubernetes configuration for multiple environments without Helm or templating languages.

---

Kustomize is a configuration management tool for Kubernetes that lets you customize base manifests for different environments without templates or Helm charts. You define a base set of Kubernetes resources, then create overlays for each environment (dev, staging, production) that patch or extend the base configuration. The result is plain Kubernetes YAML, which is easy to review, diff, and audit. This guide covers installing Kustomize on Ubuntu and building a practical multi-environment setup.

## Installing Kustomize on Ubuntu

Kustomize ships as a standalone binary and is also embedded in `kubectl` (via `kubectl kustomize`). Using the standalone binary gives you access to the latest version.

```bash
# Download the latest Kustomize release
KUSTOMIZE_VERSION=$(curl -s https://api.github.com/repos/kubernetes-sigs/kustomize/releases/latest | grep '"tag_name"' | grep 'kustomize' | sed 's/.*kustomize\/v//;s/".*//')
echo "Installing kustomize v${KUSTOMIZE_VERSION}"

curl -LO "https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv${KUSTOMIZE_VERSION}/kustomize_v${KUSTOMIZE_VERSION}_linux_amd64.tar.gz"

# Extract and install
tar -xzf "kustomize_v${KUSTOMIZE_VERSION}_linux_amd64.tar.gz"
sudo mv kustomize /usr/local/bin/
sudo chmod +x /usr/local/bin/kustomize

# Verify installation
kustomize version
```

Alternatively, install a specific version:

```bash
# Install a specific version (e.g., 5.3.0)
curl -LO "https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz"
tar -xzf kustomize_v5.3.0_linux_amd64.tar.gz
sudo mv kustomize /usr/local/bin/
```

## Project Structure

A typical Kustomize project separates base resources from environment-specific overlays:

```
k8s/
  base/
    kustomization.yaml
    deployment.yaml
    service.yaml
    configmap.yaml
  overlays/
    dev/
      kustomization.yaml
      patch-replicas.yaml
    staging/
      kustomization.yaml
      patch-replicas.yaml
      patch-resources.yaml
    production/
      kustomization.yaml
      patch-replicas.yaml
      patch-resources.yaml
      hpa.yaml
```

## Creating the Base Configuration

Start with the base resources that are common across all environments.

```bash
# Create the directory structure
mkdir -p k8s/base k8s/overlays/dev k8s/overlays/staging k8s/overlays/production
```

```yaml
# k8s/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  labels:
    app: myapp
spec:
  # Base replica count - will be overridden by overlays
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          # Image tag is set here; overlays can override it
          image: myapp:latest
          ports:
            - containerPort: 8080
          resources:
            # Conservative defaults; production overlay increases these
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          envFrom:
            - configMapRef:
                name: myapp-config
```

```yaml
# k8s/base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: ClusterIP
```

```yaml
# k8s/base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
data:
  # Default values - overlays will replace these
  LOG_LEVEL: "info"
  DATABASE_POOL_SIZE: "5"
  CACHE_TTL: "300"
```

```yaml
# k8s/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# List all resources in the base
resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml

# Common labels applied to all resources
commonLabels:
  app: myapp
  managed-by: kustomize
```

## Creating Environment Overlays

### Development Overlay

Development typically runs fewer replicas with debug logging:

```yaml
# k8s/overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# Reference the base
resources:
  - ../../base

# Add namespace for dev environment
namespace: myapp-dev

# Override the image tag for dev
images:
  - name: myapp
    newTag: dev-latest

# Apply patches specific to dev
patches:
  - path: patch-config.yaml
    target:
      kind: ConfigMap
      name: myapp-config
  - path: patch-replicas.yaml
    target:
      kind: Deployment
      name: myapp

# Add dev-specific labels
commonLabels:
  environment: dev
```

```yaml
# k8s/overlays/dev/patch-replicas.yaml
# Strategic merge patch to set replica count for dev
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 1  # Single replica in dev
```

```yaml
# k8s/overlays/dev/patch-config.yaml
# Override ConfigMap values for dev
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
data:
  LOG_LEVEL: "debug"    # Verbose logging in dev
  DATABASE_POOL_SIZE: "2"
  CACHE_TTL: "60"       # Short cache TTL for development
```

### Production Overlay

Production gets more replicas, higher resource limits, and an HPA:

```yaml
# k8s/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base
  - hpa.yaml  # Production-only HPA resource

namespace: myapp-production

images:
  - name: myapp
    newTag: "1.2.3"  # Pin to specific version in production

patches:
  - path: patch-replicas.yaml
    target:
      kind: Deployment
      name: myapp
  - path: patch-resources.yaml
    target:
      kind: Deployment
      name: myapp
  - path: patch-config.yaml
    target:
      kind: ConfigMap
      name: myapp-config

commonLabels:
  environment: production
```

```yaml
# k8s/overlays/production/patch-replicas.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3  # Three replicas for availability in production
```

```yaml
# k8s/overlays/production/patch-resources.yaml
# JSON patch to replace resource limits in production
- op: replace
  path: /spec/template/spec/containers/0/resources
  value:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 2000m
      memory: 1Gi
```

```yaml
# k8s/overlays/production/hpa.yaml
# Horizontal Pod Autoscaler - production only
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Building and Applying Configurations

The `kustomize build` command renders the final YAML by merging base and overlay.

```bash
# Preview what will be applied for dev
kustomize build k8s/overlays/dev

# Preview for production
kustomize build k8s/overlays/production

# Apply directly to the cluster
kustomize build k8s/overlays/dev | kubectl apply -f -

# Or use kubectl's built-in kustomize support
kubectl apply -k k8s/overlays/staging

# Dry run to verify without applying
kustomize build k8s/overlays/production | kubectl apply -f - --dry-run=client

# Diff against current cluster state
kustomize build k8s/overlays/production | kubectl diff -f -
```

## Using Secret Generators

Kustomize can generate Secrets and ConfigMaps from files or literals, with automatic content hashing to force pod restarts on changes:

```yaml
# k8s/overlays/staging/kustomization.yaml (partial)
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

# Generate a ConfigMap from a file
configMapGenerator:
  - name: myapp-config
    behavior: merge  # Merge with base ConfigMap
    literals:
      - LOG_LEVEL=warn
      - DATABASE_POOL_SIZE=10
    files:
      - feature-flags.properties  # Load from a file

# Generate a Secret (base64 encoding is handled automatically)
secretGenerator:
  - name: myapp-secrets
    literals:
      - DATABASE_PASSWORD=secretpassword
      - API_KEY=abc123
    # Options control the name suffix hash
    options:
      disableNameSuffixHash: false  # Enable suffix for change detection
```

## Component Reuse

Kustomize components let you create reusable configuration fragments that can be included selectively:

```yaml
# k8s/components/monitoring/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

resources:
  - servicemonitor.yaml  # Prometheus ServiceMonitor

patches:
  - patch: |-
      - op: add
        path: /spec/template/metadata/annotations
        value:
          prometheus.io/scrape: "true"
          prometheus.io/port: "8080"
    target:
      kind: Deployment
```

Include the component in production but not dev:

```yaml
# k8s/overlays/production/kustomization.yaml
resources:
  - ../../base

# Include the monitoring component
components:
  - ../../components/monitoring
```

## Integration with CI/CD

### GitLab CI

```yaml
# .gitlab-ci.yml
deploy-staging:
  stage: deploy
  image: bitnami/kubectl:latest
  before_script:
    - curl -LO "https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz"
    - tar -xzf kustomize_v5.3.0_linux_amd64.tar.gz
    - mv kustomize /usr/local/bin/
  script:
    # Update image tag to current commit
    - cd k8s/overlays/staging
    - kustomize edit set image myapp=myapp:${CI_COMMIT_SHA:0:8}
    - kustomize build . | kubectl apply -f -
    - kubectl rollout status deployment/myapp -n myapp-staging
  only:
    - main
```

Kustomize's plain-YAML approach makes it easy to understand exactly what gets deployed, review changes in pull requests, and maintain a clear audit trail of configuration changes without a templating language getting in the way.
