# How to Use Grafana API Keys for Programmatic Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, API, Automation

Description: Master Grafana API keys to enable programmatic access for automation, CI/CD pipelines, and integrations by creating, managing, and securing keys with proper scopes and permissions.

---

The Grafana UI is great for humans, but automation needs APIs. Whether you're exporting dashboards, creating alerts, or integrating with CI/CD pipelines, you need programmatic access to Grafana.

API keys provide this access. They let scripts, tools, and services interact with Grafana without requiring username and password authentication. Understanding how to create and manage these keys is essential for automating your monitoring infrastructure.

## Understanding Grafana Authentication Methods

Grafana supports several authentication methods:

- **Basic Auth**: Username and password
- **API Keys**: Long-lived tokens for service accounts
- **Service Accounts**: Modern alternative with token management (Grafana 9+)

API keys are simpler for most use cases, though service accounts offer more flexibility in newer Grafana versions.

## Creating API Keys via UI

The simplest way to create an API key:

1. Navigate to Configuration > API Keys
2. Click "New API Key"
3. Set name, role, and expiration
4. Click "Add"
5. Copy the key immediately

The key is only shown once. Store it securely.

## Creating API Keys via API

For automation, create keys programmatically:

```bash
# Create an API key with Admin role
curl -X POST http://grafana.example.com/api/auth/keys \
  -H "Content-Type: application/json" \
  -u admin:admin \
  -d '{
    "name": "automation-key",
    "role": "Admin",
    "secondsToLive": 86400
  }'
```

Response includes the key:

```json
{
  "id": 1,
  "name": "automation-key",
  "key": "eyJrIjoiT0tTcG1pUlY2RnVKZTFVaDFsNFZXdE9ZWmNrMkZYbk"
}
```

Store this key in a secure location like Kubernetes secrets.

## Managing API Keys in Kubernetes

Store API keys as Kubernetes secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: grafana-api-key
  namespace: monitoring
type: Opaque
stringData:
  api-key: "eyJrIjoiT0tTcG1pUlY2RnVKZTFVaDFsNFZXdE9ZWmNrMkZYbk"
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
            image: curlimages/curl:latest
            env:
            - name: GRAFANA_API_KEY
              valueFrom:
                secretKeyRef:
                  name: grafana-api-key
                  key: api-key
            - name: GRAFANA_URL
              value: "http://grafana:3000"
            command:
            - /bin/sh
            - -c
            - |
              # Export all dashboards
              curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
                "$GRAFANA_URL/api/search?type=dash-db" | \
                jq -r '.[] | .uid' | while read uid; do
                  curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
                    "$GRAFANA_URL/api/dashboards/uid/$uid" > "/backup/$uid.json"
                done
            volumeMounts:
            - name: backup
              mountPath: /backup
          volumes:
          - name: backup
            emptyDir: {}
          restartPolicy: OnFailure
```

## Understanding API Key Roles

Grafana API keys have three role levels:

- **Viewer**: Read-only access to dashboards and data
- **Editor**: Can create and modify dashboards
- **Admin**: Full access including user management

Choose the minimal role needed:

```bash
# Create Viewer key for monitoring tools
curl -X POST http://grafana.example.com/api/auth/keys \
  -H "Content-Type: application/json" \
  -u admin:admin \
  -d '{
    "name": "readonly-monitoring",
    "role": "Viewer",
    "secondsToLive": 0
  }'

# Create Editor key for dashboard automation
curl -X POST http://grafana.example.com/api/auth/keys \
  -H "Content-Type: application/json" \
  -u admin:admin \
  -d '{
    "name": "dashboard-manager",
    "role": "Editor",
    "secondsToLive": 2592000
  }'

# Create Admin key for full automation (use sparingly)
curl -X POST http://grafana.example.com/api/auth/keys \
  -H "Content-Type: application/json" \
  -u admin:admin \
  -d '{
    "name": "admin-automation",
    "role": "Admin",
    "secondsToLive": 604800
  }'
```

## Common API Operations

Here are practical examples using API keys:

### Exporting Dashboards

```bash
#!/bin/bash
# export-dashboards.sh

GRAFANA_URL="http://grafana.example.com"
API_KEY="eyJrIjoiT0tTcG1pUlY2RnVKZTFVaDFsNFZXdE9ZWmNrMkZYbk"
OUTPUT_DIR="./dashboards"

mkdir -p $OUTPUT_DIR

# Get all dashboards
curl -s -H "Authorization: Bearer $API_KEY" \
  "$GRAFANA_URL/api/search?type=dash-db" | \
  jq -r '.[] | "\(.uid) \(.title)"' | while read uid title; do

  echo "Exporting: $title"
  curl -s -H "Authorization: Bearer $API_KEY" \
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
API_KEY="eyJrIjoiT0tTcG1pUlY2RnVKZTFVaDFsNFZXdE9ZWmNrMkZYbk"

# Create new dashboard
curl -X POST "$GRAFANA_URL/api/dashboards/db" \
  -H "Authorization: Bearer $API_KEY" \
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
          "type": "graph",
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
API_KEY="eyJrIjoiT0tTcG1pUlY2RnVKZTFVaDFsNFZXdE9ZWmNrMkZYbk"

# Create Prometheus data source
curl -X POST "$GRAFANA_URL/api/datasources" \
  -H "Authorization: Bearer $API_KEY" \
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
API_KEY="eyJrIjoiT0tTcG1pUlY2RnVKZTFVaDFsNFZXdE9ZWmNrMkZYbk"

# Create alert rule
curl -X POST "$GRAFANA_URL/api/v1/provisioning/alert-rules" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "high-cpu-alert",
    "title": "High CPU Usage",
    "condition": "A",
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
          "refId": "A"
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

## Rotating API Keys

Implement key rotation for security:

```bash
#!/bin/bash
# rotate-api-key.sh

GRAFANA_URL="http://grafana.example.com"
ADMIN_USER="admin"
ADMIN_PASS="admin"
KEY_NAME="automation-key"

# List existing keys
EXISTING_KEY_ID=$(curl -s -u $ADMIN_USER:$ADMIN_PASS \
  "$GRAFANA_URL/api/auth/keys" | \
  jq -r ".[] | select(.name==\"$KEY_NAME\") | .id")

# Create new key
NEW_KEY=$(curl -s -X POST "$GRAFANA_URL/api/auth/keys" \
  -H "Content-Type: application/json" \
  -u $ADMIN_USER:$ADMIN_PASS \
  -d "{
    \"name\": \"$KEY_NAME\",
    \"role\": \"Admin\",
    \"secondsToLive\": 2592000
  }" | jq -r '.key')

echo "New API key: $NEW_KEY"

# Update secret in Kubernetes
kubectl create secret generic grafana-api-key \
  -n monitoring \
  --from-literal=api-key="$NEW_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -

# Wait for pods to pick up new secret
sleep 30

# Delete old key
if [ ! -z "$EXISTING_KEY_ID" ]; then
  curl -X DELETE "$GRAFANA_URL/api/auth/keys/$EXISTING_KEY_ID" \
    -u $ADMIN_USER:$ADMIN_PASS
  echo "Deleted old key ID: $EXISTING_KEY_ID"
fi
```

## Automating Key Creation on Grafana Startup

Create API keys automatically when Grafana starts:

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
        image: curlimages/curl:latest
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
          # Wait for Grafana to be ready
          until curl -sf $GRAFANA_URL/api/health; do
            echo "Waiting for Grafana..."
            sleep 5
          done

          # Create API keys for different purposes
          echo "Creating API keys..."

          # Viewer key for monitoring
          curl -X POST "$GRAFANA_URL/api/auth/keys" \
            -H "Content-Type: application/json" \
            -u $ADMIN_USER:$ADMIN_PASS \
            -d '{
              "name": "monitoring-viewer",
              "role": "Viewer",
              "secondsToLive": 0
            }' | jq -r '.key' > /secrets/viewer-key

          # Editor key for automation
          curl -X POST "$GRAFANA_URL/api/auth/keys" \
            -H "Content-Type: application/json" \
            -u $ADMIN_USER:$ADMIN_PASS \
            -d '{
              "name": "automation-editor",
              "role": "Editor",
              "secondsToLive": 2592000
            }' | jq -r '.key' > /secrets/editor-key

          echo "API keys created"
        volumeMounts:
        - name: secrets
          mountPath: /secrets
      volumes:
      - name: secrets
        emptyDir: {}
      restartPolicy: Never
```

## Monitoring API Key Usage

Track API key usage with Grafana metrics:

```bash
# View API key usage metrics
curl -H "Authorization: Bearer $API_KEY" \
  http://grafana.example.com/metrics | grep api_key

# List all API keys and their last usage
curl -H "Authorization: Bearer $API_KEY" \
  http://grafana.example.com/api/auth/keys | \
  jq -r '.[] | "\(.name) - Last used: \(.lastSeenAt // "never")"'
```

Create alerts for suspicious activity:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-api-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: grafana-api
      rules:
      - alert: UnusedAPIKeys
        expr: time() - grafana_api_keys_last_used_at > 2592000
        annotations:
          summary: "API key unused for 30 days"

      - alert: ExcessiveAPIUsage
        expr: rate(grafana_api_request_total[5m]) > 100
        for: 5m
        annotations:
          summary: "High API request rate detected"
```

## Security Best Practices

Follow these guidelines for secure API key management:

1. **Use minimal permissions**: Assign the lowest role needed for each key.
2. **Set expiration**: Don't create keys that never expire for automation.
3. **Rotate regularly**: Implement automated key rotation every 30-90 days.
4. **Store securely**: Use Kubernetes secrets or secret management systems.
5. **Monitor usage**: Track which keys are used and when.
6. **Delete unused keys**: Remove keys that haven't been used in 30+ days.
7. **One key per service**: Don't share keys across multiple services.
8. **Audit access**: Log all API key creation and deletion.

## Migrating to Service Accounts

For Grafana 9+, consider migrating to service accounts:

```bash
# Create service account (Grafana 9+)
curl -X POST "$GRAFANA_URL/api/serviceaccounts" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "automation-sa",
    "role": "Editor"
  }'

# Create token for service account
SA_ID=$(curl -s -H "Authorization: Bearer $API_KEY" \
  "$GRAFANA_URL/api/serviceaccounts/search" | \
  jq -r '.serviceAccounts[] | select(.name=="automation-sa") | .id')

curl -X POST "$GRAFANA_URL/api/serviceaccounts/$SA_ID/tokens" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "automation-token",
    "secondsToLive": 2592000
  }'
```

Service accounts provide better token management and permissions, making them preferable for new deployments.

## Troubleshooting API Key Issues

Common problems and solutions:

```bash
# Test if API key works
curl -H "Authorization: Bearer $API_KEY" \
  http://grafana.example.com/api/user

# If 401 Unauthorized:
# - Check key hasn't expired
# - Verify key is correct (no extra spaces)
# - Ensure API keys are enabled in Grafana config

# Check Grafana configuration
kubectl exec -n monitoring -it $(kubectl get pod -n monitoring -l app=grafana -o jsonpath='{.items[0].metadata.name}') -- \
  cat /etc/grafana/grafana.ini | grep -A 5 "auth"

# View recent API requests
kubectl logs -n monitoring -l app=grafana | grep "api_key"
```

API keys are the foundation of Grafana automation. By understanding how to create, manage, and secure them, you can build robust automation that integrates Grafana into your broader infrastructure and CI/CD workflows.
