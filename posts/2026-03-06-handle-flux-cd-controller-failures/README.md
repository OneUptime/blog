# How to Handle Flux CD Controller Failures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, controller failures, Disaster Recovery, Kubernetes, GitOps, Reliability

Description: A practical guide to detecting, recovering from, and preventing Flux CD controller failures in production Kubernetes clusters.

---

Flux CD controllers are the backbone of your GitOps pipeline. When they fail, reconciliation stops and your cluster drifts from its desired state. This guide covers how to detect, handle, and prevent controller failures so your deployments remain reliable.

## Understanding Flux CD Controllers

Flux CD runs several controllers in the `flux-system` namespace:

- **source-controller** - Fetches manifests from Git, Helm, and OCI repositories
- **kustomize-controller** - Applies Kustomization resources
- **helm-controller** - Manages HelmRelease resources
- **notification-controller** - Handles alerts and event forwarding
- **image-reflector-controller** - Scans container registries for new tags
- **image-automation-controller** - Updates Git with new image references

If any of these fail, part of your GitOps pipeline breaks.

## Detecting Controller Failures

### Setting Up Health Checks

Create a monitoring configuration that watches Flux controllers and sends alerts when they go down.

```yaml
# monitoring/flux-health-check.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-controller-health
  namespace: flux-system
spec:
  groups:
    - name: flux-controllers
      rules:
        # Alert when any Flux controller pod is not ready
        - alert: FluxControllerDown
          expr: |
            kube_deployment_status_replicas_available{
              namespace="flux-system",
              deployment=~".*-controller"
            } == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Flux controller {{ $labels.deployment }} is down"
            description: "The {{ $labels.deployment }} has had 0 available replicas for 5 minutes."

        # Alert when reconciliation is stalled
        - alert: FluxReconciliationStalled
          expr: |
            gotk_reconcile_duration_seconds_count{
              namespace="flux-system"
            } == 0
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Flux reconciliation stalled for {{ $labels.controller }}"
```

### Using Flux Notification Controller for Alerts

```yaml
# alerts/slack-provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-alert
  namespace: flux-system
spec:
  type: slack
  channel: flux-alerts
  secretRef:
    name: slack-webhook-url
---
# alerts/controller-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: controller-failure-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-alert
  eventSeverity: error
  eventSources:
    # Watch all Flux controllers for errors
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
    - kind: GitRepository
      name: "*"
```

## Recovering from Controller Failures

### Step 1: Check Controller Status

```bash
# Check the status of all Flux controllers
flux check

# Get detailed pod status
kubectl get pods -n flux-system

# Check for crash loops or OOM kills
kubectl describe pods -n flux-system -l app.kubernetes.io/part-of=flux
```

### Step 2: Restart Failed Controllers

```bash
# Restart a specific controller
kubectl rollout restart deployment/source-controller -n flux-system

# Restart all Flux controllers
kubectl rollout restart deployment -n flux-system

# Wait for rollout to complete
kubectl rollout status deployment/source-controller -n flux-system --timeout=60s
```

### Step 3: Reinstall Flux if Controllers Are Corrupted

```bash
# Export current Flux configuration before reinstalling
flux export source git --all > git-sources-backup.yaml
flux export kustomization --all > kustomizations-backup.yaml
flux export helmrelease --all > helmreleases-backup.yaml

# Reinstall Flux with the same configuration
flux install \
  --components-extra=image-reflector-controller,image-automation-controller \
  --version=v2.4.0

# Verify all controllers are running
flux check
```

## Preventing Controller Failures

### Configure Resource Limits

Set appropriate resource requests and limits so controllers do not get OOM-killed.

```yaml
# clusters/production/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Increase memory for source-controller (handles large repos)
  - target:
      kind: Deployment
      name: source-controller
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
                  requests:
                    cpu: 200m
                    memory: 256Mi
                  limits:
                    cpu: "1"
                    memory: 1Gi

  # Increase memory for helm-controller (processes large charts)
  - target:
      kind: Deployment
      name: helm-controller
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: helm-controller
      spec:
        template:
          spec:
            containers:
              - name: manager
                resources:
                  requests:
                    cpu: 200m
                    memory: 256Mi
                  limits:
                    cpu: "1"
                    memory: 1Gi
```

### Configure Pod Disruption Budgets

Prevent controllers from being evicted during node maintenance.

```yaml
# flux-system/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: source-controller-pdb
  namespace: flux-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: source-controller
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: kustomize-controller-pdb
  namespace: flux-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: kustomize-controller
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: helm-controller-pdb
  namespace: flux-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: helm-controller
```

### Set Up Controller Replicas for High Availability

Run multiple replicas with leader election enabled.

```yaml
# flux-system/ha-patch.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - target:
      kind: Deployment
      name: "(source|kustomize|helm)-controller"
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: all-controllers
      spec:
        # Run 2 replicas for HA
        replicas: 2
        template:
          spec:
            containers:
              - name: manager
                args:
                  # Enable leader election so only one replica
                  # actively reconciles at a time
                  - --leader-elect=true
            # Spread across different nodes
            topologySpreadConstraints:
              - maxSkew: 1
                topologyKey: kubernetes.io/hostname
                whenUnsatisfiable: DoNotSchedule
                labelSelector:
                  matchLabels:
                    app.kubernetes.io/part-of: flux
```

## Handling Specific Failure Scenarios

### Scenario 1: Source Controller OOM Kill

When the source-controller runs out of memory processing large Git repositories:

```bash
# Check if the pod was OOM-killed
kubectl get events -n flux-system --field-selector reason=OOMKilled

# Increase memory limit (see resource limits section above)

# Configure shallow clones to reduce memory usage
```

```yaml
# Use shallow clones to reduce memory pressure
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: large-repo
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/org/large-repo
  ref:
    branch: main
  # Ignore large files that are not needed for deployments
  ignore: |
    # Exclude non-essential directories
    /docs/
    /tests/
    /*.md
```

### Scenario 2: Helm Controller Stuck in Pending

```bash
# Check for stuck HelmReleases
kubectl get helmrelease -A --field-selector status.conditions[0].reason=InstallFailed

# Force a reconciliation
flux reconcile helmrelease my-release -n default --force

# If still stuck, suspend and resume
flux suspend helmrelease my-release -n default
flux resume helmrelease my-release -n default
```

### Scenario 3: Notification Controller Backlog

```yaml
# Increase the event processing rate
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
patches:
  - target:
      kind: Deployment
      name: notification-controller
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: notification-controller
      spec:
        template:
          spec:
            containers:
              - name: manager
                args:
                  # Increase concurrent event workers
                  - --concurrent=10
                  - --log-level=info
```

## Automated Recovery with Kubernetes

### Use Liveness and Readiness Probes

Flux controllers come with built-in health endpoints. Ensure they are configured correctly.

```bash
# Verify probes are configured on all controllers
kubectl get deployment -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.template.spec.containers[0].livenessProbe}{"\n"}{end}'
```

### Set Up a CronJob for Periodic Health Checks

```yaml
# monitoring/flux-health-cron.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: flux-health-check
  namespace: flux-system
spec:
  # Run every 5 minutes
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: flux-health-checker
          containers:
            - name: health-check
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Check each controller is running
                  for ctrl in source-controller kustomize-controller helm-controller; do
                    READY=$(kubectl get deployment $ctrl -n flux-system \
                      -o jsonpath='{.status.readyReplicas}')
                    if [ "$READY" = "0" ] || [ -z "$READY" ]; then
                      echo "ALERT: $ctrl is not ready, restarting..."
                      kubectl rollout restart deployment/$ctrl -n flux-system
                    fi
                  done
          restartPolicy: OnFailure
```

## Summary

Handling Flux CD controller failures requires a layered approach:

1. **Detection** - Use Prometheus alerts and Flux notification controller to catch failures early
2. **Recovery** - Restart controllers, force reconciliation, or reinstall Flux if needed
3. **Prevention** - Configure resource limits, PDBs, multiple replicas, and topology constraints
4. **Automation** - Set up CronJobs and probes for self-healing

By implementing these practices, you minimize the blast radius of controller failures and keep your GitOps pipeline running reliably.
