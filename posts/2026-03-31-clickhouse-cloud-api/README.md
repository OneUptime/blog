# How to Use ClickHouse Cloud API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Cloud, API, REST API, Automation, DevOps

Description: Learn how to use the ClickHouse Cloud REST API to manage services, users, and configurations programmatically for automation and infrastructure-as-code workflows.

---

The ClickHouse Cloud API is a REST API that gives you full programmatic control over your ClickHouse Cloud organization - creating services, managing users, configuring networking, and accessing usage metrics. It is the foundation for infrastructure-as-code and CI/CD integrations.

## Authentication

The API uses HTTP Basic authentication. Generate an API key in the ClickHouse Cloud console under "Organization Settings" - "API Keys" - this gives you a Key ID and Key Secret pair that you pass as the basic auth username and password:

```bash
export KEY_ID="your-key-id"
export KEY_SECRET="your-key-secret"
export ORG_ID="your-org-id"
```

## Base URL

```text
https://api.clickhouse.cloud/v1
```

## List All Services

```bash
curl --user "${KEY_ID}:${KEY_SECRET}" \
  https://api.clickhouse.cloud/v1/organizations/${ORG_ID}/services \
  | jq '.result[] | {id: .id, name: .name, state: .state}'
```

## Get Service Details

```bash
curl --user "${KEY_ID}:${KEY_SECRET}" \
  https://api.clickhouse.cloud/v1/organizations/${ORG_ID}/services/${SERVICE_ID}
```

## Create a Service

```bash
curl -X POST --user "${KEY_ID}:${KEY_SECRET}" \
  https://api.clickhouse.cloud/v1/organizations/${ORG_ID}/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "prod-analytics",
    "provider": "aws",
    "region": "us-east-1",
    "tier": "production",
    "minReplicaMemoryGb": 24,
    "maxReplicaMemoryGb": 96
  }'
```

## Update Service Settings

```bash
curl -X PATCH --user "${KEY_ID}:${KEY_SECRET}" \
  https://api.clickhouse.cloud/v1/organizations/${ORG_ID}/services/${SERVICE_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "ipAccessList": {
      "add": [
        {"source": "10.0.0.0/8", "description": "Internal network"}
      ]
    }
  }'
```

Note that `ipAccessList` on PATCH uses `add` and `remove` operation arrays rather than a direct list replacement. Memory and replica scaling settings are updated via a separate endpoint - use `PATCH /v1/organizations/{orgId}/services/{serviceId}/replicaScaling` (the recommended replica-based endpoint) rather than this one.

## Manage Organization Members

```bash
# List members
curl --user "${KEY_ID}:${KEY_SECRET}" \
  https://api.clickhouse.cloud/v1/organizations/${ORG_ID}/members
```

## Query Execution via API

You can also run SQL queries through the service's HTTP interface:

```bash
curl -X POST "https://${SERVICE_HOST}:8443" \
  -H "X-ClickHouse-User: default" \
  -H "X-ClickHouse-Key: ${PASSWORD}" \
  --data-binary "SELECT version() FORMAT JSON"
```

## API Rate Limits

The ClickHouse Cloud API rate limits each API key to 10 requests over a 10-second window, and each organization is capped at 100 API keys. Contact ClickHouse support if you need either limit raised. Requests that exceed the limit return HTTP 429 (Too Many Requests).

## Summary

The ClickHouse Cloud REST API covers the full lifecycle of service management - from provisioning and scaling to networking and user management. Use it to build Terraform providers, CI/CD workflows, and custom automation scripts that integrate ClickHouse Cloud into your infrastructure platform.
