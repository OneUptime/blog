# How to Implement GDPR Compliance with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GDPR, Compliance, Privacy, Security

Description: A practical guide to using Dapr building blocks to implement GDPR requirements including data access rights, erasure, consent tracking, and audit logging.

---

## GDPR Requirements in Microservices

GDPR (General Data Protection Regulation) requires organizations to support data subject rights including the right of access, right to erasure ("right to be forgotten"), data portability, and consent management. Dapr's building blocks provide a practical foundation for implementing these in distributed microservices.

## Right to Erasure - Implementing Data Deletion

Build a GDPR erasure workflow using Dapr state stores:

```go
package main

import (
    "context"
    "fmt"
    dapr "github.com/dapr/go-sdk/client"
)

// GDPRErasureService handles right-to-be-forgotten requests
type GDPRErasureService struct {
    client dapr.Client
    stores []string
}

func (s *GDPRErasureService) EraseUserData(ctx context.Context, userID string) error {
    // Define all keys that may hold personal data for this user
    userKeys := []string{
        fmt.Sprintf("profile:%s", userID),
        fmt.Sprintf("preferences:%s", userID),
        fmt.Sprintf("activity:%s", userID),
        fmt.Sprintf("consent:%s", userID),
    }

    for _, store := range s.stores {
        for _, key := range userKeys {
            if err := s.client.DeleteState(ctx, store, key, nil); err != nil {
                return fmt.Errorf("erasure failed for store %s key %s: %w", store, key, err)
            }
        }
    }

    // Publish erasure event for downstream services
    return s.client.PublishEvent(ctx, "pubsub", "gdpr-erasure",
        map[string]string{"userId": userID, "action": "erasure"})
}
```

## Consent Management with Dapr State

Track user consent states in a dedicated state store:

```python
from dapr.clients import DaprClient
import json
from datetime import datetime, timezone

def record_consent(user_id: str, consent_type: str, granted: bool):
    consent_record = {
        "userId": user_id,
        "consentType": consent_type,
        "granted": granted,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0"
    }
    with DaprClient() as client:
        client.save_state(
            store_name="consent-store",
            key=f"consent:{user_id}:{consent_type}",
            value=json.dumps(consent_record),
            state_metadata={"ttlInSeconds": "31536000"}
        )

def get_user_consents(user_id: str) -> dict:
    with DaprClient() as client:
        result = client.get_state(
            store_name="consent-store",
            key=f"consent:{user_id}:marketing"
        )
        return json.loads(result.data) if result.data else {}
```

## Data Portability - Export User Data

Implement data portability by aggregating state from all stores:

```go
func (s *GDPRErasureService) ExportUserData(ctx context.Context, userID string) (map[string]interface{}, error) {
    export := make(map[string]interface{})

    for _, store := range s.stores {
        keys := []string{
            fmt.Sprintf("profile:%s", userID),
            fmt.Sprintf("preferences:%s", userID),
        }
        items, err := s.client.GetBulkState(ctx, store, keys, nil, 10)
        if err != nil {
            return nil, err
        }
        for _, item := range items {
            if item.Value != nil {
                export[item.Key] = item.Value
            }
        }
    }
    return export, nil
}
```

## GDPR Pub/Sub Event Pipeline

Subscribe to erasure events to ensure all services clean up user data:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: gdpr-erasure-subscription
  namespace: production
spec:
  pubsubname: pubsub
  topic: gdpr-erasure
  route: /gdpr/erasure
scopes:
- notification-service
- analytics-service
- recommendation-service
```

## Audit Logging for GDPR

Log all personal data access for accountability:

```bash
# Enable structured logging in Dapr configuration
kubectl apply -f - <<EOF
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: gdpr-audit-config
  namespace: production
spec:
  logging:
    apiLogging:
      enabled: true
  tracing:
    samplingRate: "1"
EOF
```

## Summary

Dapr simplifies GDPR compliance by providing a unified API across state stores and pub/sub systems, making it possible to implement erasure, consent tracking, and data portability without modifying individual service implementations. Use the state API with structured key namespacing to manage personal data, publish GDPR events to notify all services of data subject requests, and enable full API logging for accountability. Coordinate erasure across all state stores using a centralized GDPR service that knows all data locations for each user.
