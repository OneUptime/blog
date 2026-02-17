# How to Set Up Grafana Alerting with Google Cloud Monitoring Backend on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Grafana, Cloud Monitoring, Alerting, Observability, Google Cloud

Description: Configure Grafana to use Google Cloud Monitoring as a data source and set up alerting rules that trigger notifications based on GCP metrics.

---

Grafana is the go-to visualization tool for many engineering teams, and Google Cloud Monitoring holds all the metrics about your GCP infrastructure. Connecting them gives you Grafana's powerful dashboarding and alerting capabilities on top of your native GCP metrics. You get the flexibility of Grafana's alerting rules - including multi-condition alerts, template variables, and notification routing - while still using Cloud Monitoring as your source of truth.

This guide covers setting up the Google Cloud Monitoring data source in Grafana, building queries, and configuring alerts that actually help your on-call team.

## Running Grafana on GCP

You can run Grafana on GKE, Compute Engine, or Cloud Run. For a quick production setup on GKE, use the official Helm chart.

```bash
# Add the Grafana Helm repository
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Grafana with persistent storage
helm install grafana grafana/grafana \
  --namespace monitoring \
  --create-namespace \
  --set persistence.enabled=true \
  --set persistence.size=10Gi \
  --set adminPassword=YOUR_ADMIN_PASSWORD \
  --set service.type=LoadBalancer
```

## Configuring the Google Cloud Monitoring Data Source

### Create a Service Account

Grafana needs a service account with permission to read metrics from Cloud Monitoring.

```bash
# Create a service account for Grafana
gcloud iam service-accounts create grafana-monitoring \
  --display-name="Grafana Cloud Monitoring Reader" \
  --project=my-project

# Grant the monitoring viewer role
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:grafana-monitoring@my-project.iam.gserviceaccount.com" \
  --role="roles/monitoring.viewer"

# Generate a key file
gcloud iam service-accounts keys create grafana-sa-key.json \
  --iam-account=grafana-monitoring@my-project.iam.gserviceaccount.com
```

### Add the Data Source in Grafana

You can configure the data source through the Grafana UI or through provisioning files. Here is the provisioning approach, which is better for infrastructure-as-code.

```yaml
# grafana-datasource-provisioning.yaml
# Provision the Google Cloud Monitoring data source automatically
apiVersion: 1
datasources:
  - name: Google Cloud Monitoring
    type: stackdriver
    access: proxy
    jsonData:
      # Authentication method - use the service account key
      authenticationType: jwt
      defaultProject: my-project
      tokenUri: https://oauth2.googleapis.com/token
      clientEmail: grafana-monitoring@my-project.iam.gserviceaccount.com
    secureJsonData:
      # The private key from your service account JSON key file
      privateKey: |
        -----BEGIN PRIVATE KEY-----
        YOUR_PRIVATE_KEY_HERE
        -----END PRIVATE KEY-----
    isDefault: true
    editable: false
```

If running on GKE with Workload Identity, you can skip the key file entirely.

```yaml
# Alternative: Use GKE Workload Identity for authentication
apiVersion: 1
datasources:
  - name: Google Cloud Monitoring
    type: stackdriver
    access: proxy
    jsonData:
      authenticationType: gce
      defaultProject: my-project
    isDefault: true
```

This approach binds the Grafana pod's Kubernetes service account to a GCP service account, eliminating the need for key files.

## Building Queries for GCP Metrics

The Google Cloud Monitoring data source in Grafana supports the full range of Cloud Monitoring metrics. Here are some useful query patterns.

### Compute Engine CPU Utilization

In the Grafana query editor, select the Google Cloud Monitoring data source and configure:

- Service: Compute Engine
- Metric: `compute.googleapis.com/instance/cpu/utilization`
- Group By: `resource.label.instance_name`
- Alignment: mean, 1 minute

### Cloud SQL Connection Count

```
# Grafana query for Cloud SQL active connections
Service: Cloud SQL
Metric: cloudsql.googleapis.com/database/network/connections
Filter: resource.label.database_id = "my-project:my-database"
Alignment: mean
Alignment Period: 60s
```

### GKE Container Memory Usage

```
# Query for GKE container memory by namespace
Service: Kubernetes
Metric: kubernetes.io/container/memory/used_bytes
Group By: resource.label.namespace_name, resource.label.pod_name
Filter: resource.label.cluster_name = "my-cluster"
```

## Setting Up Grafana Alerting

Grafana's unified alerting system lets you define alert rules, notification policies, and contact points all within Grafana.

### Create a Contact Point

First, set up where alerts should go. Here is an example for Slack.

```yaml
# grafana-alerting-contactpoints.yaml
# Define contact points for alert notifications
apiVersion: 1
contactPoints:
  - orgId: 1
    name: slack-oncall
    receivers:
      - uid: slack-1
        type: slack
        settings:
          url: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
          recipient: "#alerts-gcp"
          title: |
            {{ template "slack.default.title" . }}
          text: |
            {{ range .Alerts }}
            *Alert:* {{ .Labels.alertname }}
            *Severity:* {{ .Labels.severity }}
            *Description:* {{ .Annotations.description }}
            *Value:* {{ .Values }}
            {{ end }}
```

### Create Alert Rules

Now define rules that evaluate Cloud Monitoring metrics and fire alerts.

```yaml
# grafana-alert-rules.yaml
# Alert rules for GCP infrastructure monitoring
apiVersion: 1
groups:
  - orgId: 1
    name: gcp-infrastructure
    folder: GCP Alerts
    interval: 1m
    rules:
      # Alert when Compute Engine CPU exceeds 85% for 5 minutes
      - uid: gce-cpu-high
        title: High CPU on GCE Instance
        condition: C
        data:
          - refId: A
            relativeTimeRange:
              from: 300
              to: 0
            datasourceUid: google-cloud-monitoring
            model:
              metricType: compute.googleapis.com/instance/cpu/utilization
              crossSeriesReducer: REDUCE_MEAN
              perSeriesAligner: ALIGN_MEAN
              alignmentPeriod: 60s
              groupBys:
                - resource.label.instance_name
          - refId: B
            relativeTimeRange:
              from: 300
              to: 0
            datasourceUid: __expr__
            model:
              type: reduce
              expression: A
              reducer: mean
          - refId: C
            datasourceUid: __expr__
            model:
              type: threshold
              expression: B
              conditions:
                - evaluator:
                    type: gt
                    params: [0.85]
        for: 5m
        annotations:
          summary: "CPU utilization above 85% on {{ $labels.instance_name }}"
          description: "Instance {{ $labels.instance_name }} has had CPU above 85% for 5 minutes."
          runbook_url: "https://wiki.internal/runbooks/high-cpu"
        labels:
          severity: warning
          team: infrastructure

      # Alert when Cloud SQL disk usage exceeds 80%
      - uid: cloudsql-disk-high
        title: Cloud SQL Disk Usage High
        condition: C
        data:
          - refId: A
            datasourceUid: google-cloud-monitoring
            model:
              metricType: cloudsql.googleapis.com/database/disk/utilization
              crossSeriesReducer: REDUCE_MEAN
              perSeriesAligner: ALIGN_MEAN
              alignmentPeriod: 300s
              groupBys:
                - resource.label.database_id
          - refId: B
            datasourceUid: __expr__
            model:
              type: reduce
              expression: A
              reducer: last
          - refId: C
            datasourceUid: __expr__
            model:
              type: threshold
              expression: B
              conditions:
                - evaluator:
                    type: gt
                    params: [0.8]
        for: 10m
        annotations:
          summary: "Disk usage above 80% on {{ $labels.database_id }}"
        labels:
          severity: critical
          team: database
```

### Configure Notification Policies

Route alerts to the right team based on labels.

```yaml
# grafana-notification-policies.yaml
# Route alerts to appropriate teams based on labels
apiVersion: 1
policies:
  - orgId: 1
    receiver: slack-oncall
    group_by: ['alertname', 'team']
    group_wait: 30s
    group_interval: 5m
    repeat_interval: 4h
    routes:
      - receiver: slack-database-team
        matchers:
          - team = database
        continue: false
      - receiver: pagerduty-oncall
        matchers:
          - severity = critical
        continue: true
```

## Multi-Condition Alerts

One of Grafana's strengths is the ability to create alerts that combine multiple metrics. For example, alert only when both CPU is high and memory is high on the same instance.

```yaml
# Multi-condition alert: High CPU AND High Memory
- uid: gce-resource-exhaustion
  title: GCE Instance Resource Exhaustion
  condition: D
  data:
    - refId: A
      model:
        metricType: compute.googleapis.com/instance/cpu/utilization
    - refId: B
      model:
        metricType: compute.googleapis.com/instance/memory/balloon/ram_used
    - refId: C
      datasourceUid: __expr__
      model:
        type: math
        expression: "$A > 0.8 && $B > 0.9"
    - refId: D
      datasourceUid: __expr__
      model:
        type: threshold
        expression: C
        conditions:
          - evaluator:
              type: gt
              params: [0]
  for: 5m
  annotations:
    summary: "Both CPU and memory are critically high on {{ $labels.instance_name }}"
```

## Practical Tips

Test your alerts by temporarily lowering thresholds to values you know will trigger. There is nothing worse than discovering your alerting does not work during an actual incident.

Use Grafana's alert state history to review when alerts fire and resolve. This helps you tune thresholds to reduce false positives.

If you are running Grafana on GKE, use Workload Identity instead of service account keys. It is more secure and eliminates the key rotation problem.

Keep your alert rules in version control using the provisioning files. This makes them reproducible and auditable, which matters when your team asks why an alert was changed.

Grafana with Google Cloud Monitoring gives you a flexible and powerful alerting setup that covers GCP infrastructure metrics without locking you into a single vendor's tooling.
