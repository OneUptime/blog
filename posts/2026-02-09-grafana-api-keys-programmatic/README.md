# How to Use Grafana API Keys for Programmatic Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, API, Automation

Description: Master Grafana API keys to enable programmatic access for automation, CI/CD pipelines, and integrations by creating, managing, and securing keys with proper scopes and permissions.

---

The Grafana UI is great for humans, but automation needs APIs. Whether you're exporting dashboards, creating alerts, or integrating with CI/CD pipelines, you need programmatic access to Grafana.

Service account tokens provide this access in current Grafana versions. They let scripts, tools, and services interact with Grafana without requiring username and password authentication. Understanding how to create and manage these tokens is essential for automating your monitoring infrastructure.

## Understanding Grafana Authentication Methods

Grafana supports several authentication methods:

- **Basic Auth**: Username and password
- **Service Account Tokens**: Tokens for automated workloads and API access
- **API Keys**: Deprecated legacy tokens that service accounts now replace

Service accounts are the recommended method for API automation. API keys are deprecated, and Grafana recommends migrating them to service account tokens.

## Creating Service Account Tokens via UI

The simplest way to create a service account token:

1. Navigate to Administration > Users and access > Service accounts
2. Click "Add service account"
3. Set the service account name and role
4. Open the service account and click "Add service account token"
5. Set the token name and expiration
6. Copy the token immediately

The token is only shown once. Store it securely.

## Creating Service Account Tokens via API

For automation, create a service account and token programmatically:

```bash
# Create a service account with Admin role

curl -X POST http://grafana.example.com/api/serviceaccounts \
  -H "Content-Type: application/json" \
  -u admin:admin \
  -d '{
    "name": "automation-service-account",
    "role": "Admin"
  }'

# Create a token for the service account ID returned above
curl -X POST http://grafana.example.com/api/serviceaccounts/1/tokens \
  -H "Content-Type: application/json" \
  -u admin:admin \
  -d '{
    "name": "automation-token",
    "secondsToLive": 86400
  }'
```

The token creation response includes the key:

```json
{
  "id": 7,
  "name": "automation-token",
  "key": "eyJrIjoiT0tTcG1pUlY2RnVKZTFVaDFsNFZXdE9ZWmNrMkZYbk"
}
```

Store this token in a secure location like Kubernetes secrets.

## Managing Service Account Tokens in Kubernetes

Store service account tokens as Kubernetes secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: grafana-service-account-token
  namespace: monitoring
type: Opaque
stringData:
  token: "eyJrIjoiT0tTcG1pUlY2RnVKZTFVaDFsNFZXdE9ZWmNrMkZYbk"
```

Use in pods:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: grafana-backup
  namespace: monitoring
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: alpine:3.20
            env:
            - name: GRAFANA_TOKEN
              valueFrom:
                secretKeyRef:
                  name: grafana-service-account-token
                  key: token
            - name: GRAFANA_URL
              value: "http://grafana:3000"
            command:
            - /bin/sh
            - -c
            - |
              apk add --no-cache curl jq >/dev/null

              # Export all dashboards
              curl -H "Authorization: Bearer $GRAFANA_TOKEN" \
                "$GRAFANA_URL/api/search?type=dash-db" | \
                jq -r '.[] | .uid' | while read uid; do
                  curl -H "Authorization: Bearer $GRAFANA_TOKEN" \
                    "$GRAFANA_URL/api/dashboards/uid/$uid" > "/backup/$uid.json"
                done
            volumeMounts:
            - name: backup
              mountPath: /backup
          volumes:
          - name: backup
            persistentVolumeClaim:
              claimName: grafana-backup
          restartPolicy: OnFailure
```

## Understanding Service Account Roles

Grafana service accounts use role levels:

- **Viewer**: Read-only access to dashboards and data
- **Editor**: Can create and modify dashboards
- **Admin**: Organization-level administration for allowed APIs

Choose the minimal role needed:

```bash
# Create Viewer service account for monitoring tools
curl -X POST http://grafana.example.com/api/serviceaccounts \
  -H "Content-Type: application/json" \
  -u admin:admin \
  -d '{
    "name": "readonly-monitoring",
    "role": "Viewer"
  }'

# Create Editor service account for dashboard automation
curl -X POST http://grafana.example.com/api/serviceaccounts \
  -H "Content-Type: application/json" \
  -u admin:admin \
  -d '{
    "name": "dashboard-manager",
    "role": "Editor"
  }'

# Create Admin service account for full automation (use sparingly)
curl -X POST http://grafana.example.com/api/serviceaccounts \
  -H "Content-Type: application/json" \
  -u admin:admin \
  -d '{
    "name": "admin-automation",
    "role": "Admin"
  }'
```

## Common API Operations

Here are practical examples using service account tokens:

### Exporting Dashboards

```bash
#!/bin/bash
# export-dashboards.sh

GRAFANA_URL="http://grafana.example.com"
GRAFANA_TOKEN="eyJrIjoiT0tTcG1pUlY2RnVKZTFVaDFsNFZXdE9ZWmNrMkZYbk"
OUTPUT_DIR="./dashboards"

mkdir -p $OUTPUT_DIR

# Get all dashboards
curl -s -H "Authorization: Bearer $GRAFANA_TOKEN" \
  "$GRAFANA_URL/api/search?type=dash-db" | \
  jq -r '.[] | "\(.uid) \(.title)"' | while read uid title; do

  echo "Exporting: $title"
  curl -s -H "Authorization: Bearer $GRAFANA_TOKEN" \
    "$GRAFANA_URL/api/dashboards/uid/$uid" | \
    jq '.dashboard' > "$OUTPUT_DIR/${uid}.json"
done

echo "Export complete: $OUTPUT_DIR"
```

### Creating Dashboards

```bash
#!/bin/bash
# create-dashboard.sh

GRAFANA_URL="http://grafana.example.com"
GRAFANA_TOKEN="eyJrIjoiT0tTcG1pUlY2RnVKZTFVaDFsNFZXdE9ZWmNrMkZYbk"

# Create new dashboard
curl -X POST "$GRAFANA_URL/api/dashboards/db" \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dashboard": {
      "title": "Auto-Generated Dashboard",
      "uid": "auto-gen-001",
      "tags": ["automated"],
      "timezone": "browser",
      "panels": [
        {
          "id": 1,
          "title": "Sample Panel",
          "type": "timeseries",
          "targets": [
            {
              "expr": "up",
              "refId": "A"
            }
          ]
        }
      ]
    },
    "message": "Created by automation",
    "overwrite": false
  }'
```

### Managing Data Sources

```bash
#!/bin/bash
# create-datasource.sh

GRAFANA_URL="http://grafana.example.com"
GRAFANA_TOKEN="eyJrIjoiT0tTcG1pUlY2RnVKZTFVaDFsNFZXdE9ZWmNrMkZYbk"

# Create Prometheus data source
curl -X POST "$GRAFANA_URL/api/datasources" \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Prometheus-Production",
    "type": "prometheus",
    "url": "http://prometheus:9090",
    "access": "proxy",
    "isDefault": true,
    "jsonData": {
      "httpMethod": "POST",
      "timeInterval": "30s"
    }
  }'
```

### Creating Alerts

```bash
#!/bin/bash
# create-alert.sh

GRAFANA_URL="http://grafana.example.com"
GRAFANA_TOKEN="eyJrIjoiT0tTcG1pUlY2RnVKZTFVaDFsNFZXdE9ZWmNrMkZYbk"

# Create alert rule
curl -X POST "$GRAFANA_URL/api/v1/provisioning/alert-rules" \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "high-cpu-alert",
    "title": "High CPU Usage",
    "ruleGroup": "node-alerts",
    "folderUID": "alerts-folder",
    "orgId": 1,
    "condition": "B",
    "data": [
      {
        "refId": "A",
        "queryType": "",
        "relativeTimeRange": {
          "from": 600,
          "to": 0
        },
        "datasourceUid": "prometheus-uid",
        "model": {
          "expr": "avg(rate(node_cpu_seconds_total{mode!=\"idle\"}[5m])) > 0.8",
          "intervalMs": 1000,
          "maxDataPoints": 43200,
          "refId": "A"
        }
      },
      {
        "refId": "B",
        "queryType": "",
        "relativeTimeRange": {
          "from": 0,
          "to": 0
        },
        "datasourceUid": "-100",
        "model": {
          "conditions": [
            {
              "evaluator": {
                "params": [0],
                "type": "gt"
              },
              "operator": {
                "type": "and"
              },
              "query": {
                "params": ["A"]
              },
              "reducer": {
                "params": [],
                "type": "last"
              },
              "type": "query"
            }
          ],
          "datasource": {
            "type": "__expr__",
            "uid": "-100"
          },
          "intervalMs": 1000,
          "maxDataPoints": 43200,
          "refId": "B",
          "type": "classic_conditions"
        }
      }
    ],
    "noDataState": "NoData",
    "execErrState": "Error",
    "for": "5m",
    "annotations": {
      "summary": "CPU usage above 80%"
    },
    "labels": {
      "severity": "warning"
    }
  }'
```

## Rotating Service Account Tokens

Implement token rotation for security:

```bash
#!/bin/bash
# rotate-service-account-token.sh

GRAFANA_URL="http://grafana.example.com"
ADMIN_USER="admin"
ADMIN_PASS="admin"
SA_NAME="automation-service-account"
TOKEN_NAME="automation-token"

# Find the service account
SA_ID=$(curl -s -u $ADMIN_USER:$ADMIN_PASS \
  "$GRAFANA_URL/api/serviceaccounts/search?query=$SA_NAME" | \
  jq -r ".serviceAccounts[] | select(.name==\"$SA_NAME\") | .id")

# List existing tokens for this service account
EXISTING_TOKEN_ID=$(curl -s -u $ADMIN_USER:$ADMIN_PASS \
  "$GRAFANA_URL/api/serviceaccounts/$SA_ID/tokens" | \
  jq -r ".[] | select(.name==\"$TOKEN_NAME\") | .id")

# Create new token
NEW_TOKEN=$(curl -s -X POST "$GRAFANA_URL/api/serviceaccounts/$SA_ID/tokens" \
  -H "Content-Type: application/json" \
  -u $ADMIN_USER:$ADMIN_PASS \
  -d "{
    \"name\": \"$TOKEN_NAME\",
    \"secondsToLive\": 2592000
  }" | jq -r '.key')

echo "New service account token: $NEW_TOKEN"

# Update secret in Kubernetes
kubectl create secret generic grafana-service-account-token \
  -n monitoring \
  --from-literal=token="$NEW_TOKEN" \
  --dry-run=client -o yaml | kubectl apply -f -

# Wait for pods to pick up new secret
sleep 30

# Delete old token
if [ -n "$EXISTING_TOKEN_ID" ]; then
  curl -X DELETE "$GRAFANA_URL/api/serviceaccounts/$SA_ID/tokens/$EXISTING_TOKEN_ID" \
    -u $ADMIN_USER:$ADMIN_PASS
  echo "Deleted old token ID: $EXISTING_TOKEN_ID"
fi
```

## Automating Token Creation on Grafana Startup

Create service account tokens automatically when Grafana starts:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: grafana-setup
  namespace: monitoring
spec:
  template:
    spec:
      containers:
      - name: setup
        image: alpine:3.20
        env:
        - name: GRAFANA_URL
          value: "http://grafana:3000"
        - name: ADMIN_USER
          value: "admin"
        - name: ADMIN_PASS
          valueFrom:
            secretKeyRef:
              name: grafana-credentials
              key: admin-password
        command:
        - /bin/sh
        - -c
        - |
          apk add --no-cache curl jq kubectl >/dev/null

          # Wait for Grafana to be ready
          until curl -sf $GRAFANA_URL/api/health; do
            echo "Waiting for Grafana..."
            sleep 5
          done

          # Create service account tokens for different purposes
          echo "Creating service account tokens..."

          # Viewer service account and token for monitoring
          VIEWER_SA_ID=$(curl -s -X POST "$GRAFANA_URL/api/serviceaccounts" \
            -H "Content-Type: application/json" \
            -u $ADMIN_USER:$ADMIN_PASS \
            -d '{
              "name": "monitoring-viewer",
              "role": "Viewer"
            }' | jq -r '.id')

          VIEWER_TOKEN=$(curl -s -X POST "$GRAFANA_URL/api/serviceaccounts/$VIEWER_SA_ID/tokens" \
            -H "Content-Type: application/json" \
            -u $ADMIN_USER:$ADMIN_PASS \
            -d '{
              "name": "monitoring-viewer-token",
              "secondsToLive": 0
            }' | jq -r '.key')

          kubectl create secret generic monitoring-viewer-token \
            -n monitoring \
            --from-literal=token="$VIEWER_TOKEN" \
            --dry-run=client -o yaml | kubectl apply -f -

          # Editor service account and token for automation
          EDITOR_SA_ID=$(curl -s -X POST "$GRAFANA_URL/api/serviceaccounts" \
            -H "Content-Type: application/json" \
            -u $ADMIN_USER:$ADMIN_PASS \
            -d '{
              "name": "automation-editor",
              "role": "Editor"
            }' | jq -r '.id')

          EDITOR_TOKEN=$(curl -s -X POST "$GRAFANA_URL/api/serviceaccounts/$EDITOR_SA_ID/tokens" \
            -H "Content-Type: application/json" \
            -u $ADMIN_USER:$ADMIN_PASS \
            -d '{
              "name": "automation-editor-token",
              "secondsToLive": 2592000
            }' | jq -r '.key')

          kubectl create secret generic automation-editor-token \
            -n monitoring \
            --from-literal=token="$EDITOR_TOKEN" \
            --dry-run=client -o yaml | kubectl apply -f -

          echo "Service account tokens created"
      restartPolicy: Never
```

## Monitoring API Usage

Track API traffic with Grafana metrics and keep an inventory of service account tokens:

```bash
# View Grafana HTTP request metrics when metrics are enabled
curl http://grafana.example.com/metrics | grep grafana_http

# List service accounts
curl -H "Authorization: Bearer $GRAFANA_TOKEN" \
  http://grafana.example.com/api/serviceaccounts/search | \
  jq -r '.serviceAccounts[] | "\(.id) \(.name) \(.role)"'
```

## Security Best Practices

Follow these guidelines for secure service account token management:

1. **Use minimal permissions**: Assign the lowest role needed for each service account.
2. **Set expiration**: Don't create tokens that never expire for automation.
3. **Rotate regularly**: Implement automated token rotation every 30-90 days.
4. **Store securely**: Use Kubernetes secrets or secret management systems.
5. **Monitor usage**: Track API traffic and service account inventory.
6. **Delete unused tokens**: Remove tokens that are no longer needed.
7. **One token per service**: Don't share tokens across multiple services.
8. **Audit access**: Log all service account and token creation and deletion.

## Migrating to Service Accounts

If you still have legacy API keys, migrate them to service accounts:

```bash
# Create service account (Grafana 9+)
curl -X POST "$GRAFANA_URL/api/serviceaccounts" \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "automation-sa",
    "role": "Editor"
  }'

# Create token for service account
SA_ID=$(curl -s -H "Authorization: Bearer $GRAFANA_TOKEN" \
  "$GRAFANA_URL/api/serviceaccounts/search" | \
  jq -r '.serviceAccounts[] | select(.name=="automation-sa") | .id')

curl -X POST "$GRAFANA_URL/api/serviceaccounts/$SA_ID/tokens" \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "automation-token",
    "secondsToLive": 2592000
  }'
```

Service accounts provide better token management and permissions, making them preferable for new deployments.

## Troubleshooting Service Account Token Issues

Common problems and solutions:

```bash
# Test if service account token works
curl -H "Authorization: Bearer $GRAFANA_TOKEN" \
  http://grafana.example.com/api/user

# If 401 Unauthorized:
# - Check the token hasn't expired
# - Verify the token is correct (no extra spaces)
# - Ensure the service account is enabled and has the required role or RBAC permissions

# Check Grafana configuration
kubectl exec -n monitoring -it $(kubectl get pod -n monitoring -l app=grafana -o jsonpath='{.items[0].metadata.name}') -- \
  cat /etc/grafana/grafana.ini | grep -A 5 "service_accounts"

# View recent API requests
kubectl logs -n monitoring -l app=grafana | grep "api"
```

Service account tokens are the foundation of Grafana automation. By understanding how to create, manage, and secure them, you can build robust automation that integrates Grafana into your broader infrastructure and CI/CD workflows.
