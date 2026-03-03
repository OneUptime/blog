# How to Configure Istio for Weave GitOps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Weave GitOps, Flux, GitOps, Kubernetes

Description: How to manage Istio traffic routing and policies through Weave GitOps and Flux for fully declarative GitOps-driven service mesh management.

---

Weave GitOps builds on top of Flux to give you a UI and additional tooling for managing Kubernetes resources through Git. When you pair it with Istio, every VirtualService, DestinationRule, and AuthorizationPolicy lives in a Git repository and gets automatically synced to your cluster. Changes go through pull requests, get reviewed, and are applied by Flux. No more kubectl apply from laptops.

This approach brings the same rigor you apply to application code to your service mesh configuration. Every traffic routing change is tracked, auditable, and reversible.

## Setting Up Flux and Weave GitOps

First, install Flux in your cluster:

```bash
flux install
```

Then install Weave GitOps:

```bash
brew install weaveworks/tap/gitops

# Or install the Helm chart
helm repo add ww-gitops https://helm.gitops.weave.works
helm install weave-gitops ww-gitops/weave-gitops \
  --namespace flux-system \
  --set adminUser.create=true \
  --set adminUser.username=admin \
  --set adminUser.passwordHash=$(echo -n 'your-password' | gitops get bcrypt-hash)
```

Access the Weave GitOps dashboard:

```bash
kubectl port-forward svc/weave-gitops -n flux-system 9001:9001
```

## Repository Structure

Organize your Git repository to separate Istio resources from application manifests:

```text
├── clusters/
│   └── production/
│       ├── flux-system/
│       ├── istio/
│       │   ├── kustomization.yaml
│       │   ├── namespace.yaml
│       │   └── istio-operator.yaml
│       └── apps/
│           ├── kustomization.yaml
│           └── my-app/
│               ├── deployment.yaml
│               ├── service.yaml
│               ├── virtualservice.yaml
│               ├── destinationrule.yaml
│               └── authorization-policy.yaml
```

## Creating Flux Kustomizations for Istio

Set up a Flux Kustomization that watches for Istio resources:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: istio-config
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/production/istio
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
  - apiVersion: networking.istio.io/v1
    kind: VirtualService
    name: my-app-vsvc
    namespace: default
```

And another for your application resources:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/production/apps
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
  - name: istio-config
```

The `dependsOn` field makes sure Istio resources are applied before the apps, so VirtualServices and DestinationRules exist before the application pods come up.

## Managing Istio VirtualServices Through Git

Put your VirtualService in the Git repo:

```yaml
# clusters/production/apps/my-app/virtualservice.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vsvc
  namespace: default
spec:
  hosts:
  - my-app
  http:
  - route:
    - destination:
        host: my-app
        subset: v1
      weight: 100
    - destination:
        host: my-app
        subset: v2
      weight: 0
```

To do a canary rollout, create a pull request that changes the weights:

```yaml
spec:
  http:
  - route:
    - destination:
        host: my-app
        subset: v1
      weight: 90
    - destination:
        host: my-app
        subset: v2
      weight: 10
```

When the PR gets merged, Flux detects the change and applies it automatically. The Weave GitOps dashboard shows the sync status.

## Progressive Delivery with Flagger

For automated canary deployments, add Flagger to the mix. Flagger works with Flux and Istio to automatically manage traffic shifts based on metrics:

```bash
helm repo add flagger https://flagger.app
helm install flagger flagger/flagger \
  --namespace istio-system \
  --set meshProvider=istio \
  --set metricsServer=http://prometheus.monitoring.svc.cluster.local:9090
```

Define a Canary resource in your Git repo:

```yaml
# clusters/production/apps/my-app/canary.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 8080
    targetPort: 8080
    gateways:
    - mesh
    hosts:
    - my-app
  analysis:
    interval: 30s
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m
```

Now when you update the deployment image in Git, Flagger takes over:

1. Creates a canary deployment
2. Gradually shifts Istio traffic from 0% to 50% in 10% steps
3. Checks metrics at each step
4. Promotes or rolls back automatically

All of this is triggered by a Git commit.

## Managing Authorization Policies Through Git

Security policies also belong in Git:

```yaml
# clusters/production/apps/my-app/authorization-policy.yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: my-app-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/frontend/sa/frontend-app"]
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/*"]
```

Changes to authorization policies go through the same PR review process. This gives you an audit trail of every security policy change, who approved it, and when it was applied.

## Monitoring Sync Status

Weave GitOps provides visibility into whether your Git state matches your cluster state:

```bash
# Check Flux kustomization status
flux get kustomizations

# Check specific Istio resources
flux get kustomizations istio-config
```

In the Weave GitOps UI, you can see:
- Which resources are in sync
- Which resources have drifted
- The Git commit that last changed each resource
- Any errors during reconciliation

## Handling Drift

If someone manually modifies an Istio resource using kubectl, Flux will detect the drift and revert it to match Git. This is controlled by the `prune` option in the Kustomization:

```yaml
spec:
  prune: true  # Remove resources that are no longer in Git
  force: false # Don't force apply if there are conflicts
```

You can also set up alerts for drift detection:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: istio-drift-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
  - kind: Kustomization
    name: istio-config
```

## Multi-Environment Promotion

Use Kustomize overlays to manage Istio configs across environments:

```text
├── base/
│   └── my-app/
│       ├── virtualservice.yaml
│       └── kustomization.yaml
├── staging/
│   └── my-app/
│       ├── kustomization.yaml
│       └── virtualservice-patch.yaml
└── production/
    └── my-app/
        ├── kustomization.yaml
        └── virtualservice-patch.yaml
```

The staging overlay might have more aggressive traffic splits for testing, while production uses conservative canary percentages.

Running Istio through Weave GitOps and Flux gives you a solid foundation for managing service mesh configuration at scale. Every change is tracked, reviewed, and automatically applied. Drift gets corrected. And the Weave GitOps dashboard gives your team visibility into the state of the mesh without needing to run kubectl commands.
