# How to Implement Data Retention Policies with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Compliance, Data Retention, State Store, Policy

Description: Learn how to configure TTL-based data retention in Dapr state stores and implement automated purge policies to comply with data minimization requirements.

---

## Data Retention in Dapr

Data retention policies define how long data is kept before being deleted. Regulations like GDPR require that personal data is not kept longer than necessary. Dapr provides built-in TTL (time-to-live) support for state store entries, making it straightforward to implement retention policies at the application level.

## Setting TTL on State Store Entries

Dapr supports per-entry TTL when saving state. Set a TTL of 24 hours (86400 seconds) for user session data:

```go
package main

import (
    "context"
    "fmt"
    dapr "github.com/dapr/go-sdk/client"
)

func saveUserSession(userID string, sessionData []byte) error {
    client, err := dapr.NewClient()
    if err != nil {
        return err
    }
    defer client.Close()

    // Retain session data for 24 hours
    ttlInSeconds := 86400

    return client.SaveState(context.Background(),
        "statestore",
        "session:"+userID,
        sessionData,
        map[string]string{
            "ttlInSeconds": fmt.Sprintf("%d", ttlInSeconds),
        },
    )
}
```

## Component-Level Default TTL

Set a default TTL at the component level so all data expires unless overridden:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: user-data-store
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-service:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
  - name: ttlInSeconds
    value: "7776000"
  - name: enableTLS
    value: "true"
```

## Implementing Tiered Retention

Different data types often have different retention requirements:

```python
from dapr.clients import DaprClient

RETENTION_TIERS = {
    "session": 86400,          # 1 day
    "user-profile": 31536000,  # 1 year
    "transaction": 220752000,  # 7 years (financial compliance)
    "audit-log": 220752000,    # 7 years
    "temp": 3600,              # 1 hour
}

def save_with_retention(key_type: str, key: str, data: dict):
    ttl = RETENTION_TIERS.get(key_type, 86400)
    with DaprClient() as client:
        client.save_state(
            store_name="statestore",
            key=f"{key_type}:{key}",
            value=str(data),
            state_metadata={"ttlInSeconds": str(ttl)}
        )
```

## Automating Bulk Purges

For data that cannot be TTL-managed at entry level, implement a periodic purge job:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: data-retention-purge
  namespace: production
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        metadata:
          annotations:
            dapr.io/enabled: "true"
            dapr.io/app-id: "retention-purge-job"
        spec:
          containers:
          - name: purge-job
            image: myregistry/retention-purge:latest
            env:
            - name: DAPR_HTTP_PORT
              value: "3500"
            - name: RETENTION_DAYS
              value: "365"
            - name: STATE_STORE
              value: "statestore"
```

```bash
#!/bin/bash
# purge-expired-data.sh - runs inside the CronJob container
CUTOFF=$(date -d "-${RETENTION_DAYS} days" +%s)

# Query keys with creation timestamps older than cutoff
# and delete them via Dapr state API
curl -X DELETE \
  "http://localhost:3500/v1.0/state/statestore/user-data:${KEY}" \
  -H "Content-Type: application/json"
```

## Verifying Retention Compliance

Audit that retention policies are applied correctly:

```bash
# Check Redis TTL values for specific keys
redis-cli -h redis-service TTL "user-profile:user123"

# Verify component TTL configuration
kubectl get component user-data-store -n production -o jsonpath='{.spec.metadata}'
```

## Summary

Dapr data retention is implemented through per-entry TTL metadata on state save operations and component-level default TTL settings. Define a retention tier mapping for different data types and apply appropriate TTLs programmatically. For data that cannot be managed with TTL alone, deploy a Kubernetes CronJob using the Dapr state API to purge records beyond their retention period. Regular audits verify that retention policies remain aligned with compliance requirements.
