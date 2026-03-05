# How to Customize Flux CD Bootstrap with Patches

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Kustomize, Bootstrap, Patches, DevOps

Description: Learn how to customize your Flux CD bootstrap process using Kustomize patches to modify controller resources, add labels, adjust resource limits, and more.

---

When you bootstrap Flux CD, it generates a set of standard Kubernetes manifests for the Flux controllers. These defaults work well for most environments, but enterprise and production deployments often need customizations such as resource limits, tolerations, node affinity, custom labels, or additional environment variables. Flux CD supports this through Kustomize patches applied during and after the bootstrap process.

## How Flux Bootstrap Works with Kustomize

The `flux bootstrap` command generates a `flux-system` directory in your Git repository containing three files:

- `gotk-components.yaml` - All Flux controller manifests, CRDs, and RBAC
- `gotk-sync.yaml` - The GitRepository and Kustomization resources for self-management
- `kustomization.yaml` - A Kustomize configuration that references the above files

The `kustomization.yaml` file is where you add patches. Flux applies this kustomization to itself, so any patches you add are applied to the Flux controllers on every reconciliation.

## Method 1: Adding Patches After Bootstrap

The simplest approach is to bootstrap Flux first, then add patches to the `kustomization.yaml` file.

### Step 1: Bootstrap Flux Normally

```bash
# Standard Flux bootstrap
export GITHUB_TOKEN=<your-token>
export GITHUB_USER=<your-username>

flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/production \
  --personal
```

### Step 2: Clone the Repository

```bash
# Clone the fleet-infra repository
git clone https://github.com/$GITHUB_USER/fleet-infra.git
cd fleet-infra
```

### Step 3: Add Patches to kustomization.yaml

Edit the `flux-system/kustomization.yaml` file to include your patches.

```yaml
# clusters/production/flux-system/kustomization.yaml
# Kustomization with patches for Flux controllers
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Add resource limits to all Flux controllers
  - target:
      kind: Deployment
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: all
      spec:
        template:
          spec:
            containers:
              - name: manager
                resources:
                  limits:
                    cpu: 1000m
                    memory: 1Gi
                  requests:
                    cpu: 100m
                    memory: 256Mi
```

Commit and push. Flux will apply the patches to its own controllers.

```bash
# Commit and push the patches
git add -A
git commit -m "Add resource limits to Flux controllers"
git push
```

## Common Patch Examples

### Add Resource Limits and Requests

Control the CPU and memory allocated to Flux controllers.

```yaml
# Resource limits patch - applied to all Flux deployments
patches:
  - target:
      kind: Deployment
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: all
      spec:
        template:
          spec:
            containers:
              - name: manager
                resources:
                  limits:
                    cpu: 2000m
                    memory: 2Gi
                  requests:
                    cpu: 200m
                    memory: 512Mi
```

### Add Node Affinity

Schedule Flux controllers on specific nodes, such as infrastructure nodes.

```yaml
# Node affinity patch - run Flux on infrastructure nodes
patches:
  - target:
      kind: Deployment
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: all
      spec:
        template:
          spec:
            affinity:
              nodeAffinity:
                requiredDuringSchedulingIgnoredDuringExecution:
                  nodeSelectorTerms:
                    - matchExpressions:
                        - key: node-role.kubernetes.io/infra
                          operator: Exists
```

### Add Tolerations

Allow Flux controllers to run on tainted nodes.

```yaml
# Tolerations patch - allow scheduling on tainted infrastructure nodes
patches:
  - target:
      kind: Deployment
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: all
      spec:
        template:
          spec:
            tolerations:
              - key: "node-role.kubernetes.io/infra"
                operator: "Exists"
                effect: "NoSchedule"
```

### Add Custom Labels and Annotations

Apply labels for monitoring, cost allocation, or organizational purposes.

```yaml
# Labels patch - add custom labels to all Flux deployments
patches:
  - target:
      kind: Deployment
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: all
        labels:
          team: platform-engineering
          cost-center: infrastructure
      spec:
        template:
          metadata:
            labels:
              team: platform-engineering
            annotations:
              prometheus.io/scrape: "true"
              prometheus.io/port: "8080"
```

### Set Priority Class

Ensure Flux controllers get scheduling priority over regular workloads.

```yaml
# Priority class patch - give Flux controllers high priority
patches:
  - target:
      kind: Deployment
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: all
      spec:
        template:
          spec:
            priorityClassName: system-cluster-critical
```

### Target a Specific Controller

Apply a patch to only one controller instead of all of them.

```yaml
# Patch only the source-controller with extra memory
patches:
  - target:
      kind: Deployment
      name: source-controller
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: source-controller
      spec:
        template:
          spec:
            containers:
              - name: manager
                resources:
                  limits:
                    memory: 4Gi
                  requests:
                    memory: 1Gi
```

### Add Environment Variables

Inject environment variables into controllers, such as proxy settings or custom configuration.

```yaml
# Environment variable patch - add proxy configuration
patches:
  - target:
      kind: Deployment
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: all
      spec:
        template:
          spec:
            containers:
              - name: manager
                env:
                  - name: HTTPS_PROXY
                    value: "http://proxy.corp.example.com:8080"
                  - name: NO_PROXY
                    value: ".cluster.local,.svc,10.0.0.0/8"
```

### Increase Replica Count

Run multiple replicas of controllers for high availability.

```yaml
# Replica count patch - run source-controller with 2 replicas
patches:
  - target:
      kind: Deployment
      name: source-controller
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: source-controller
      spec:
        replicas: 2
```

## Method 2: Using Separate Patch Files

For complex patches, use separate files instead of inline patches.

Create a patch file.

```yaml
# clusters/production/flux-system/resource-limits-patch.yaml
# Separate file for resource limits
apiVersion: apps/v1
kind: Deployment
metadata:
  name: all
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            limits:
              cpu: 1000m
              memory: 1Gi
            requests:
              cpu: 100m
              memory: 256Mi
```

Reference it in the kustomization.

```yaml
# clusters/production/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: resource-limits-patch.yaml
    target:
      kind: Deployment
      namespace: flux-system
```

## Combining Multiple Patches

You can apply multiple patches in a single kustomization. They are applied in order.

```yaml
# clusters/production/flux-system/kustomization.yaml
# Multiple patches applied in sequence
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Resource limits for all controllers
  - path: resource-limits-patch.yaml
    target:
      kind: Deployment
      namespace: flux-system
  # Extra memory for source-controller
  - path: source-controller-memory-patch.yaml
    target:
      kind: Deployment
      name: source-controller
      namespace: flux-system
  # Node affinity for all controllers
  - target:
      kind: Deployment
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: all
      spec:
        template:
          spec:
            tolerations:
              - key: "dedicated"
                value: "flux"
                effect: "NoSchedule"
```

## Verifying Patches Were Applied

After pushing your patches, verify they were applied correctly.

```bash
# Force Flux to reconcile and apply patches
flux reconcile kustomization flux-system --with-source

# Check the deployment to verify patches are applied
kubectl get deployment source-controller -n flux-system -o yaml | grep -A 10 resources

# Verify labels were applied
kubectl get deployments -n flux-system --show-labels

# Check tolerations
kubectl get deployment -n flux-system source-controller -o jsonpath='{.spec.template.spec.tolerations}'
```

## Important Considerations

- **Bootstrap idempotency**: Running `flux bootstrap` again will regenerate `gotk-components.yaml` and `gotk-sync.yaml`, but it will not overwrite your `kustomization.yaml` patches. Your customizations are preserved across upgrades.
- **Patch ordering**: Kustomize applies patches in the order they appear. If two patches modify the same field, the last one wins.
- **Testing patches locally**: Before pushing, test your kustomization locally to catch syntax errors.

```bash
# Test the kustomization locally before pushing
cd clusters/production/flux-system
kustomize build . > /dev/null && echo "Kustomization is valid" || echo "Kustomization has errors"
```

- **Strategic merge vs JSON patches**: The examples above use strategic merge patches (the default). For more precise control, use JSON 6902 patches with the `op`, `path`, and `value` syntax.

## Conclusion

Kustomize patches give you full control over Flux CD controller configurations without modifying the generated manifests directly. This approach is maintainable across upgrades since your patches are separate from the auto-generated `gotk-components.yaml`. Whether you need resource limits, node affinity, proxy settings, or custom labels, patches let you tailor Flux CD to your environment while keeping the base installation standard.
