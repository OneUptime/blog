# How to Use HelmRelease for Deploying Prometheus with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Prometheus, Monitoring, Alerting

Description: Learn how to deploy the Prometheus monitoring stack on Kubernetes using a Flux HelmRelease with the kube-prometheus-stack chart.

---

Prometheus is the de facto standard for monitoring Kubernetes clusters. The kube-prometheus-stack Helm chart bundles Prometheus, Alertmanager, Grafana, and a set of pre-configured recording rules and dashboards. Deploying this stack through Flux CD ensures your monitoring infrastructure is reproducible and version-controlled.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- A GitOps repository connected to Flux
- Sufficient cluster resources (the full stack requires approximately 2 CPU cores and 4 GB memory)

## Creating the HelmRepository

The Prometheus community maintains the official Helm charts.

```yaml
# helmrepository-prometheus.yaml - Prometheus community Helm chart repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: prometheus-community
  namespace: flux-system
spec:
  interval: 1h
  url: https://prometheus-community.github.io/helm-charts
```

## Deploying Prometheus with HelmRelease

The following HelmRelease deploys the full kube-prometheus-stack with Prometheus, Alertmanager, and node exporters. Grafana is included but can be disabled if you deploy it separately.

```yaml
# helmrelease-prometheus.yaml - Full kube-prometheus-stack deployment via Flux
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: monitoring
spec:
  interval: 15m
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "65.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
      interval: 15m
  install:
    createNamespace: true
    atomic: true
    timeout: 15m
    # CRDs are managed by the chart
    crds: CreateReplace
    remediation:
      retries: 3
  upgrade:
    atomic: true
    timeout: 15m
    crds: CreateReplace
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
  values:
    # Prometheus server configuration
    prometheus:
      prometheusSpec:
        # Data retention period
        retention: 15d
        # Storage configuration for persistent metrics
        storageSpec:
          volumeClaimTemplate:
            spec:
              accessModes:
                - ReadWriteOnce
              resources:
                requests:
                  storage: 50Gi
        # Resource requests and limits for the Prometheus server
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        # Scrape interval for all targets
        scrapeInterval: 30s
        # Evaluation interval for recording and alerting rules
        evaluationInterval: 30s
        # Enable service monitor auto-discovery across all namespaces
        serviceMonitorSelectorNilUsesHelmValues: false
        podMonitorSelectorNilUsesHelmValues: false
        ruleSelectorNilUsesHelmValues: false

    # Alertmanager configuration
    alertmanager:
      alertmanagerSpec:
        replicas: 2
        storage:
          volumeClaimTemplate:
            spec:
              accessModes:
                - ReadWriteOnce
              resources:
                requests:
                  storage: 10Gi
        resources:
          requests:
            cpu: 50m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
      # Alertmanager routing configuration
      config:
        global:
          resolve_timeout: 5m
        route:
          group_by:
            - alertname
            - namespace
          group_wait: 30s
          group_interval: 5m
          repeat_interval: 12h
          receiver: "null"
          routes:
            - match:
                severity: critical
              receiver: "null"
        receivers:
          - name: "null"

    # Grafana configuration (bundled with the stack)
    grafana:
      enabled: true
      adminPassword: "changeme"
      persistence:
        enabled: true
        size: 10Gi
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi
      # Default dashboards are included with the stack
      defaultDashboardsEnabled: true

    # Node exporter for host-level metrics
    nodeExporter:
      enabled: true

    # kube-state-metrics for Kubernetes object metrics
    kubeStateMetrics:
      enabled: true

    # Default alerting rules
    defaultRules:
      create: true
      rules:
        alertmanager: true
        etcd: true
        configReloaders: true
        general: true
        k8s: true
        kubeApiserverAvailability: true
        kubeApiserverBurnrate: true
        kubeApiserverHistogram: true
        kubeApiserverSlos: true
        kubeControllerManager: true
        kubelet: true
        kubeProxy: true
        kubePrometheusGeneral: true
        kubePrometheusNodeRecording: true
        kubernetesApps: true
        kubernetesResources: true
        kubernetesStorage: true
        kubernetesSystem: true
        kubeSchedulerAlerting: true
        kubeSchedulerRecording: true
        network: true
        node: true
        nodeExporterAlerting: true
        nodeExporterRecording: true
        prometheus: true
        prometheusOperator: true
```

## Configuring Service Monitors

With `serviceMonitorSelectorNilUsesHelmValues: false`, Prometheus will automatically discover ServiceMonitor resources in all namespaces. Here is an example ServiceMonitor for a custom application.

```yaml
# servicemonitor-app.yaml - ServiceMonitor for a custom application
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: my-app-metrics
  namespace: apps
  labels:
    release: kube-prometheus-stack
spec:
  selector:
    matchLabels:
      app: my-app
  endpoints:
    - port: metrics
      interval: 15s
      path: /metrics
```

## Verifying the Deployment

After Flux reconciles the HelmRelease, verify that all components are running.

```bash
# Check HelmRelease status
flux get helmrelease kube-prometheus-stack -n monitoring

# Verify all pods in the monitoring namespace
kubectl get pods -n monitoring

# Check that Prometheus is scraping targets
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090
# Then open http://localhost:9090/targets in your browser

# Access Grafana dashboards
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80
# Then open http://localhost:3000 (admin/changeme)

# Verify Alertmanager
kubectl port-forward -n monitoring svc/kube-prometheus-stack-alertmanager 9093:9093
```

## Customizing Alert Routing

To send alerts to external services like Slack or PagerDuty, update the Alertmanager configuration in the HelmRelease values.

```yaml
# Snippet: Alertmanager config with Slack notifications
alertmanager:
  config:
    global:
      resolve_timeout: 5m
      slack_api_url: "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
    route:
      group_by:
        - alertname
      receiver: slack-notifications
    receivers:
      - name: slack-notifications
        slack_configs:
          - channel: "#alerts"
            send_resolved: true
```

## Summary

Deploying the kube-prometheus-stack through Flux HelmRelease from `https://prometheus-community.github.io/helm-charts` gives you a complete, production-grade monitoring stack managed via GitOps. The chart includes Prometheus, Alertmanager, Grafana, node exporters, kube-state-metrics, and a comprehensive set of alerting rules and dashboards out of the box, all maintained declaratively in your Git repository.
