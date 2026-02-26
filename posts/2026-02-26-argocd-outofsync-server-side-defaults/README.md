# How to Handle ArgoCD OutOfSync Due to Server-Side Defaults

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting

Description: Fix persistent ArgoCD OutOfSync status caused by Kubernetes server-side default values that differ from your Git manifests using diff customization strategies.

---

Your ArgoCD application keeps showing OutOfSync even though you have not changed anything. You sync it, it goes to "Synced" for a moment, and then immediately flips back to OutOfSync. The diff shows fields you never set in your manifests - things like `strategy.rollingUpdate.maxUnavailable: 25%` or `resources.requests` that you did not specify.

This is one of the most frustrating ArgoCD issues, and it happens because Kubernetes adds default values to resources after they are created. Your Git manifest says nothing about `maxUnavailable`, but Kubernetes automatically sets it to `25%`. ArgoCD compares what is in Git (no field) with what is live (field present with a default value), sees a difference, and reports OutOfSync.

## Understanding Why This Happens

When you apply a Kubernetes manifest, the API server does several things:

1. Validates the manifest
2. Applies default values for fields you did not specify
3. Runs mutating admission webhooks that may modify the manifest
4. Stores the final object in etcd

The stored object often has more fields than what you originally submitted. ArgoCD compares the stored (live) state against the Git (desired) state, and those extra fields show up as differences.

Common fields that cause this:

- `spec.strategy.rollingUpdate.maxUnavailable` and `maxSurge` on Deployments
- `spec.revisionHistoryLimit` on Deployments
- `spec.template.spec.terminationGracePeriodSeconds`
- `spec.template.spec.dnsPolicy`
- `spec.template.spec.restartPolicy`
- `spec.template.spec.schedulerName`
- `spec.sessionAffinity` on Services
- `spec.ports[*].protocol` on Services (defaults to TCP)
- Various fields added by mutating webhooks (like Istio sidecar injection)

## Solution 1: Ignore Specific Differences

ArgoCD lets you configure diff customizations to ignore specific fields. This is the most targeted approach.

### Per-Application Ignore

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/my-org/my-repo.git
    targetRevision: main
    path: manifests/
  ignoreDifferences:
    # Ignore rolling update defaults on all Deployments
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/strategy/rollingUpdate/maxUnavailable
        - /spec/strategy/rollingUpdate/maxSurge
        - /spec/revisionHistoryLimit
    # Ignore protocol default on Services
    - group: ""
      kind: Service
      jsonPointers:
        - /spec/ports/0/protocol
    # Ignore webhook-injected annotations
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/template/metadata/annotations
```

### Using JQ Path Expressions

For more complex matching, use JQ path expressions instead of JSON pointers.

```yaml
ignoreDifferences:
  # Ignore all container resource fields
  - group: "*"
    kind: "*"
    jqPathExpressions:
      - .spec.template.spec.containers[]?.resources
      - .spec.template.spec.initContainers[]?.resources
  # Ignore specific annotations added by controllers
  - group: apps
    kind: Deployment
    jqPathExpressions:
      - .metadata.annotations["deployment.kubernetes.io/revision"]
```

### Global Ignore Rules

If many applications have the same diff issues, configure global ignore rules in the `argocd-cm` ConfigMap.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.ignoreDifferences.all: |
    jsonPointers:
      - /metadata/annotations/kubectl.kubernetes.io~1last-applied-configuration
    jqPathExpressions:
      - .metadata.managedFields
  resource.customizations.ignoreDifferences.apps_Deployment: |
    jsonPointers:
      - /spec/strategy/rollingUpdate/maxUnavailable
      - /spec/strategy/rollingUpdate/maxSurge
      - /spec/revisionHistoryLimit
  resource.customizations.ignoreDifferences._Service: |
    jqPathExpressions:
      - .spec.ports[]?.protocol
      - .spec.clusterIP
      - .spec.clusterIPs
```

## Solution 2: Use Server-Side Diff

ArgoCD v2.5+ supports server-side diff, which uses the Kubernetes API server to compute the diff instead of doing it client-side. This is a game-changer because the server-side diff understands defaults and only shows actual meaningful differences.

### Enable Per-Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
  annotations:
    # Enable server-side diff for this application
    argocd.argoproj.io/compare-options: ServerSideDiff=true
spec:
  # ...
```

### Enable Globally

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  controller.diff.server.side: "true"
```

Server-side diff is the recommended approach for new installations. It dramatically reduces false OutOfSync detections because the Kubernetes API server knows which fields are defaulted and excludes them from the comparison.

## Solution 3: Explicitly Set Defaults in Your Manifests

Instead of ignoring differences, you can explicitly set the default values in your Git manifests. This eliminates the diff because the live state matches what is in Git.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  # Explicitly set defaults to prevent OutOfSync
  revisionHistoryLimit: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 25%
      maxSurge: 25%
  template:
    spec:
      terminationGracePeriodSeconds: 30
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      schedulerName: default-scheduler
      containers:
        - name: my-app
          image: my-app:v1.0
          ports:
            - containerPort: 8080
              # Explicitly set the protocol
              protocol: TCP
```

This approach has the advantage of making your manifests fully explicit, which improves readability and avoids surprises. The downside is that it adds verbosity to every manifest.

## Solution 4: Handle Webhook-Injected Fields

Mutating admission webhooks frequently inject fields that cause OutOfSync. The Istio sidecar injector is a classic example - it adds a sidecar container and several annotations to your pods.

For webhook-injected fields, the best approach is to use `ignoreDifferences` with JQ expressions.

```yaml
ignoreDifferences:
  # Ignore Istio sidecar injection
  - group: apps
    kind: Deployment
    jqPathExpressions:
      - .spec.template.metadata.annotations["sidecar.istio.io/status"]
      - .spec.template.metadata.labels["security.istio.io/tlsMode"]
      - '.spec.template.spec.containers[] | select(.name == "istio-proxy")'
      - '.spec.template.spec.initContainers[] | select(.name == "istio-init")'
```

## Diagnosing the Specific Diff

Before applying any fix, first identify exactly what fields are causing the OutOfSync.

```bash
# Show the detailed diff
argocd app diff my-app

# Or view it in the UI by clicking on the application then App Diff
```

The diff output shows you exactly which fields differ. Focus on fields that you did not set - those are the server-side defaults.

```bash
# Get the live manifest
argocd app manifests my-app --source live > live.yaml

# Get the Git manifest
argocd app manifests my-app --source git > git.yaml

# Compare them
diff live.yaml git.yaml
```

## Best Practices

1. **Start with server-side diff**: It eliminates most false positives automatically
2. **Use global ignore rules for common defaults**: Things like `kubectl.kubernetes.io/last-applied-configuration` and `managedFields` should be ignored globally
3. **Use per-application ignores for specific cases**: Webhook-injected fields or CRD-specific defaults
4. **Document why fields are ignored**: Add comments in your Application specs explaining each ignore rule

Monitoring your applications for unexpected OutOfSync states helps catch real drift from legitimate server-side default noise. [OneUptime](https://oneuptime.com) can track your ArgoCD sync status and help you distinguish between real issues and false positives.

Server-side defaults causing OutOfSync is a known limitation of declarative GitOps, and the ArgoCD team has been steadily improving the tooling to handle it better. Server-side diff is the biggest improvement, and if you are running ArgoCD v2.5 or later, enabling it should be your first step.
