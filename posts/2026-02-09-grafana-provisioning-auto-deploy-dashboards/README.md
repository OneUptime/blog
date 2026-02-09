# How to Use Grafana Provisioning to Auto-Deploy Kubernetes Dashboards from Git

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Kubernetes, GitOps, Provisioning, Automation

Description: Learn how to configure Grafana provisioning to automatically deploy dashboards from Git repositories in Kubernetes for GitOps-based dashboard management.

---

Manually importing dashboards into Grafana doesn't scale and lacks version control. Grafana provisioning automatically loads dashboards from ConfigMaps or files, enabling GitOps workflows where dashboards deploy automatically from Git commits.

This guide covers setting up automated dashboard provisioning in Kubernetes.

## Understanding Grafana Provisioning

Grafana provisioning loads configuration from files at startup and watches for changes. It supports provisioning:

- Datasources
- Dashboards
- Alert notification channels
- Plugins

Provisioned resources are marked read-only in the UI to prevent drift from the source of truth.

## Setting Up Dashboard Provisioning

Configure Grafana to load dashboards from a directory:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-provisioning
  namespace: monitoring
data:
  dashboards.yaml: |
    apiVersion: 1
    providers:
    - name: 'default'
      orgId: 1
      folder: 'Kubernetes'
      type: file
      disableDeletion: false
      updateIntervalSeconds: 30
      allowUiUpdates: false
      options:
        path: /var/lib/grafana/dashboards
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:10.2.0
        ports:
        - containerPort: 3000
        volumeMounts:
        - name: dashboard-provisioning
          mountPath: /etc/grafana/provisioning/dashboards
        - name: dashboards
          mountPath: /var/lib/grafana/dashboards
        env:
        - name: GF_PATHS_PROVISIONING
          value: /etc/grafana/provisioning
      volumes:
      - name: dashboard-provisioning
        configMap:
          name: grafana-dashboard-provisioning
      - name: dashboards
        configMap:
          name: grafana-dashboards
```

The `updateIntervalSeconds: 30` setting makes Grafana check for new dashboards every 30 seconds.

## Creating Dashboard ConfigMaps

Store dashboards in ConfigMaps:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboards
  namespace: monitoring
data:
  kubernetes-overview.json: |
    {
      "dashboard": {
        "title": "Kubernetes Cluster Overview",
        "tags": ["kubernetes"],
        "timezone": "browser",
        "panels": [
          {
            "title": "CPU Usage",
            "targets": [
              {
                "expr": "sum(rate(container_cpu_usage_seconds_total[5m]))"
              }
            ],
            "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
          }
        ]
      }
    }

  namespace-metrics.json: |
    {
      "dashboard": {
        "title": "Namespace Metrics",
        "tags": ["kubernetes", "namespace"],
        "panels": [...]
      }
    }
```

Grafana automatically loads all JSON files from the ConfigMap.

## Using Multiple Dashboard Providers

Organize dashboards into different folders:

```yaml
apiVersion: 1
providers:
- name: 'kubernetes-cluster'
  orgId: 1
  folder: 'Cluster Monitoring'
  type: file
  options:
    path: /var/lib/grafana/dashboards/cluster

- name: 'kubernetes-apps'
  orgId: 1
  folder: 'Application Monitoring'
  type: file
  options:
    path: /var/lib/grafana/dashboards/apps

- name: 'kubernetes-infra'
  orgId: 1
  folder: 'Infrastructure'
  type: file
  options:
    path: /var/lib/grafana/dashboards/infra
```

Mount separate ConfigMaps to each path:

```yaml
volumeMounts:
- name: cluster-dashboards
  mountPath: /var/lib/grafana/dashboards/cluster
- name: app-dashboards
  mountPath: /var/lib/grafana/dashboards/apps
- name: infra-dashboards
  mountPath: /var/lib/grafana/dashboards/infra

volumes:
- name: cluster-dashboards
  configMap:
    name: grafana-cluster-dashboards
- name: app-dashboards
  configMap:
    name: grafana-app-dashboards
- name: infra-dashboards
  configMap:
    name: grafana-infra-dashboards
```

## Automating Dashboard Updates from Git

Use a sidecar container to sync dashboards from Git:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  template:
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:10.2.0
        volumeMounts:
        - name: dashboards
          mountPath: /var/lib/grafana/dashboards

      # Sidecar to sync from Git
      - name: dashboard-syncer
        image: alpine/git:latest
        command:
        - sh
        - -c
        - |
          while true; do
            git clone --depth 1 https://github.com/myorg/grafana-dashboards.git /tmp/dashboards
            cp -r /tmp/dashboards/*.json /dashboards/
            rm -rf /tmp/dashboards
            sleep 60
          done
        volumeMounts:
        - name: dashboards
          mountPath: /dashboards

      volumes:
      - name: dashboards
        emptyDir: {}
```

Grafana picks up changes automatically every 30 seconds.

## Using Kustomize for Dashboard Management

Organize dashboards with Kustomize:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

configMapGenerator:
- name: grafana-dashboards
  namespace: monitoring
  files:
  - dashboards/kubernetes-overview.json
  - dashboards/namespace-metrics.json
  - dashboards/pod-metrics.json
  options:
    disableNameSuffixHash: true
```

Apply with:

```bash
kubectl apply -k .
```

## Provisioning Datasources

Auto-configure Prometheus datasource:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasource-provisioning
  namespace: monitoring
data:
  datasources.yaml: |
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      access: proxy
      url: http://prometheus.monitoring.svc.cluster.local:9090
      isDefault: true
      editable: false
      jsonData:
        timeInterval: 30s
        httpMethod: POST

    - name: Loki
      type: loki
      access: proxy
      url: http://loki.monitoring.svc.cluster.local:3100
      editable: false
```

Mount in Grafana:

```yaml
volumeMounts:
- name: datasource-provisioning
  mountPath: /etc/grafana/provisioning/datasources

volumes:
- name: datasource-provisioning
  configMap:
    name: grafana-datasource-provisioning
```

## Provisioning Alert Notification Channels

Configure Slack notifications:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-notifier-provisioning
  namespace: monitoring
data:
  notifiers.yaml: |
    apiVersion: 1
    notifiers:
    - name: Slack
      type: slack
      uid: slack-alerts
      org_id: 1
      is_default: true
      settings:
        url: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
        recipient: '#alerts'
        uploadImage: true
      secure_settings:
        url: ${SLACK_WEBHOOK_URL}

    - name: PagerDuty
      type: pagerduty
      uid: pagerduty-oncall
      settings:
        integrationKey: ${PAGERDUTY_KEY}
        autoResolve: true
```

Use environment variables for secrets:

```yaml
env:
- name: SLACK_WEBHOOK_URL
  valueFrom:
    secretKeyRef:
      name: grafana-secrets
      key: slack-webhook-url
- name: PAGERDUTY_KEY
  valueFrom:
    secretKeyRef:
      name: grafana-secrets
      key: pagerduty-key
```

## Helm Chart Integration

Use the Grafana Helm chart with provisioning:

```yaml
# values.yaml
datasources:
  datasources.yaml:
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      url: http://prometheus:9090
      isDefault: true

dashboardProviders:
  dashboardproviders.yaml:
    apiVersion: 1
    providers:
    - name: 'default'
      orgId: 1
      folder: ''
      type: file
      disableDeletion: false
      editable: false
      options:
        path: /var/lib/grafana/dashboards/default

dashboards:
  default:
    kubernetes-overview:
      json: |
        {{ .Files.Get "dashboards/kubernetes-overview.json" | indent 8 }}
    namespace-metrics:
      json: |
        {{ .Files.Get "dashboards/namespace-metrics.json" | indent 8 }}
```

Deploy with:

```bash
helm install grafana grafana/grafana -f values.yaml -n monitoring
```

## GitOps with ArgoCD

Manage dashboards via ArgoCD:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: grafana-dashboards
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/grafana-dashboards.git
    targetRevision: main
    path: dashboards
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

ArgoCD automatically syncs dashboard changes from Git.

## Validating Provisioned Dashboards

Check provisioning status:

```bash
# Get Grafana logs
kubectl logs -n monitoring deployment/grafana | grep -i provision

# Check mounted dashboards
kubectl exec -n monitoring deployment/grafana -- ls -la /var/lib/grafana/dashboards

# Verify dashboard JSON is valid
kubectl exec -n monitoring deployment/grafana -- cat /var/lib/grafana/dashboards/kubernetes-overview.json | jq empty
```

## Troubleshooting Provisioning

Common issues and solutions:

**Dashboards not appearing:**
```bash
# Check provisioning config
kubectl exec -n monitoring deployment/grafana -- cat /etc/grafana/provisioning/dashboards/dashboards.yaml

# Check file permissions
kubectl exec -n monitoring deployment/grafana -- ls -la /var/lib/grafana/dashboards
```

**JSON syntax errors:**
```bash
# Validate dashboard JSON
kubectl get configmap grafana-dashboards -n monitoring -o json | \
  jq -r '.data["kubernetes-overview.json"]' | jq empty
```

**Updates not reflected:**
```bash
# Force ConfigMap update
kubectl rollout restart deployment/grafana -n monitoring

# Check Grafana logs for errors
kubectl logs -n monitoring deployment/grafana --tail=100
```

## Dashboard Version Control Workflow

1. Developer creates dashboard in Grafana UI
2. Export dashboard JSON via API:

```bash
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  http://grafana:3000/api/dashboards/uid/kubernetes-overview | \
  jq '.dashboard' > kubernetes-overview.json
```

3. Commit to Git:

```bash
git add dashboards/kubernetes-overview.json
git commit -m "Update kubernetes overview dashboard"
git push
```

4. CI pipeline updates ConfigMap:

```bash
kubectl create configmap grafana-dashboards \
  --from-file=dashboards/ \
  --dry-run=client -o yaml | \
  kubectl apply -f -
```

5. Grafana automatically reloads dashboards

Grafana provisioning with Git integration creates a self-service dashboard platform where teams can update dashboards through standard Git workflows without manual imports.
