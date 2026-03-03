# How to Deploy the Prometheus Operator with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Prometheus, Monitoring

Description: Learn how to deploy the Prometheus Operator and kube-prometheus-stack with ArgoCD, including CRD management, custom values, and alerting configuration.

---

The Prometheus Operator is one of the most popular Kubernetes operators, powering monitoring for thousands of clusters. Deploying it with ArgoCD gives you a GitOps-managed monitoring stack that you can version, review, and roll back. However, the kube-prometheus-stack Helm chart is large and has some ArgoCD-specific quirks you need to handle.

This guide covers deploying the Prometheus Operator with ArgoCD from start to finish.

## Prerequisites

You need a running Kubernetes cluster with ArgoCD installed. If you have not set up ArgoCD yet, the standard Helm or kubectl installation works fine. You also need at least 4 GB of available memory in your cluster, as the full kube-prometheus-stack includes Prometheus, Alertmanager, Grafana, and several exporters.

## The CRD Challenge

The kube-prometheus-stack chart ships several large CRDs - ServiceMonitor, PodMonitor, PrometheusRule, Prometheus, Alertmanager, and others. These CRDs are large enough to exceed the `metadata.annotations` size limit when using client-side apply.

The recommended approach is to manage CRDs separately from the main chart.

## Step 1: Deploy CRDs Separately

Create an ArgoCD Application for just the Prometheus CRDs:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prometheus-crds
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  project: default
  source:
    repoURL: https://github.com/prometheus-community/helm-charts.git
    targetRevision: kube-prometheus-stack-55.5.0
    path: charts/kube-prometheus-stack/charts/crds/crds
    directory:
      recurse: true
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      - ServerSideApply=true
      - Replace=true
```

Alternatively, you can use the dedicated CRD chart that the Prometheus community provides:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prometheus-crds
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  project: default
  source:
    repoURL: https://prometheus-community.github.io/helm-charts
    chart: prometheus-operator-crds
    targetRevision: 11.0.0
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      - ServerSideApply=true
```

## Step 2: Deploy the Prometheus Stack

Now create the main Application, telling Helm to skip CRD installation:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kube-prometheus-stack
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  project: default
  source:
    repoURL: https://prometheus-community.github.io/helm-charts
    chart: kube-prometheus-stack
    targetRevision: 55.5.0
    helm:
      skipCrds: true
      values: |
        # Prometheus configuration
        prometheus:
          prometheusSpec:
            retention: 15d
            retentionSize: "40GB"
            # Resource requests/limits
            resources:
              requests:
                cpu: 500m
                memory: 2Gi
              limits:
                memory: 4Gi
            # Persistent storage
            storageSpec:
              volumeClaimTemplate:
                spec:
                  storageClassName: gp3
                  accessModes: ["ReadWriteOnce"]
                  resources:
                    requests:
                      storage: 50Gi
            # Service monitor selector - pick up all ServiceMonitors
            serviceMonitorSelectorNilUsesHelmValues: false
            podMonitorSelectorNilUsesHelmValues: false
            ruleSelectorNilUsesHelmValues: false

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

        # Grafana configuration
        grafana:
          adminPassword: change-me-in-production
          persistence:
            enabled: true
            storageClassName: gp3
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

        # Node exporter
        nodeExporter:
          enabled: true

        # Kube state metrics
        kubeStateMetrics:
          enabled: true
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
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

## Step 3: Add Custom Health Checks

ArgoCD does not know how to check the health of Prometheus-specific resources by default. Add custom health checks to the argocd-cm ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.monitoring.coreos.com_Prometheus: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.conditions ~= nil then
        for i, condition in ipairs(obj.status.conditions) do
          if condition.type == "Available" and condition.status == "True" then
            hs.status = "Healthy"
            hs.message = "Prometheus is available"
            return hs
          end
          if condition.type == "Reconciled" and condition.status == "False" then
            hs.status = "Degraded"
            hs.message = condition.message
            return hs
          end
        end
      end
      hs.status = "Progressing"
      hs.message = "Waiting for Prometheus to be available"
    else
      hs.status = "Progressing"
      hs.message = "Waiting for status"
    end
    return hs

  resource.customizations.health.monitoring.coreos.com_Alertmanager: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.conditions ~= nil then
        for i, condition in ipairs(obj.status.conditions) do
          if condition.type == "Available" and condition.status == "True" then
            hs.status = "Healthy"
            hs.message = "Alertmanager is available"
            return hs
          end
        end
      end
      hs.status = "Progressing"
      hs.message = "Waiting for Alertmanager"
    else
      hs.status = "Progressing"
      hs.message = "Waiting for status"
    end
    return hs
```

## Step 4: Add ServiceMonitors for Your Applications

With the Prometheus Operator running, you can now define ServiceMonitors for your applications. Store these in Git alongside your application manifests:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: my-api-monitor
  namespace: default
  labels:
    release: kube-prometheus-stack
spec:
  selector:
    matchLabels:
      app: my-api
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

## Step 5: Add PrometheusRules for Alerting

Define alerting rules as PrometheusRule resources:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: api-alerts
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  groups:
    - name: api.rules
      rules:
        - alert: HighErrorRate
          expr: |
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            / sum(rate(http_requests_total[5m])) > 0.05
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "High error rate detected"
            description: "Error rate is above 5% for the last 5 minutes"
        - alert: HighLatency
          expr: |
            histogram_quantile(0.99,
              sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
            ) > 2
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High latency detected"
            description: "99th percentile latency is above 2 seconds"
```

## Handling Upgrades

Upgrading the kube-prometheus-stack requires updating both the CRD Application and the main chart Application. Always update CRDs first:

1. Update `prometheus-crds` Application `targetRevision` to the new CRD version
2. Wait for the CRD sync to complete
3. Update `kube-prometheus-stack` Application `targetRevision`
4. Monitor the sync

```bash
# Check CRD sync status
argocd app get prometheus-crds

# Check stack sync status
argocd app get kube-prometheus-stack

# View sync details if something goes wrong
argocd app get kube-prometheus-stack --show-operation
```

## Dealing with Diff Noise

The kube-prometheus-stack generates many resources with default values that can cause diff noise in ArgoCD. Use resource exclusions to ignore known noisy fields:

```yaml
# In argocd-cm ConfigMap
data:
  resource.customizations.ignoreDifferences.admissionregistration.k8s.io_MutatingWebhookConfiguration: |
    jqPathExpressions:
      - '.webhooks[]?.clientConfig.caBundle'
  resource.customizations.ignoreDifferences.admissionregistration.k8s.io_ValidatingWebhookConfiguration: |
    jqPathExpressions:
      - '.webhooks[]?.clientConfig.caBundle'
```

## Git Repository Structure

Here is the recommended layout for your monitoring configuration:

```text
platform/
  monitoring/
    crds/
      kustomization.yaml     # References CRD Application
    prometheus-stack/
      application.yaml       # ArgoCD Application for the stack
      values.yaml            # Helm values
    service-monitors/
      api-monitor.yaml
      web-monitor.yaml
    alerting-rules/
      api-alerts.yaml
      infra-alerts.yaml
    dashboards/
      api-dashboard.json
      infra-dashboard.json
```

## Summary

Deploying the Prometheus Operator with ArgoCD requires separating CRDs from the main chart, using server-side apply, and adding custom health checks. Once set up, you get a fully GitOps-managed monitoring stack where every ServiceMonitor, PrometheusRule, and Grafana dashboard is version-controlled. For more on managing operators with ArgoCD, see our guide on [deploying Kubernetes operators with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-how-to-deploy-kubernetes-operators-with-argocd/view).
