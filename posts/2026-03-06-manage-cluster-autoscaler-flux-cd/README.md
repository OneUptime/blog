# How to Manage Cluster Autoscaler with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, cluster autoscaler, kubernetes, gitops, scaling, helm

Description: A practical guide to deploying and managing the Kubernetes Cluster Autoscaler using Flux CD and GitOps principles.

---

## Introduction

The Cluster Autoscaler automatically adjusts the size of your Kubernetes cluster by adding or removing nodes based on pending pod scheduling demands. When combined with Flux CD, you get a fully declarative, Git-driven approach to managing autoscaling configuration across multiple clusters.

This guide walks you through setting up the Cluster Autoscaler with Flux CD, covering Helm-based deployment, cloud provider configuration, and advanced tuning parameters.

## Prerequisites

Before you begin, ensure you have:

- A running Kubernetes cluster on a supported cloud provider (AWS, GCP, Azure)
- Flux CD installed and bootstrapped on the cluster
- Appropriate IAM permissions for the autoscaler to manage node groups
- kubectl configured to access your cluster

## Setting Up the Helm Repository

First, define a HelmRepository source so Flux can pull the Cluster Autoscaler chart.

```yaml
# clusters/my-cluster/sources/cluster-autoscaler-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: autoscaler
  namespace: flux-system
spec:
  interval: 1h
  url: https://kubernetes.github.io/autoscaler
```

## Creating the HelmRelease

Define a HelmRelease that deploys the Cluster Autoscaler with your desired configuration.

```yaml
# clusters/my-cluster/autoscaler/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  interval: 30m
  chart:
    spec:
      chart: cluster-autoscaler
      version: "9.37.x"
      sourceRef:
        kind: HelmRepository
        name: autoscaler
        namespace: flux-system
  # Retry on failure
  install:
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
  values:
    # Cloud provider setting
    cloudProvider: aws
    # AWS-specific configuration
    awsRegion: us-east-1
    # Auto-discovery of node groups via tags
    autoDiscovery:
      clusterName: my-cluster
      tags:
        - k8s.io/cluster-autoscaler/enabled
        - k8s.io/cluster-autoscaler/my-cluster
    # Resource requests and limits for the autoscaler pod
    resources:
      requests:
        cpu: 100m
        memory: 300Mi
      limits:
        cpu: 200m
        memory: 600Mi
    # Scaling behavior tuning
    extraArgs:
      # Wait 10 minutes before scaling down an underutilized node
      scale-down-delay-after-add: "10m"
      # Node must be underutilized for 10 minutes before removal
      scale-down-unneeded-time: "10m"
      # Scale down when utilization is below 50%
      scale-down-utilization-threshold: "0.5"
      # Skip nodes with system pods
      skip-nodes-with-system-pods: "true"
      # Balance similar node groups
      balance-similar-node-groups: "true"
    # Service account with IAM role annotation
    rbac:
      serviceAccount:
        annotations:
          eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/cluster-autoscaler
```

## Configuring IAM with Kustomization

Use a Flux Kustomization to organize all autoscaler-related resources.

```yaml
# clusters/my-cluster/autoscaler/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cluster-autoscaler
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/autoscaler
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Health checks to verify the deployment is running
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: cluster-autoscaler-aws-cluster-autoscaler
      namespace: kube-system
  # Timeout for health checks
  timeout: 5m
```

## Environment-Specific Overrides with Patches

You can use Kustomize patches to adjust autoscaler settings per environment.

```yaml
# infrastructure/autoscaler/overlays/production/patch.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  values:
    # Production gets more aggressive scaling
    extraArgs:
      scale-down-delay-after-add: "5m"
      scale-down-unneeded-time: "5m"
      max-graceful-termination-sec: "600"
      # Expander strategy: prioritize least costly node groups
      expander: "least-waste"
    # Higher resource limits in production
    resources:
      requests:
        cpu: 200m
        memory: 500Mi
      limits:
        cpu: 500m
        memory: 1Gi
    # Pod disruption budget for high availability
    podDisruptionBudget:
      maxUnavailable: 1
    # Run multiple replicas with leader election
    replicaCount: 2
```

## Configuring Priority-Based Expander

The priority expander lets you define which node groups the autoscaler should prefer when scaling up.

```yaml
# infrastructure/autoscaler/priority-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-expander
  namespace: kube-system
data:
  priorities: |
    # Higher number = higher priority
    50:
      # Prefer spot instances for non-critical workloads
      - ".*spot.*"
    30:
      # Fall back to on-demand instances
      - ".*on-demand.*"
    10:
      # Last resort: GPU node groups
      - ".*gpu.*"
```

## Monitoring the Autoscaler

Deploy a ServiceMonitor to scrape autoscaler metrics with Prometheus.

```yaml
# infrastructure/autoscaler/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cluster-autoscaler
  namespace: kube-system
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: aws-cluster-autoscaler
  endpoints:
    - port: http
      interval: 30s
      path: /metrics
```

## Setting Up Alerts

Create PrometheusRule alerts for autoscaler issues.

```yaml
# infrastructure/autoscaler/alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cluster-autoscaler-alerts
  namespace: kube-system
spec:
  groups:
    - name: cluster-autoscaler
      rules:
        # Alert when autoscaler cannot scale up
        - alert: ClusterAutoscalerUnableToScaleUp
          expr: |
            cluster_autoscaler_failed_scale_ups_total > 0
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Cluster Autoscaler unable to scale up"
            description: "The autoscaler has been failing to scale up for 15 minutes."
        # Alert when there are unschedulable pods
        - alert: ClusterAutoscalerUnschedulablePods
          expr: |
            cluster_autoscaler_unschedulable_pods_count > 0
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "Unschedulable pods detected"
            description: "There are {{ $value }} unschedulable pods for over 10 minutes."
```

## Multi-Cloud Configuration

If you manage clusters across multiple cloud providers, structure your Git repository accordingly.

```yaml
# clusters/gke-cluster/autoscaler/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  interval: 30m
  chart:
    spec:
      chart: cluster-autoscaler
      version: "9.37.x"
      sourceRef:
        kind: HelmRepository
        name: autoscaler
        namespace: flux-system
  values:
    # GCP-specific settings
    cloudProvider: gce
    extraArgs:
      # GKE uses a different node group discovery mechanism
      node-group-auto-discovery: "mig:namePrefix=gke-my-cluster,min=1,max=10"
    # GKE workload identity
    rbac:
      serviceAccount:
        annotations:
          iam.gke.io/gcp-service-account: cluster-autoscaler@my-project.iam.gserviceaccount.com
```

## Flux Notification for Scaling Events

Configure Flux to notify you when autoscaler configuration changes are applied.

```yaml
# clusters/my-cluster/notifications/autoscaler-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: autoscaler-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSources:
    - kind: HelmRelease
      name: cluster-autoscaler
      namespace: kube-system
  eventSeverity: info
```

## Verifying the Deployment

After committing and pushing your configuration, verify the autoscaler is running.

```bash
# Check Flux reconciliation status
flux get helmreleases -n kube-system

# Verify the autoscaler pods are running
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-cluster-autoscaler

# Check autoscaler logs for activity
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-cluster-autoscaler --tail=50

# View the autoscaler status configmap
kubectl get configmap cluster-autoscaler-status -n kube-system -o yaml
```

## Troubleshooting

Common issues and their solutions:

- **Autoscaler not scaling up**: Check IAM permissions and ensure node group tags match the auto-discovery configuration
- **Nodes not scaling down**: Verify that pods have appropriate PodDisruptionBudgets and that no pods are using local storage without the safe-to-evict annotation
- **Flux reconciliation failing**: Check the HelmRelease status with `flux get hr cluster-autoscaler -n kube-system` and inspect events

## Conclusion

Managing the Cluster Autoscaler with Flux CD gives you a reproducible, auditable, and version-controlled approach to cluster scaling. By storing all configuration in Git, you can easily track changes, roll back problematic configurations, and maintain consistency across multiple clusters and environments.
