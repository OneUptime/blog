# How to Create and Manage Services in ClickHouse Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Cloud, Service Management, Cloud, Provisioning, Administration

Description: Learn how to create, configure, and manage ClickHouse Cloud services including sizing, regions, and operational controls through the console and API.

---

ClickHouse Cloud is the managed service offering that handles infrastructure, replication, and backups for you. Managing services effectively means knowing how to provision, resize, pause, and delete them through both the web console and the API.

## Creating a Service via the Console

1. Log in to [clickhouse.cloud](https://clickhouse.cloud)
2. Click "New Service"
3. Choose a cloud provider (AWS, GCP, or Azure) and region
4. Select a tier: Basic, Scale, or Enterprise
5. Name your service and click "Create Service"

Services with idle scaling enabled will auto-pause after a period of inactivity to save costs. Services without idle scaling run continuously.

## Creating a Service via the API

The ClickHouse Cloud API authenticates with HTTP Basic Auth using your API key ID and secret:

```bash
curl -X POST https://api.clickhouse.cloud/v1/organizations/{orgId}/services \
  --user "$KEY_ID:$KEY_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "analytics-prod",
    "provider": "aws",
    "region": "us-east-1",
    "minReplicaMemoryGb": 24,
    "maxReplicaMemoryGb": 96,
    "numReplicas": 3
  }'
```

## Listing Services

```bash
curl https://api.clickhouse.cloud/v1/organizations/{orgId}/services \
  --user "$KEY_ID:$KEY_SECRET"
```

## Pausing and Resuming a Service

Services can be stopped to halt billing for compute:

```bash
# Stop
curl -X PATCH https://api.clickhouse.cloud/v1/organizations/{orgId}/services/{serviceId}/state \
  --user "$KEY_ID:$KEY_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"command": "stop"}'

# Start
curl -X PATCH https://api.clickhouse.cloud/v1/organizations/{orgId}/services/{serviceId}/state \
  --user "$KEY_ID:$KEY_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"command": "start"}'
```

## Connecting to Your Service

After creation, retrieve connection details from the console or API:

```bash
clickhouse client \
  --host your-service.clickhouse.cloud \
  --port 9440 \
  --user default \
  --password "$PASSWORD" \
  --secure
```

## Deleting a Service

```bash
curl -X DELETE https://api.clickhouse.cloud/v1/organizations/{orgId}/services/{serviceId} \
  --user "$KEY_ID:$KEY_SECRET"
```

Deleting a service also removes all associated data unless you have exported a backup.

## Monitoring Service Status

```bash
curl https://api.clickhouse.cloud/v1/organizations/{orgId}/services/{serviceId} \
  --user "$KEY_ID:$KEY_SECRET" \
  | jq '.result.state'
```

## Summary

ClickHouse Cloud services are created and managed through the web console or REST API. Use the Basic tier for development and small fixed-size workloads, the Scale tier for most production workloads, and the Enterprise tier for advanced security, compliance, and custom hardware needs. Automate service management with the API to integrate into your infrastructure pipelines.
