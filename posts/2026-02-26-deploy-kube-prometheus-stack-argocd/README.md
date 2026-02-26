# How to Deploy kube-prometheus-stack with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Prometheus, Monitoring

Description: Learn how to deploy the kube-prometheus-stack using ArgoCD for a fully GitOps-managed monitoring setup with Prometheus, Grafana, and Alertmanager on Kubernetes.

---

The kube-prometheus-stack is one of the most popular Helm charts in the Kubernetes ecosystem. It bundles Prometheus, Grafana, Alertmanager, node-exporter, kube-state-metrics, and a collection of recording and alerting rules into a single deployable package. Managing it through ArgoCD brings the benefits of GitOps - version-controlled configuration, automated drift detection, and declarative deployments.

However, deploying kube-prometheus-stack with ArgoCD is not as straightforward as dropping a Helm chart reference into an Application manifest. The chart includes CRDs, has a large values file, and generates hundreds of Kubernetes resources that can cause sync issues. This guide walks you through a production-ready setup.

## Prerequisites

Before you begin, make sure you have:

- A running Kubernetes cluster (1.25+)
- ArgoCD installed and accessible
- A Git repository for your manifests
- `kubectl` and `argocd` CLI tools configured

## Setting Up the Git Repository Structure

Organize your repository with a clear structure that separates the chart configuration from environment-specific overrides.

```
monitoring/
  kube-prometheus-stack/
    Chart.yaml
    values.yaml
    values-production.yaml
    values-staging.yaml
```

Create the `Chart.yaml` that references the upstream Helm chart as a dependency.

```yaml
# monitoring/kube-prometheus-stack/Chart.yaml
apiVersion: v2
name: kube-prometheus-stack
description: Wrapper chart for kube-prometheus-stack
type: application
version: 1.0.0
dependencies:
  - name: kube-prometheus-stack
    version: "62.7.0"
    repository: "https://prometheus-community.github.io/helm-charts"
```

## Creating the Values File

The default values file for kube-prometheus-stack is enormous. Focus on the settings you actually need to customize.

```yaml
# monitoring/kube-prometheus-stack/values.yaml
kube-prometheus-stack:
  # Prometheus configuration
  prometheus:
    prometheusSpec:
      retention: 15d
      retentionSize: "40GB"
      resources:
        requests:
          memory: 2Gi
          cpu: 500m
        limits:
          memory: 4Gi
      storageSpec:
        volumeClaimTemplate:
          spec:
            storageClassName: gp3
            accessModes: ["ReadWriteOnce"]
            resources:
              requests:
                storage: 50Gi
      # Scrape all ServiceMonitors across namespaces
      serviceMonitorSelectorNilUsesHelmValues: false
      podMonitorSelectorNilUsesHelmValues: false
      ruleSelectorNilUsesHelmValues: false

  # Grafana configuration
  grafana:
    adminPassword: "" # Use a secret instead
    persistence:
      enabled: true
      size: 10Gi
    dashboardProviders:
      dashboardproviders.yaml:
        apiVersion: 1
        providers:
          - name: default
            orgId: 1
            folder: ""
            type: file
            disableDeletion: false
            editable: true
            options:
              path: /var/lib/grafana/dashboards/default

  # Alertmanager configuration
  alertmanager:
    alertmanagerSpec:
      storage:
        volumeClaimTemplate:
          spec:
            storageClassName: gp3
            accessModes: ["ReadWriteOnce"]
            resources:
              requests:
                storage: 10Gi
```

## Creating the ArgoCD Application

Here is the ArgoCD Application manifest. Pay close attention to the sync policy and ignore differences sections - these are critical for kube-prometheus-stack.

```yaml
# argocd/applications/kube-prometheus-stack.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kube-prometheus-stack
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: monitoring
  source:
    repoURL: https://github.com/your-org/gitops-repo.git
    targetRevision: main
    path: monitoring/kube-prometheus-stack
    helm:
      valueFiles:
        - values.yaml
        - values-production.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
      - RespectIgnoreDifferences=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
  ignoreDifferences:
    - group: admissionregistration.k8s.io
      kind: MutatingWebhookConfiguration
      jqPathExpressions:
        - '.webhooks[]?.clientConfig.caBundle'
    - group: admissionregistration.k8s.io
      kind: ValidatingWebhookConfiguration
      jqPathExpressions:
        - '.webhooks[]?.clientConfig.caBundle'
```

## Handling CRDs

The kube-prometheus-stack chart includes Prometheus Operator CRDs like ServiceMonitor, PodMonitor, PrometheusRule, and others. ArgoCD needs special handling for these.

The recommended approach is to use the `ServerSideApply` sync option (as shown above). This avoids the common `metadata.annotations: Too long` error that occurs because kube-prometheus-stack CRDs are very large - often exceeding the annotation size limit used by kubectl's client-side apply.

If you prefer to manage CRDs separately, you can disable them in the chart and create a dedicated ArgoCD Application for CRDs.

```yaml
# In your values.yaml, disable CRD installation from the chart
kube-prometheus-stack:
  prometheus-operator:
    crds:
      enabled: false
```

Then create a separate Application for CRDs.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prometheus-operator-crds
  namespace: argocd
spec:
  project: monitoring
  source:
    repoURL: https://github.com/prometheus-operator/prometheus-operator.git
    targetRevision: v0.77.1
    path: example/prometheus-operator-crd
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      - ServerSideApply=true
      - Replace=true
```

## Dealing with Common Sync Issues

### Resource Too Large Errors

The kube-prometheus-stack generates large ConfigMaps and Secrets for Grafana dashboards. If you see annotation size errors, `ServerSideApply=true` is the fix.

### Out of Sync Due to Helm Hooks

Some resources in kube-prometheus-stack use Helm hooks that ArgoCD does not natively support in the same way. Add these annotations to skip hook-related resources.

```yaml
# In ignoreDifferences
ignoreDifferences:
  - group: batch
    kind: Job
    jqPathExpressions:
      - '.spec.template.spec.containers[]?.resources'
```

### Prometheus Operator Webhooks

The Prometheus Operator creates admission webhooks with dynamically generated CA bundles. These will always show as out of sync unless you add the `ignoreDifferences` section shown in the Application manifest above.

## Setting Up an AppProject for Monitoring

Create a dedicated ArgoCD project for your monitoring stack to enforce access controls.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: monitoring
  namespace: argocd
spec:
  description: Monitoring stack applications
  sourceRepos:
    - https://github.com/your-org/gitops-repo.git
    - https://github.com/prometheus-operator/prometheus-operator.git
  destinations:
    - namespace: monitoring
      server: https://kubernetes.default.svc
  clusterResourceWhitelist:
    - group: ""
      kind: Namespace
    - group: apiextensions.k8s.io
      kind: CustomResourceDefinition
    - group: admissionregistration.k8s.io
      kind: ValidatingWebhookConfiguration
    - group: admissionregistration.k8s.io
      kind: MutatingWebhookConfiguration
    - group: rbac.authorization.k8s.io
      kind: ClusterRole
    - group: rbac.authorization.k8s.io
      kind: ClusterRoleBinding
  namespaceResourceWhitelist:
    - group: "*"
      kind: "*"
```

## Managing Grafana Credentials with Sealed Secrets

Never store Grafana admin passwords in plain text in your Git repository. Use Sealed Secrets or an external secret manager.

```yaml
# Create a SealedSecret for Grafana admin credentials
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: kube-prometheus-stack-grafana
  namespace: monitoring
spec:
  encryptedData:
    admin-password: AgBy3i4OJSWK+PiTySYZZA9r...
    admin-user: AgBy3i4OJSWK+PiTySYZZA9r...
```

Then reference it in your values.

```yaml
kube-prometheus-stack:
  grafana:
    admin:
      existingSecret: kube-prometheus-stack-grafana
      userKey: admin-user
      passwordKey: admin-password
```

## Verifying the Deployment

After ArgoCD syncs the application, verify everything is running.

```bash
# Check all pods in the monitoring namespace
kubectl get pods -n monitoring

# Verify Prometheus targets
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090

# Verify Grafana dashboards
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80

# Check ArgoCD sync status
argocd app get kube-prometheus-stack
```

## Monitoring ArgoCD with the Stack

Once kube-prometheus-stack is running, you can monitor ArgoCD itself. ArgoCD exposes Prometheus metrics by default. Create a ServiceMonitor to scrape them.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-metrics
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  namespaceSelector:
    matchNames:
      - argocd
  selector:
    matchLabels:
      app.kubernetes.io/part-of: argocd
  endpoints:
    - port: metrics
      interval: 30s
```

This creates a feedback loop where ArgoCD deploys and manages the monitoring stack, and the monitoring stack observes ArgoCD's health - a common and powerful pattern in production Kubernetes environments.

For more on monitoring ArgoCD itself, check out [how ArgoCD architecture works under the hood](https://oneuptime.com/blog/post/2026-02-26-argocd-architecture-under-the-hood/view) and for setting up alerting on your monitoring stack, refer to your Alertmanager configuration in the values file above.

## Summary

Deploying kube-prometheus-stack with ArgoCD requires attention to CRD handling, sync options, and ignore differences configuration. The key takeaways are to use `ServerSideApply=true` to handle large resources, configure `ignoreDifferences` for dynamically generated webhook bundles, and consider separating CRD management into its own Application. With these patterns in place, you get a fully GitOps-managed monitoring stack that is reproducible, auditable, and self-healing.
