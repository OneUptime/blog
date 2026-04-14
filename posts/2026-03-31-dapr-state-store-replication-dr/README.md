# How to Configure State Store Replication for Dapr DR

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Store, Replication, Disaster Recovery, Redis

Description: Learn how to configure state store replication for Dapr disaster recovery, covering Redis replication, Cosmos DB geo-replication, and failover cutover procedures.

---

## State Store Replication in Dapr DR

Dapr state stores hold application state that must survive regional failures. Effective state store replication ensures that when you fail over to a DR cluster, the new cluster's Dapr components can access consistent, up-to-date state. The replication strategy depends on the backing store technology.

## Redis Sentinel for High-Availability State

Configure Redis Sentinel for automatic failover within a region:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-sentinel:26379"
  - name: sentinelMasterName
    value: "mymaster"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
  - name: enableTLS
    value: "true"
  - name: failover
    value: "true"
```

## Redis Active-Passive Cross-Region Replication

Configure Redis replication from primary to DR region using Redis replication:

```bash
# On DR region Redis instance
redis-cli -h redis-dr.internal REPLICAOF redis-primary.us-east.internal 6379

# Verify replication lag
redis-cli -h redis-primary.us-east.internal INFO replication | grep master_repl_offset
redis-cli -h redis-dr.internal INFO replication | grep slave_repl_offset

# Check replication health
redis-cli -h redis-primary.us-east.internal INFO replication
```

## Azure Cosmos DB Multi-Region Writes

For Cosmos DB-backed state stores, enable geo-redundancy:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore-primary
  namespace: production
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    value: "https://mycosmosdb.documents.azure.com:443/"
  - name: masterKey
    secretKeyRef:
      name: cosmosdb-secret
      key: masterKey
  - name: database
    value: "AppState"
  - name: collection
    value: "StateCollection"
```

Configure geo-replication in Terraform:

```hcl
resource "azurerm_cosmosdb_account" "state_store" {
  name                = "mycosmosdb-state"
  resource_group_name = azurerm_resource_group.main.name
  location            = "eastus"
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = "eastus"
    failover_priority = 0
  }

  geo_location {
    location          = "westus"
    failover_priority = 1
  }

  enable_automatic_failover = true
}
```

## DR Cutover - Switching State Store

During failover, update the Dapr component to point to the DR state store:

```bash
#!/bin/bash
# state-store-failover.sh
DR_CONTEXT="k8s-dr-cluster"
NAMESPACE="production"

echo "[1] Updating state store to DR endpoint..."
kubectl --context="$DR_CONTEXT" patch component statestore \
  -n "$NAMESPACE" \
  --type='json' \
  -p='[{"op":"replace","path":"/spec/metadata/0/value","value":"redis-dr.internal:6379"}]'

echo "[2] Restarting services to pick up new component..."
kubectl --context="$DR_CONTEXT" rollout restart deployment \
  -n "$NAMESPACE"

echo "[3] Waiting for rollout..."
kubectl --context="$DR_CONTEXT" rollout status deployment \
  -n "$NAMESPACE" --timeout=300s

echo "[4] Verifying state store connectivity..."
curl -f "http://dr-service/health/state" && echo "State store OK"
```

## Verifying Replication Consistency

Test that state is replicated correctly before failover:

```bash
# Write test state via primary cluster
curl -X POST "http://primary-dapr:3500/v1.0/state/statestore" \
  -H "Content-Type: application/json" \
  -d '[{"key": "dr-test", "value": "test-value"}]'

# Read from DR cluster to verify replication
curl "http://dr-dapr:3500/v1.0/state/statestore/dr-test"
```

## Summary

State store replication for Dapr DR requires configuring the underlying backend for cross-region data replication independent of Dapr itself. Use Redis Sentinel for HA within a region, Redis replication for cross-region replication, and managed database features like Cosmos DB automatic failover for cloud-native options. Pre-configure DR cluster Dapr components to point to DR endpoints, test replication consistency regularly, and document the cutover procedure as an executable script that your team can run under pressure.
