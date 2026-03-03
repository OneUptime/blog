# How to Set Up Kustomize on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kustomize, Kubernetes, Configuration Management, GitOps

Description: Step-by-step guide to setting up and using Kustomize for managing Kubernetes manifests on a Talos Linux cluster.

---

Kustomize is a Kubernetes-native configuration management tool that lets you customize YAML manifests without using templates. Unlike Helm, which relies on Go templates, Kustomize works by layering patches and transformations on top of base manifests. It is built directly into kubectl, which makes it a zero-dependency option for managing deployments on your Talos Linux cluster.

This guide covers installing Kustomize, structuring your project, and building configurations specifically for Talos Linux environments.

## Why Kustomize on Talos Linux?

Talos Linux clusters are often managed with a GitOps approach, and Kustomize fits naturally into that workflow. Since Talos itself is configured declaratively through machine configs, using Kustomize for your workloads keeps the entire stack consistent. You declare what you want, and the tooling makes it happen.

Kustomize is also a good fit when you prefer working with plain Kubernetes YAML rather than parameterized templates.

## Installing Kustomize

Kustomize is built into kubectl (version 1.14 and later), so you may already have it:

```bash
# Use Kustomize through kubectl
kubectl kustomize --help

# Check your kubectl version
kubectl version --client
```

For the standalone binary, which often has newer features:

### On macOS

```bash
# Install via Homebrew
brew install kustomize

# Verify installation
kustomize version
```

### On Linux

```bash
# Download and install the latest release
curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash

# Move to a directory in your PATH
sudo mv kustomize /usr/local/bin/

# Verify installation
kustomize version
```

## Understanding Kustomize Structure

A Kustomize project is organized around bases and overlays. The base contains your core manifests, and overlays modify them for specific environments.

Here is a typical directory structure:

```
my-app/
  base/
    kustomization.yaml
    deployment.yaml
    service.yaml
    configmap.yaml
  overlays/
    staging/
      kustomization.yaml
      replica-patch.yaml
    production/
      kustomization.yaml
      replica-patch.yaml
      resource-patch.yaml
```

## Creating a Base Configuration

Start by writing your base Kubernetes manifests:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  replicas: 1
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
          image: myapp:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi
```

```yaml
# base/service.yaml
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
  type: ClusterIP
```

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml

commonLabels:
  managed-by: kustomize
```

## Building and Applying the Base

With your base in place, you can build and apply it:

```bash
# Preview the generated manifests
kustomize build base/

# Or use kubectl directly
kubectl kustomize base/

# Apply to your Talos Linux cluster
kubectl apply -k base/
```

The `-k` flag tells kubectl to process the directory with Kustomize before applying.

## Working with ConfigMaps and Secrets

Kustomize can generate ConfigMaps and Secrets from files or literal values:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml

configMapGenerator:
  - name: app-config
    literals:
      - DATABASE_HOST=postgres.databases.svc.cluster.local
      - DATABASE_PORT=5432
      - LOG_LEVEL=info

secretGenerator:
  - name: app-secrets
    literals:
      - DATABASE_PASSWORD=changeme
      - API_KEY=my-secret-key
    type: Opaque
```

Kustomize appends a hash suffix to generated ConfigMap and Secret names, which triggers a rolling update when values change. This is an important behavior to understand because it ensures your pods always pick up the latest configuration.

## Adding Namespace and Common Labels

Kustomize can add a namespace and common labels to all resources:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: my-app-namespace

commonLabels:
  app.kubernetes.io/name: my-app
  app.kubernetes.io/managed-by: kustomize
  environment: base

commonAnnotations:
  team: platform-engineering

resources:
  - deployment.yaml
  - service.yaml
```

## Using Kustomize with Talos-Specific Resources

When deploying to Talos Linux, you often need to include storage classes, network policies, or other cluster-level resources:

```yaml
# base/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: my-app-network-policy
spec:
  podSelector:
    matchLabels:
      app: my-app
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - port: 8080
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: databases
      ports:
        - port: 5432
```

Add it to your kustomization:

```yaml
# base/kustomization.yaml
resources:
  - deployment.yaml
  - service.yaml
  - network-policy.yaml
```

## Image Transformations

Kustomize can change image references without editing the original manifests:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml

images:
  - name: myapp
    newName: registry.example.com/myapp
    newTag: v1.5.2
```

This is particularly useful for CI/CD pipelines where you want to update image tags without modifying base manifests.

## Validating Your Kustomize Output

Before deploying to your Talos cluster, always validate the output:

```bash
# Build and check the output
kustomize build base/ | kubectl apply --dry-run=client -f -

# Build and validate against the cluster API
kustomize build base/ | kubectl apply --dry-run=server -f -

# Check for YAML syntax errors
kustomize build base/ | kubeval -
```

## Integrating with GitOps Tools

Kustomize integrates naturally with GitOps tools like Flux and ArgoCD, both of which work well on Talos Linux:

```yaml
# Flux Kustomization resource
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  path: ./overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: my-repo
  targetNamespace: my-app
```

```yaml
# ArgoCD Application using Kustomize
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/my-app.git
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
```

## Summary

Kustomize provides a template-free approach to managing Kubernetes manifests on Talos Linux. By working with plain YAML and applying transformations through patches, you avoid the complexity of templating languages while still getting environment-specific customization. The tool is built into kubectl, so there is nothing extra to install on your workstation. For Talos Linux clusters, Kustomize pairs well with GitOps workflows and gives you a clean, auditable way to manage your application configurations.
