# How to Implement Data Archival with Dapr State TTL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Store, TTL, Data Archival, Data Management

Description: Use Dapr state store TTL settings and scheduled archival workflows to automatically expire hot data and move it to cold storage.

---

State store TTL (Time To Live) in Dapr lets you automatically expire state entries after a defined period. For data archival, TTL removes hot data from fast state stores while Dapr Workflows or scheduled tasks migrate aging data to cold storage like object stores or data warehouses. This guide covers both approaches.

## Understanding Dapr State TTL

Dapr supports TTL for state items on backends that natively support expiry (Redis, Cassandra, CosmosDB). When an item expires, it is automatically deleted from the state store.

Set TTL when saving state:

```python
from dapr.clients import DaprClient
from datetime import timedelta

def save_session_with_ttl(session_id: str, data: dict, ttl_seconds: int = 3600):
    with DaprClient() as client:
        client.save_state(
            store_name="statestore",
            key=f"session:{session_id}",
            value=json.dumps(data),
            state_metadata={"ttlInSeconds": str(ttl_seconds)}
        )
```

Or via the HTTP API:

```bash
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{
    "key": "session:user123",
    "value": {"userId": "user123", "token": "abc"},
    "metadata": {"ttlInSeconds": "3600"}
  }]'
```

## Tiered TTL Strategy

Use different TTLs for different data tiers:

```python
# data_tier.py
TTL_SETTINGS = {
    'hot': 3600,          # 1 hour - frequently accessed session data
    'warm': 86400,        # 24 hours - recent transaction summaries
    'archive_trigger': 604800  # 7 days - data to archive before expiry
}

def save_with_tier(key: str, data: dict, tier: str = 'hot'):
    ttl = TTL_SETTINGS.get(tier, 3600)
    save_session_with_ttl(key, data, ttl_seconds=ttl)

    # Track items needing archival before TTL
    if tier == 'archive_trigger':
        with DaprClient() as client:
            archive_list = json.loads(
                client.get_state("statestore", "archive-pending").data or "[]"
            )
            archive_list.append({'key': key, 'archive_at':
                (datetime.utcnow() + timedelta(seconds=ttl - 86400)).isoformat()})
            client.save_state("statestore", "archive-pending",
                              json.dumps(archive_list))
```

## Archival Workflow with Dapr Workflow

Use Dapr Workflow to run scheduled archival jobs:

```python
from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowContext, WorkflowActivityContext

wfr = WorkflowRuntime()

@wfr.activity
def fetch_expiring_records(ctx: WorkflowActivityContext, input: dict) -> list:
    """Get records approaching TTL expiry"""
    with DaprClient() as client:
        archive_pending = json.loads(
            client.get_state("statestore", "archive-pending").data or "[]"
        )
        now = datetime.utcnow().isoformat()
        return [r for r in archive_pending if r['archive_at'] <= now]

@wfr.activity
def archive_to_cold_storage(ctx: WorkflowActivityContext, records: list) -> dict:
    """Move records to object storage via Dapr output binding"""
    with DaprClient() as client:
        for record in records:
            # Fetch full record
            data = client.get_state("statestore", record['key'])

            # Write to cold storage via Dapr binding (S3, Azure Blob, etc.)
            client.invoke_binding(
                binding_name="cold-storage",
                operation="create",
                data=data.data,
                binding_metadata={
                    "key": f"archive/{record['key']}/{datetime.utcnow().date()}"
                }
            )
    return {"archived": len(records)}

@wfr.workflow
def archival_workflow(ctx: DaprWorkflowContext, _: None):
    expiring = yield ctx.call_activity(fetch_expiring_records, input={})
    if expiring:
        result = yield ctx.call_activity(archive_to_cold_storage, input=expiring)
        ctx.set_custom_status(f"Archived {result['archived']} records")

    # Schedule next run in 1 hour
    yield ctx.create_timer(timedelta(hours=1))
    ctx.continue_as_new(None)
```

## Cold Storage Binding Configuration

Configure an S3 or Azure Blob binding for archival:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cold-storage
  namespace: default
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
    - name: bucket
      value: my-archive-bucket
    - name: region
      value: us-east-1
    - name: accessKey
      secretKeyRef:
        name: aws-secret
        key: accessKey
    - name: secretKey
      secretKeyRef:
        name: aws-secret
        key: secretKey
```

## Monitoring TTL Expiry

Track archival metrics with Prometheus:

```bash
# Monitor archive workflow execution
dapr workflow get archival-workflow-id --app-id archival-service
```

## Summary

Dapr state TTL automates expiry of hot data while Dapr Workflows and output bindings handle migration to cold storage before records disappear. This tiered archival approach keeps state stores lean and cost-effective while preserving historical data for compliance and analytics.
