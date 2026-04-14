# How to Send Dapr Logs to New Relic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, New Relic, Logging, Kubernetes, Observability

Description: Forward Dapr sidecar logs to New Relic using the New Relic Kubernetes integration for centralized log analysis and alerting.

---

New Relic provides log management capabilities that integrate with Kubernetes. This guide covers forwarding Dapr sidecar logs to New Relic using the nri-bundle Helm chart and querying them with NRQL.

## Prerequisites

- AKS, GKE, or EKS cluster with Dapr installed
- New Relic account with a license key
- Helm 3 installed

## Step 1 - Enable JSON Logging in Dapr

New Relic's log parser works best with JSON structured logs:

```yaml
metadata:
  annotations:
    dapr.io/enabled: "true"
    dapr.io/app-id: "checkout-service"
    dapr.io/log-as-json: "true"
    dapr.io/log-level: "info"
```

## Step 2 - Install New Relic Kubernetes Integration

```bash
helm repo add newrelic https://helm-charts.newrelic.com
helm repo update

helm install newrelic-bundle newrelic/nri-bundle \
  --namespace newrelic \
  --create-namespace \
  --set global.licenseKey=<YOUR_LICENSE_KEY> \
  --set global.cluster=my-dapr-cluster \
  --set newrelic-infrastructure.enabled=true \
  --set newrelic-logging.enabled=true \
  --set newrelic-logging.fluentBit.criEnabled=true
```

The `newrelic-logging` component deploys Fluent Bit as a DaemonSet to collect container logs.

## Step 3 - Configure Fluent Bit to Label Dapr Logs

Create a custom Fluent Bit configuration to add Dapr-specific labels:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: newrelic-logging-fluent-bit-config
  namespace: newrelic
data:
  filters.conf: |
    [FILTER]
        Name    kubernetes
        Match   kube.*
        Kube_URL https://kubernetes.default.svc:443
        Kube_CA_File /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File /var/run/secrets/kubernetes.io/serviceaccount/token
        Labels  On
        Annotations On

    [FILTER]
        Name    modify
        Match   kube.*daprd*
        Add     log_source dapr-sidecar
        Add     dapr.component sidecar
```

## Step 4 - Query Dapr Logs in New Relic

Use NRQL in the New Relic Query Builder:

```sql
-- All Dapr sidecar error logs in the last hour
SELECT *
FROM Log
WHERE container_name = 'daprd'
AND level = 'error'
SINCE 1 hour ago
LIMIT 100
```

```sql
-- Error rate by Dapr app over time
SELECT count(*)
FROM Log
WHERE container_name = 'daprd'
AND level = 'error'
FACET app_id
SINCE 24 hours ago
TIMESERIES 5 minutes
```

```sql
-- Find component initialization failures
SELECT message, app_id, component
FROM Log
WHERE container_name = 'daprd'
AND message LIKE '%failed%'
SINCE 1 hour ago
ORDER BY timestamp DESC
```

## Step 5 - Create a New Relic Alert

Alert on Dapr error log spikes using the NerdGraph API:

```graphql
mutation {
  alertsNrqlConditionStaticCreate(
    accountId: <YOUR_ACCOUNT_ID>
    policyId: <POLICY_ID>
    condition: {
      name: "Dapr Sidecar Errors"
      enabled: true
      nrql: {
        query: "SELECT count(*) FROM Log WHERE container_name = 'daprd' AND level = 'error'"
      }
      terms: [
        {
          threshold: 10
          thresholdOccurrences: ALL
          thresholdDuration: 300
          operator: ABOVE
          priority: CRITICAL
        }
      ]
    }
  ) {
    id
    name
  }
}
```

## Step 6 - Build a New Relic Dashboard

Create a dashboard with Dapr log insights using the NerdGraph `dashboardCreate` mutation:

```json
{
  "name": "Dapr Sidecar Logs",
  "permissions": "PUBLIC_READ_WRITE",
  "pages": [
    {
      "name": "Overview",
      "widgets": [
        {
          "title": "Error Count by App",
          "visualization": { "id": "viz.area" },
          "layout": { "column": 1, "row": 1, "height": 3, "width": 4 },
          "rawConfiguration": {
            "nrqlQueries": [
              {
                "accountId": "<YOUR_ACCOUNT_ID>",
                "query": "SELECT count(*) FROM Log WHERE container_name = 'daprd' AND level = 'error' FACET app_id TIMESERIES"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

## Summary

Sending Dapr logs to New Relic uses the nri-bundle Helm chart which deploys Fluent Bit for log collection. Enable JSON logging in Dapr to make NRQL queries more powerful by allowing field-level filtering. Use the `container_name = 'daprd'` filter in NRQL to isolate sidecar logs and build dashboards that track error rates, component failures, and initialization issues per Dapr app ID.
