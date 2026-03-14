# How to Migrate from Helm CLI to Flux CD HelmRelease

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Helm, Migration, Kubernetes, GitOps, HelmRelease, Chart Management

Description: A practical guide to migrating Helm chart deployments from the Helm CLI to declarative Flux CD HelmRelease resources.

---

## Introduction

Using the Helm CLI to install and manage charts is a common starting point for Kubernetes teams. Commands like `helm install` and `helm upgrade` work well for individual deployments, but they lack the consistency and automation that a GitOps workflow provides. By migrating to Flux CD HelmRelease resources, you declare your Helm releases in Git and let Flux handle installation, upgrades, and rollbacks automatically.

## Why Migrate from Helm CLI to Flux CD

The Helm CLI approach has limitations at scale:

- **No single source of truth**: Release state lives in the cluster, not in Git
- **Manual operations**: Every upgrade requires running a CLI command
- **Environment inconsistency**: Different operators may use different values
- **No automatic rollback**: Failed upgrades require manual intervention
- **Limited audit trail**: Helm history is stored in cluster secrets

Flux CD HelmRelease provides:

- Declarative release management in Git
- Automatic reconciliation and drift correction
- Built-in upgrade retries and rollback on failure
- Full audit trail through Git history

## Step 1: Inventory Existing Helm Releases

Start by documenting all Helm releases currently managed via the CLI.

```bash
# List all Helm releases across all namespaces
helm list --all-namespaces

# Export details of each release
helm list -A -o json > helm-releases-inventory.json

# Get the values used for each release
helm get values my-app -n default > my-app-values.yaml
helm get values nginx-ingress -n ingress-nginx > nginx-ingress-values.yaml
helm get values prometheus -n monitoring > prometheus-values.yaml

# Check the chart version for each release
helm list -A -o json | jq '.[] | {name: .name, namespace: .namespace, chart: .chart, status: .status}'
```

## Step 2: Set Up Flux CD

Install Flux CD with the Helm Controller.

```bash
# Bootstrap Flux
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-config \
  --path=clusters/production \
  --branch=main \
  --personal

# Verify Flux is running with the Helm Controller
flux check
kubectl get pods -n flux-system | grep helm-controller
```

## Step 3: Create HelmRepository Sources

Define `HelmRepository` resources for each Helm chart repository you use.

```yaml
# infrastructure/sources/bitnami.yaml
# HelmRepository for the Bitnami chart repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  url: https://charts.bitnami.com/bitnami
  interval: 30m
---
# infrastructure/sources/prometheus-community.yaml
# HelmRepository for Prometheus community charts
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: prometheus-community
  namespace: flux-system
spec:
  url: https://prometheus-community.github.io/helm-charts
  interval: 30m
---
# infrastructure/sources/ingress-nginx.yaml
# HelmRepository for the ingress-nginx chart
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  url: https://kubernetes.github.io/ingress-nginx
  interval: 30m
```

```yaml
# infrastructure/sources/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - bitnami.yaml
  - prometheus-community.yaml
  - ingress-nginx.yaml
```

For private repositories with authentication:

```yaml
# infrastructure/sources/private-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: private-charts
  namespace: flux-system
spec:
  url: https://charts.private.example.com
  interval: 30m
  # Reference to a secret containing credentials
  secretRef:
    name: private-charts-auth
---
# Create the secret separately (not stored in Git)
# kubectl create secret generic private-charts-auth \
#   --namespace=flux-system \
#   --from-literal=username=admin \
#   --from-literal=password=secret
```

## Step 4: Convert Helm CLI Commands to HelmRelease Resources

For each `helm install` or `helm upgrade` command, create a corresponding `HelmRelease` resource.

### Example 1: Simple Application

```bash
# Original Helm CLI command:
# helm install my-app bitnami/nginx \
#   --namespace default \
#   --version 15.4.0 \
#   --set replicaCount=3 \
#   --set service.type=ClusterIP
```

```yaml
# apps/my-app/helmrelease.yaml
# Converted to a Flux CD HelmRelease
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      # Chart name from the repository
      chart: nginx
      # Pin to a specific version
      version: "15.4.0"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      interval: 30m
  # Inline values (equivalent to --set flags)
  values:
    replicaCount: 3
    service:
      type: ClusterIP
```

### Example 2: Application with Values File

```bash
# Original Helm CLI command:
# helm install prometheus prometheus-community/kube-prometheus-stack \
#   --namespace monitoring \
#   --create-namespace \
#   --version 55.0.0 \
#   -f custom-values.yaml
```

```yaml
# apps/prometheus/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: prometheus
  namespace: monitoring
spec:
  interval: 10m
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "55.0.0"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  # Install configuration
  install:
    # Create the namespace if it does not exist
    createNamespace: true
    remediation:
      retries: 3
  # Values from the custom-values.yaml file
  values:
    prometheus:
      prometheusSpec:
        retention: 30d
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        storageSpec:
          volumeClaimTemplate:
            spec:
              storageClassName: standard
              accessModes: ["ReadWriteOnce"]
              resources:
                requests:
                  storage: 100Gi
    grafana:
      enabled: true
      adminPassword: ""
      persistence:
        enabled: true
        size: 10Gi
    alertmanager:
      alertmanagerSpec:
        retention: 120h
```

### Example 3: Application with Values from ConfigMap

```yaml
# apps/nginx-ingress/values-configmap.yaml
# Store complex values in a ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-ingress-values
  namespace: flux-system
data:
  values.yaml: |
    controller:
      replicaCount: 3
      service:
        type: LoadBalancer
        annotations:
          service.beta.kubernetes.io/aws-load-balancer-type: nlb
      metrics:
        enabled: true
      resources:
        requests:
          cpu: 200m
          memory: 256Mi
        limits:
          cpu: 1000m
          memory: 512Mi
    defaultBackend:
      enabled: true
      replicaCount: 2
---
# apps/nginx-ingress/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx-ingress
  namespace: ingress-nginx
spec:
  interval: 10m
  chart:
    spec:
      chart: ingress-nginx
      version: "4.9.0"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
  install:
    createNamespace: true
    remediation:
      retries: 3
  # Load values from a ConfigMap
  valuesFrom:
    - kind: ConfigMap
      name: nginx-ingress-values
      valuesKey: values.yaml
```

## Step 5: Configure Upgrade and Rollback Policies

One advantage of Flux HelmRelease over the CLI is built-in upgrade and rollback policies.

```yaml
# apps/my-app/helmrelease.yaml
# HelmRelease with comprehensive lifecycle management
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: ">=1.0.0 <2.0.0"
      sourceRef:
        kind: HelmRepository
        name: private-charts
        namespace: flux-system
  # Installation settings
  install:
    createNamespace: true
    remediation:
      retries: 5
  # Upgrade settings
  upgrade:
    # Clean up resources that failed during upgrade
    cleanupOnFail: true
    remediation:
      retries: 3
      # Automatically rollback on upgrade failure
      strategy: rollback
  # Rollback settings
  rollback:
    cleanupOnFail: true
    # Recreate pods on rollback for a clean slate
    recreate: true
  # Uninstall settings
  uninstall:
    keepHistory: false
  # Test settings - run Helm test hooks after install/upgrade
  test:
    enable: true
    ignoreFailures: false
  values:
    replicaCount: 3
```

## Step 6: Adopt Existing Helm Releases

When Flux applies a HelmRelease for a chart that was already installed via the CLI, the Helm Controller will adopt the existing release if the release name matches.

```bash
# Check the existing release name
helm list -n default

# Ensure your HelmRelease metadata.name or spec.releaseName
# matches the existing Helm release name

# If they match, Flux will adopt the release on next reconciliation
# The adoption happens automatically
```

```yaml
# If the release name differs from the desired metadata name,
# use spec.releaseName to match the existing release
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app-release
  namespace: default
spec:
  # Explicitly set the release name to match the existing one
  releaseName: my-app
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "1.2.3"
      sourceRef:
        kind: HelmRepository
        name: private-charts
        namespace: flux-system
```

## Step 7: Create the Flux Kustomization to Manage HelmReleases

Wire everything together with a Flux Kustomization.

```yaml
# clusters/production/infrastructure.yaml
# Manages infrastructure HelmReleases
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure-sources
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/sources
  prune: true
---
# clusters/production/apps.yaml
# Manages application HelmReleases
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: infrastructure-sources
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps
  prune: true
```

## Step 8: Verify the Migration

```bash
# Check that all HelmReleases are reconciled
flux get helmreleases -A

# Verify Helm releases match expectations
helm list -A

# Compare values between CLI-installed and Flux-managed releases
helm get values my-app -n default
flux get helmrelease my-app -n default -o yaml | grep -A50 "values:"

# Force a reconciliation
flux reconcile helmrelease my-app -n default

# Watch for successful reconciliation
flux get helmrelease my-app -n default -w
```

## Step 9: Decommission CLI-Based Workflows

After verifying all releases are managed by Flux, update your team processes.

```bash
# Remove any CI/CD pipeline steps that run helm install/upgrade
# Replace them with Git commit workflows

# Document which releases are now managed by Flux
flux get helmreleases -A -o json | jq '.[].name'

# Set up alerts for HelmRelease failures
```

```yaml
# notifications/helm-alerts.yaml
# Alert on HelmRelease failures
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: helm-release-alerts
  namespace: flux-system
spec:
  summary: "HelmRelease reconciliation alert"
  eventSeverity: error
  eventSources:
    - kind: HelmRelease
      name: "*"
      namespace: "*"
  providerRef:
    name: slack-provider
```

## Migration Checklist

1. Inventory all existing Helm releases with `helm list -A`
2. Export values for each release with `helm get values`
3. Install and bootstrap Flux CD
4. Create HelmRepository sources for all chart repositories
5. Convert each Helm CLI installation to a HelmRelease resource
6. Configure upgrade and rollback policies
7. Verify Flux adopts existing releases
8. Set up Flux Kustomizations to manage the HelmReleases
9. Verify all releases are reconciling correctly
10. Update CI/CD pipelines to use Git commits instead of Helm CLI
11. Set up alerts for HelmRelease failures
12. Document the new workflow for the team

## Conclusion

Migrating from the Helm CLI to Flux CD HelmRelease resources brings your Helm deployments under GitOps control. Releases are declared in Git, automatically reconciled, and include built-in upgrade and rollback policies. The migration can be done incrementally by converting one release at a time, with Flux adopting existing releases without downtime. Once complete, your team works entirely through Git pull requests instead of running CLI commands against the cluster.
