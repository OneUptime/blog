# How to Use Dapr State First-Write-Wins with CockroachDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, CockroachDB, Concurrency, First-Write-Wins, PostgreSQL

Description: Learn how to configure Dapr's first-write-wins concurrency mode with CockroachDB for distributed state management with optimistic concurrency control and serializable isolation.

---

CockroachDB's distributed SQL engine pairs naturally with Dapr's state management API: it provides multi-region replication, serializable isolation, and PostgreSQL-wire compatibility. When multiple service instances compete to write the same state key, Dapr's concurrency modes determine the winner. First-write-wins (also called optimistic concurrency) uses ETags to ensure only the service that last read the value can update it - a perfect fit for CockroachDB's contention-aware transaction model.

## CockroachDB as a Dapr State Store

Dapr supports CockroachDB through a dedicated state store component (`state.cockroachdb`). CockroachDB is PostgreSQL-wire compatible, so it shares much of the underlying implementation. This gives you:

- Serializable ACID transactions
- Multi-region active-active replication
- Automatic re-balancing across nodes
- Built-in change data capture (CDC) for event sourcing

```yaml
# components/cockroachdb-statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.cockroachdb
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: cockroachdb-secret
      key: connectionString
  - name: tableName
    value: "dapr_state"
  - name: schemaName
    value: "public"
  - name: cleanupIntervalInSeconds
    value: "600"
```

The connection string format:

```bash
# Create the Kubernetes secret
kubectl create secret generic cockroachdb-secret \
  --from-literal=connectionString="host=cockroachdb.cockroachdb.svc.cluster.local \
    port=26257 user=dapr_user password=secretpassword dbname=statedb sslmode=verify-full \
    sslrootcert=/cockroach-certs/ca.crt"
```

## Setting Up CockroachDB

```bash
# Install CockroachDB via Helm
helm repo add cockroachdb https://charts.cockroachdb.com/
helm install cockroachdb cockroachdb/cockroachdb \
  --namespace cockroachdb \
  --create-namespace \
  --set statefulset.replicas=3

# Create the database and user for Dapr
kubectl exec -it cockroachdb-0 -n cockroachdb -- \
  ./cockroach sql --insecure << 'SQL'
CREATE DATABASE IF NOT EXISTS statedb;
CREATE USER IF NOT EXISTS dapr_user WITH PASSWORD 'secretpassword';
GRANT ALL ON DATABASE statedb TO dapr_user;
USE statedb;

-- Dapr creates this table automatically, but you can pre-create it
CREATE TABLE IF NOT EXISTS dapr_state (
    key         TEXT NOT NULL PRIMARY KEY,
    value       JSONB NOT NULL,
    isbinary    BOOLEAN NOT NULL,
    etag        TEXT NOT NULL,
    insertdate  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedate  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expiredate  TIMESTAMPTZ
);

-- Index for TTL cleanup
CREATE INDEX IF NOT EXISTS idx_expiredate ON dapr_state (expiredate)
    WHERE expiredate IS NOT NULL;
SQL
```

## Understanding First-Write-Wins Concurrency

Dapr's concurrency modes:

- `last-write-wins` (default): the last write always succeeds, overwriting any previous value
- `first-write-wins`: uses ETag-based optimistic locking - write fails if the ETag doesn't match the current stored ETag

With first-write-wins:

```text
Service A reads key "inventory-item-1" -> gets value=100, ETag="etag-v1"
Service B reads key "inventory-item-1" -> gets value=100, ETag="etag-v1"

Service A writes: value=90, ifMatch="etag-v1" -> SUCCESS, new ETag="etag-v2"
Service B writes: value=95, ifMatch="etag-v1" -> CONFLICT (etag-v1 no longer current)

Service B must re-read (gets value=90, ETag="etag-v2") and retry
```

This prevents lost updates in concurrent scenarios.

## Implementing First-Write-Wins in Python

```python
# inventory_service.py
import os
import requests
from typing import Optional, Tuple

DAPR_PORT = int(os.environ.get("DAPR_HTTP_PORT", 3500))
DAPR_URL = f"http://localhost:{DAPR_PORT}/v1.0"

def get_inventory(item_id: str) -> Tuple[Optional[dict], Optional[str]]:
    """Read inventory state and its ETag."""
    resp = requests.get(
        f"{DAPR_URL}/state/statestore/{item_id}",
        params={"consistency": "strong"}
    )
    
    if resp.status_code == 200 and resp.text and resp.text != "null":
        etag = resp.headers.get("ETag")
        return resp.json(), etag
    return None, None

def update_inventory_first_write_wins(
    item_id: str,
    quantity_change: int,
    max_retries: int = 5
) -> bool:
    """
    Update inventory using first-write-wins with CockroachDB.
    Returns True if update succeeded, False if item not found.
    Raises Exception if max retries exceeded.
    """
    import time
    
    for attempt in range(max_retries):
        inventory, etag = get_inventory(item_id)
        
        if inventory is None:
            return False
        
        current_qty = inventory.get("quantity", 0)
        new_qty = current_qty + quantity_change
        
        if new_qty < 0:
            raise ValueError(f"Insufficient inventory: {current_qty} + {quantity_change} < 0")
        
        # Write with ETag using first-write-wins mode
        write_resp = requests.post(
            f"{DAPR_URL}/state/statestore",
            json=[{
                "key": item_id,
                "value": {**inventory, "quantity": new_qty},
                "etag": etag,
                "options": {
                    "concurrency": "first-write",
                    "consistency": "strong"
                }
            }]
        )
        
        if write_resp.status_code == 204:
            print(f"Inventory updated: {item_id} {current_qty} -> {new_qty} (attempt {attempt + 1})")
            return True
        elif write_resp.status_code == 409:
            # Conflict - another writer changed this record
            print(f"Conflict on {item_id}, retrying ({attempt + 1}/{max_retries})...")
            time.sleep(0.05 * (2 ** attempt))  # exponential backoff
            continue
        else:
            raise Exception(f"Unexpected error: {write_resp.status_code} {write_resp.text}")
    
    raise Exception(f"Failed to update {item_id} after {max_retries} retries")

# Example: reserve 5 units for an order
try:
    success = update_inventory_first_write_wins("item-widget-001", -5)
    print(f"Reservation {'succeeded' if success else 'item not found'}")
except ValueError as e:
    print(f"Insufficient stock: {e}")
except Exception as e:
    print(f"Update failed: {e}")
```

## CockroachDB-Specific Transaction Configuration

CockroachDB's serializable isolation means it automatically retries transactions on contention. You can tune retry behavior:

```python
# cockroachdb_tuning.py
def get_inventory_with_strong_consistency(item_id: str):
    """Use strong consistency for CockroachDB to avoid reading stale replicas."""
    # The 'strong' consistency query parameter tells Dapr to use a linearizable read
    resp = requests.get(
        f"{DAPR_URL}/state/statestore/{item_id}",
        params={
            "consistency": "strong"  # Read from the leaseholder
        }
    )
    if resp.status_code == 200:
        return resp.json(), resp.headers.get("ETag")
    return None, None
```

Monitor CockroachDB contention:

```sql
-- Check transaction contention in CockroachDB (v22.2+)
SELECT
    database_name,
    schema_name,
    table_name,
    index_name,
    contention_duration,
    contending_pretty_key
FROM crdb_internal.transaction_contention_events
ORDER BY contention_duration DESC
LIMIT 20;

-- Check slow queries related to the state table
SELECT
    fingerprint_id,
    metadata ->> 'query' AS query_text,
    statistics
FROM crdb_internal.statement_statistics
WHERE metadata ->> 'query' LIKE '%dapr_state%';
```

## Load Testing Concurrency Control

```bash
# Run a concurrency test with 10 parallel workers all updating the same key
python3 << 'EOF'
import threading
import requests
import os
import time

DAPR_URL = f"http://localhost:{os.environ.get('DAPR_HTTP_PORT', 3500)}/v1.0"
results = {"success": 0, "conflict": 0, "error": 0}
lock = threading.Lock()

def worker(worker_id: int):
    for _ in range(10):
        resp = requests.get(f"{DAPR_URL}/state/statestore/shared-counter")
        current = resp.json() if resp.status_code == 200 and resp.text not in ("", "null") else {"count": 0}
        etag = resp.headers.get("ETag")
        
        write_resp = requests.post(
            f"{DAPR_URL}/state/statestore",
            json=[{
                "key": "shared-counter",
                "value": {"count": current["count"] + 1},
                "etag": etag,
                "options": {"concurrency": "first-write", "consistency": "strong"}
            }]
        )
        
        with lock:
            if write_resp.status_code == 204:
                results["success"] += 1
            elif write_resp.status_code == 409:
                results["conflict"] += 1
            else:
                results["error"] += 1
        
        time.sleep(0.01)

threads = [threading.Thread(target=worker, args=(i,)) for i in range(10)]
for t in threads:
    t.start()
for t in threads:
    t.join()

print(f"Results: {results}")
final = requests.get(f"{DAPR_URL}/state/statestore/shared-counter").json()
print(f"Final counter: {final}")
EOF
```

## Summary

CockroachDB as a Dapr state store provides distributed SQL with serializable isolation and multi-region replication. Use the `first-write-wins` concurrency mode with ETag-based optimistic locking to prevent lost updates when multiple service instances compete to update the same key. CockroachDB's automatic transaction retries handle contention at the SQL level, while Dapr's ETag mechanism handles it at the application level. Monitor the `cluster_contention_events` view in CockroachDB to identify hotspot keys that need redesign (such as sharding a high-contention counter).
