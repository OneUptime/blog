# How to configure Kustomize with Flux for automated reconciliation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, Flux, GitOps

Description: Learn how to integrate Kustomize with Flux CD for continuous GitOps reconciliation enabling automated deployments and self-healing Kubernetes infrastructure.

---

Flux CD provides automated GitOps workflows that continuously reconcile your Kubernetes clusters with configurations stored in Git. Combined with Kustomize, Flux creates a powerful platform where infrastructure changes deploy automatically and clusters self-heal when drift occurs. This integration eliminates manual deployment processes while maintaining strict control through Git-based approvals.

The Flux and Kustomize combination works particularly well for organizations managing multiple clusters or environments. Flux handles the complexity of continuous synchronization while Kustomize manages environment-specific configurations through overlays and patches.

## Installing Flux with Kustomize support

Bootstrap Flux in your cluster with Kustomize enabled:

```bash
flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --personal
```

This creates a Git repository with Flux components and configures your cluster to track that repository. Flux automatically applies changes committed to the repository.

## Creating a basic Kustomization resource

Flux uses Kustomization custom resources to track and apply configurations:

```yaml
# flux-system/apps-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  validation: client
  timeout: 2m
```

Flux checks the repository every 5 minutes and applies changes. The prune setting removes resources deleted from Git.

## Structuring repositories for Flux

Organize your repository to support Flux's reconciliation model:

```
fleet-infra/
├── clusters/
│   ├── production/
│   │   ├── flux-system/
│   │   │   ├── gotk-components.yaml
│   │   │   └── kustomization.yaml
│   │   ├── infrastructure.yaml
│   │   └── apps.yaml
│   └── staging/
│       └── ...
├── infrastructure/
│   ├── controllers/
│   └── configs/
└── apps/
    ├── webapp/
    │   ├── base/
    │   │   ├── kustomization.yaml
    │   │   ├── deployment.yaml
    │   │   └── service.yaml
    │   └── overlays/
    │       ├── production/
    │       └── staging/
    └── api/
        └── ...
```

Each cluster directory contains Kustomization resources pointing to different parts of the repository. This separation enables different reconciliation policies for infrastructure vs applications.

## Layered Kustomizations for dependencies

Create dependencies between Kustomizations to control deployment order:

```yaml
# clusters/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  dependsOn:
  - name: infrastructure
  interval: 5m
  path: ./apps/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

The apps Kustomization waits for infrastructure to be ready before deploying. This ensures controllers and CRDs exist before applications that depend on them.

## Health checks and status conditions

Configure health assessments for deployed resources:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: webapp
spec:
  interval: 5m
  path: ./apps/webapp/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
  - apiVersion: apps/v1
    kind: Deployment
    name: webapp
    namespace: production
  - apiVersion: v1
    kind: Service
    name: webapp
    namespace: production
  timeout: 5m
```

Flux monitors specified resources and reports overall health status. If health checks fail, the Kustomization shows as not ready.

## Variable substitution in Kustomizations

Inject cluster-specific values using Flux variable substitution:

```yaml
# clusters/production/vars.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-vars
  namespace: flux-system
data:
  cluster_name: prod-us-east-1
  cluster_region: us-east-1
  environment: production
```

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
spec:
  interval: 5m
  path: ./apps/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      cluster_name: "${cluster_name}"
      environment: "${environment}"
    substituteFrom:
    - kind: ConfigMap
      name: cluster-vars
```

Your Kustomize resources can reference these variables:

```yaml
# apps/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

commonAnnotations:
  cluster: ${cluster_name}
  environment: ${environment}
```

Flux performs substitution before applying resources, enabling dynamic configurations.

## Decrypting secrets with SOPS

Integrate sealed secrets using Mozilla SOPS:

```bash
# Create encrypted secret
sops --encrypt --age age1... secret.yaml > secret.enc.yaml
```

```yaml
# Kustomization with decryption
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
spec:
  interval: 5m
  path: ./apps/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

Flux decrypts secrets automatically before applying them to the cluster. The encryption keys never leave the cluster.

## Multi-cluster deployments

Deploy the same configuration to multiple clusters with variations:

```
fleet-infra/
├── clusters/
│   ├── prod-us-east/
│   │   └── apps.yaml
│   ├── prod-eu-west/
│   │   └── apps.yaml
│   └── prod-ap-south/
│       └── apps.yaml
└── apps/
    └── webapp/
        ├── base/
        └── overlays/
            └── production/
```

```yaml
# clusters/prod-us-east/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
spec:
  path: ./apps/webapp/overlays/production
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      cluster_region: us-east-1
      replicas: "10"
```

```yaml
# clusters/prod-eu-west/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
spec:
  path: ./apps/webapp/overlays/production
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      cluster_region: eu-west-1
      replicas: "6"
```

Each cluster runs the same base configuration with region-specific overrides.

## Progressive delivery with Flagger

Combine Flux with Flagger for canary deployments:

```yaml
# apps/webapp/base/canary.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: webapp
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  progressDeadlineSeconds: 300
  service:
    port: 80
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
```

```yaml
# apps/webapp/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml
- service.yaml
- canary.yaml
```

Flux applies the Canary resource, and Flagger automatically performs progressive rollouts when deployments update.

## Image automation with Flux

Configure automatic image updates:

```yaml
# clusters/production/image-update-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: webapp
  namespace: flux-system
spec:
  interval: 1m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxcdbot@users.noreply.github.com
        name: fluxcdbot
      messageTemplate: |
        Update {{range .Updated.Images}}{{println .}}{{end}}
    push:
      branch: main
  update:
    path: ./apps/webapp/overlays/production
    strategy: Setters
```

```yaml
# apps/webapp/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

images:
- name: webapp
  newName: registry.example.com/webapp
  newTag: v1.2.3 # {"$imagepolicy": "flux-system:webapp"}
```

Flux automatically updates the newTag when new images are available and commits changes back to Git.

## Monitoring Flux reconciliation

Track Flux status using built-in conditions:

```bash
# Check Kustomization status
flux get kustomizations

# View detailed status
kubectl get kustomization apps -n flux-system -o yaml

# Check reconciliation events
flux events
```

Create alerts for reconciliation failures:

```yaml
# clusters/production/alert-provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta1
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: production-alerts
  secretRef:
    name: slack-url
---
apiVersion: notification.toolkit.fluxcd.io/v1beta1
kind: Alert
metadata:
  name: kustomization-failures
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
  - kind: Kustomization
    name: '*'
```

Teams receive notifications when reconciliation fails, enabling quick response to issues.

## Suspend and resume reconciliation

Temporarily disable reconciliation for maintenance:

```bash
# Suspend reconciliation
flux suspend kustomization apps

# Resume reconciliation
flux resume kustomization apps
```

Or set it in the resource:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
spec:
  suspend: true  # Stops reconciliation
  interval: 5m
  path: ./apps/production
  sourceRef:
    kind: GitRepository
    name: flux-system
```

Use suspension during planned maintenance or when troubleshooting issues.

## Force reconciliation on demand

Trigger immediate reconciliation without waiting for the interval:

```bash
# Force reconcile specific Kustomization
flux reconcile kustomization apps --with-source

# Reconcile source first, then Kustomization
flux reconcile source git flux-system
flux reconcile kustomization apps
```

The `--with-source` flag ensures Flux pulls the latest Git changes before reconciling.

## Best practices for Flux and Kustomize

Structure repositories with clear boundaries between infrastructure, platform services, and applications. This enables different teams to manage their domains independently.

Use dependencies to ensure proper ordering. Infrastructure Kustomizations should complete before application Kustomizations that depend on them.

Configure appropriate intervals based on change frequency. Infrastructure might reconcile every 30 minutes while active application development uses 5-minute intervals.

Enable pruning to keep clusters clean. When resources are removed from Git, Flux deletes them from clusters automatically.

Implement comprehensive monitoring and alerting. Know immediately when reconciliation fails so you can respond quickly.

Use SOPS or similar tools for secrets. Never commit unencrypted secrets to Git repositories.

## Conclusion

Flux and Kustomize together provide a robust GitOps platform where Git is the single source of truth for Kubernetes configurations. Flux handles continuous reconciliation and drift detection while Kustomize manages multi-environment configuration complexity through overlays and patches.

This combination scales from single clusters to global multi-cluster deployments, providing consistent automation regardless of scale. By following GitOps principles and leveraging Flux's powerful reconciliation capabilities, you build resilient, auditable infrastructure that automatically stays synchronized with your desired state defined in Git.
