# How to Set Up Alerts for Flux CD Controller Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Monitoring, Alerting, Prometheus, Alertmanager

Description: Learn how to configure Prometheus alerts that fire when Flux CD controllers encounter errors, ensuring rapid incident response for your GitOps pipelines.

---

Flux CD controllers are the backbone of your GitOps workflow. When a source-controller fails to fetch a repository, or a kustomize-controller cannot apply manifests, you need to know immediately. In this guide, we walk through setting up Prometheus-based alerts for Flux CD controller errors so that your team gets notified before problems cascade.

## Prerequisites

Before you begin, make sure you have the following in place:

- A Kubernetes cluster with Flux CD installed
- Prometheus and Alertmanager deployed (for example, via the kube-prometheus-stack Helm chart)
- Flux CD controllers exposing metrics on their default `/metrics` endpoint
- kube-state-metrics configured to expose Flux custom resource state metrics, as in the Flux monitoring example

## Understanding Flux CD Controller Metrics

Flux CD controllers and kube-state-metrics expose several Prometheus metrics. The most important ones for error alerting are:

- **gotk_resource_info** -- Reports the current state of Flux custom resources, including their Ready condition when kube-state-metrics is configured for Flux resources
- **gotk_reconcile_duration_seconds** -- Tracks how long reconciliations take
- **controller_runtime_reconcile_total** -- Counts reconciliations by result, including errors

These metrics include labels such as `customresource_kind`, `name`, `exported_namespace`, `controller`, and `result`, making it straightforward to build targeted alerts.

## Step 1: Verify Metrics Are Being Scraped

First, confirm that Prometheus is scraping Flux CD controller pods. Flux CD controllers expose metrics on port 8080 by default.

Create a PodMonitor to ensure Prometheus discovers Flux CD metrics:

```yaml
# podmonitor.yaml - Tells Prometheus to scrape Flux CD controller metrics

apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: flux-system
  namespace: flux-system
  labels:
    app.kubernetes.io/part-of: flux
spec:
  namespaceSelector:
    matchNames:
      - flux-system
  selector:
    matchExpressions:
      - key: app
        operator: In
        values:
          - source-controller
          - kustomize-controller
          - helm-controller
          - notification-controller
  podMetricsEndpoints:
    - port: http-prom
      interval: 30s
      path: /metrics
```

Apply the PodMonitor:

```bash
# Apply the PodMonitor to your cluster
kubectl apply -f podmonitor.yaml
```

## Step 2: Create PrometheusRule for Controller Errors

Now define alerting rules that fire when Flux CD controllers report errors. Create a PrometheusRule resource:

```yaml
# flux-alerts.yaml - Prometheus alerting rules for Flux CD controller errors
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-controller-alerts
  namespace: flux-system
  labels:
    app.kubernetes.io/part-of: flux
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
    - name: flux-controller-errors
      rules:
        # Alert when any Flux reconciliation is failing
        - alert: FluxReconciliationFailure
          expr: |
            gotk_resource_info{ready="False", suspended!="true"} == 1
          for: 10m
          labels:
            namespace: flux-system
            severity: critical
          annotations:
            summary: "Flux reconciliation failure for {{ $labels.customresource_kind }}/{{ $labels.name }}"
            description: >
              {{ $labels.customresource_kind }} {{ $labels.exported_namespace }}/{{ $labels.name }}
              has been failing reconciliation for more than 10 minutes.

        # Alert when reconciliation errors are increasing
        - alert: FluxReconcileErrorRate
          expr: |
            rate(controller_runtime_reconcile_total{namespace="flux-system", result="error"}[5m]) > 0
          for: 5m
          labels:
            namespace: flux-system
            severity: warning
          annotations:
            summary: "Flux controller {{ $labels.controller }} is generating reconcile errors"
            description: >
              Controller {{ $labels.controller }} in flux-system namespace
              has a non-zero reconciliation error rate.

        # Alert when a Flux controller pod is restarting frequently
        - alert: FluxControllerRestarting
          expr: |
            increase(kube_pod_container_status_restarts_total{namespace="flux-system", pod=~".*-controller-.*", container="manager"}[1h]) > 0
          for: 5m
          labels:
            namespace: flux-system
            severity: warning
          annotations:
            summary: "Flux controller pod {{ $labels.pod }} is restarting"
            description: >
              Pod {{ $labels.pod }} in flux-system namespace has restarted
              in the last hour.
```

Apply the alerting rules:

```bash
# Apply the PrometheusRule to your cluster
kubectl apply -f flux-alerts.yaml
```

## Step 3: Configure Alertmanager Routing

Next, configure Alertmanager to route Flux CD alerts to the appropriate notification channel. Here is an example that sends Flux alerts to a Slack channel:

```yaml
# alertmanager-config.yaml - Route Flux alerts to Slack
apiVersion: monitoring.coreos.com/v1beta1
kind: AlertmanagerConfig
metadata:
  name: flux-alertmanager-config
  namespace: flux-system
  labels:
    alertmanagerConfig: flux
spec:
  route:
    receiver: flux-slack
    matchers:
      - name: alertname
        matchType: =~
        value: "Flux.*"
    groupBy:
      - alertname
      - namespace
    groupWait: 30s
    groupInterval: 5m
    repeatInterval: 4h
  receivers:
    - name: flux-slack
      slackConfigs:
        - channel: "#flux-alerts"
          sendResolved: true
          apiURL:
            name: slack-webhook-url
            key: url
          title: '{{ .GroupLabels.alertname }}'
          text: >
            {{ range .Alerts }}
            *{{ .Annotations.summary }}*
            {{ .Annotations.description }}
            {{ end }}
```

Make sure your Alertmanager resource is configured to select this `AlertmanagerConfig` label.

## Step 4: Verify Alerts Are Working

You can verify your alerts are loaded in Prometheus by port-forwarding to the Prometheus UI:

```bash
# Port-forward to Prometheus to check alert rules
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090
```

Then visit `http://localhost:9090/alerts` in your browser. You should see the `FluxReconciliationFailure`, `FluxReconcileErrorRate`, and `FluxControllerRestarting` rules listed.

To test that alerts fire correctly, you can intentionally break a GitRepository source by pointing it to an invalid URL:

```bash
# Temporarily break a source to test alerting (revert after testing)
flux create source git test-broken \
  --url=https://github.com/invalid/does-not-exist \
  --branch=main \
  --interval=1m \
  --namespace=flux-system
```

After about 10 minutes, the `FluxReconciliationFailure` alert should fire if kube-state-metrics is exporting `gotk_resource_info` for Flux resources. Remember to clean up:

```bash
# Remove the test source after verifying the alert
flux delete source git test-broken --namespace=flux-system
```

## Step 5: Use Flux Notification Controller as a Complement

In addition to Prometheus alerts, Flux CD has a built-in notification controller that can send alerts to various providers. This is useful as a secondary notification path:

```yaml
# flux-provider.yaml - Configure Flux native alerting to Slack
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-provider
  namespace: flux-system
spec:
  type: slack
  secretRef:
    name: slack-webhook
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: flux-controller-errors
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: error
  eventSources:
    - kind: GitRepository
      name: "*"
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
    - kind: HelmRepository
      name: "*"
```

## Summary

Setting up alerts for Flux CD controller errors involves three layers: ensuring Prometheus scrapes Flux controller metrics via PodMonitors and Flux resource state metrics via kube-state-metrics, defining PrometheusRules that match on key error conditions like `gotk_resource_info` readiness failures and `controller_runtime_reconcile_total` errors, and routing those alerts through Alertmanager to your team's notification channels. Combining Prometheus alerting with Flux's native notification controller gives you defense in depth. Integrate these alerts with a monitoring platform like OneUptime to centralize your incident response and track mean time to recovery for your GitOps pipeline failures.
