# How to Implement Tenant Offboarding with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Multi-Tenancy, Offboarding, Kubernetes, Data Cleanup

Description: Safely offboard Dapr tenants by draining workloads, exporting state data, removing components, deleting backend resources, and archiving the namespace.

---

## Tenant Offboarding Challenges

Offboarding a tenant from a Dapr multi-tenant system requires more than deleting a namespace. You must drain in-flight messages, export or archive tenant state data, clean up backend resources (Redis, Kafka topics, secrets), and ensure no data lingers in shared systems. Rushing this process causes data loss or orphaned resources.

## Step 1 - Stop New Requests

Scale down tenant workloads gracefully, allowing in-flight requests to complete:

```bash
TENANT_ID=$1

# Scale down all deployments in the tenant namespace
kubectl scale deployment --all --replicas=0 -n "$TENANT_ID"

# Wait for pods to terminate
kubectl wait --for=delete pod --all -n "$TENANT_ID" --timeout=120s
```

## Step 2 - Drain Pub/Sub Queues

Wait for pending messages to be processed before removing pub/sub components:

```bash
# For Kafka - check consumer group lag
kubectl exec -it kafka-0 -n messaging -- \
  kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --group "${TENANT_ID}-consumers" \
  | grep -v "^$"
```

If there are outstanding messages and the tenant wants them archived, use a drain job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: drain-pubsub
  namespace: {{ .Values.tenantId }}
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: drain
        image: myregistry/message-archiver:latest
        env:
        - name: TENANT_ID
          value: {{ .Values.tenantId }}
        - name: OUTPUT_BUCKET
          value: "s3://archive/{{ .Values.tenantId }}"
```

## Step 3 - Export State Data

Export all tenant state before deleting the state store:

```bash
# Export state from Redis to a file
kubectl exec -it redis-0 -n "$TENANT_ID" -- \
  redis-cli --rdb /tmp/tenant-dump.rdb

kubectl cp "$TENANT_ID/redis-0:/tmp/tenant-dump.rdb" \
  "./archive/${TENANT_ID}-$(date +%Y%m%d).rdb"
```

Or use a Dapr-aware export that reads via the state query API:

```bash
curl -X POST "http://tenant-api.${TENANT_ID}:3500/v1.0-alpha1/state/statestore/query" \
  -H "Content-Type: application/json" \
  -d '{"filter": {}}' \
  > "./archive/${TENANT_ID}-state.json"
```

## Step 4 - Remove Dapr Components

Delete Dapr custom resources for the tenant:

```bash
kubectl delete component --all -n "$TENANT_ID"
kubectl delete configuration --all -n "$TENANT_ID"
kubectl delete resiliency --all -n "$TENANT_ID"
kubectl delete subscription --all -n "$TENANT_ID"
```

## Step 5 - Delete Backend Resources

Remove backend infrastructure provisioned for the tenant:

```bash
# Remove Helm-installed Redis
helm uninstall "redis-${TENANT_ID}" -n "$TENANT_ID"

# Remove persistent volume claims
kubectl delete pvc --all -n "$TENANT_ID"
```

## Step 6 - Delete the Namespace

After confirming all data is archived:

```bash
kubectl delete namespace "$TENANT_ID"
```

## Offboarding Script

Combine all steps into an auditable script:

```bash
#!/bin/bash
# offboard-tenant.sh
set -e
TENANT_ID=$1
echo "Offboarding tenant: $TENANT_ID"

kubectl scale deployment --all --replicas=0 -n "$TENANT_ID"
sleep 30
helm uninstall "dapr-tenant-${TENANT_ID}" -n "$TENANT_ID" || true
helm uninstall "redis-${TENANT_ID}" -n "$TENANT_ID" || true
kubectl delete namespace "$TENANT_ID"
echo "Tenant $TENANT_ID offboarded at $(date -u)"
```

## Summary

Dapr tenant offboarding is a multi-step process: gracefully drain workloads and pub/sub queues, export and archive state data, remove Dapr CRDs and backend resources, and finally delete the namespace. Automating these steps in a script with audit logging ensures data integrity and prevents orphaned cloud resources from accumulating costs.
