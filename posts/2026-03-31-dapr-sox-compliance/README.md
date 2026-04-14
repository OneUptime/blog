# How to Implement SOX Compliance with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SOX, Compliance, Audit, Finance

Description: Learn how to configure Dapr for Sarbanes-Oxley compliance, including immutable audit trails, access controls, and change management for financial microservices.

---

## SOX and Microservices

The Sarbanes-Oxley Act (SOX) requires publicly traded companies to maintain accurate financial records, enforce access controls, and provide evidence of internal controls over financial reporting (ICFR). In microservices architectures using Dapr, SOX compliance requires immutable audit trails, strict role-based access, and documented change management for all services that touch financial data.

## Immutable Audit Logging

SOX requires that audit logs cannot be altered. Configure Dapr to write to an append-only audit sink:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sox-audit-binding
  namespace: finance
spec:
  type: bindings.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka-broker:9092"
  - name: topics
    value: "sox-audit-immutable"
  - name: consumerGroup
    value: "sox-audit-consumer"
  - name: authType
    value: "mtls"
  - name: clientCert
    secretKeyRef:
      name: kafka-mtls-cert
      key: client.crt
  - name: clientKey
    secretKeyRef:
      name: kafka-mtls-cert
      key: client.key
scopes:
- financial-reporting-service
- payment-processor
- ledger-service
```

## Recording Financial Transactions with Audit Trail

Every financial state change must be logged with a before/after snapshot:

```go
package main

import (
    "context"
    "encoding/json"
    "time"
    dapr "github.com/dapr/go-sdk/client"
)

type SOXAuditEntry struct {
    EventID     string      `json:"eventId"`
    Timestamp   time.Time   `json:"timestamp"`
    UserID      string      `json:"userId"`
    ServiceID   string      `json:"serviceId"`
    Operation   string      `json:"operation"`
    Resource    string      `json:"resource"`
    Before      interface{} `json:"before"`
    After       interface{} `json:"after"`
    IPAddress   string      `json:"ipAddress"`
}

func (s *FinancialService) UpdateLedgerEntry(ctx context.Context, entryID string, amount float64) error {
    client, _ := dapr.NewClient()
    defer client.Close()

    // Get current state for before snapshot
    before, _ := client.GetState(ctx, "ledger-store", entryID, nil)

    // Update the ledger entry
    newEntry := map[string]interface{}{
        "id":     entryID,
        "amount": amount,
        "updated": time.Now(),
    }
    entryBytes, _ := json.Marshal(newEntry)
    client.SaveState(ctx, "ledger-store", entryID, entryBytes, nil)

    // Write SOX audit entry
    audit := SOXAuditEntry{
        EventID:   generateUUID(),
        Timestamp: time.Now(),
        Operation: "UPDATE",
        Resource:  "ledger-entry:" + entryID,
        Before:    before.Value,
        After:     newEntry,
    }
    auditBytes, _ := json.Marshal(audit)
    return client.InvokeOutputBinding(ctx, &dapr.InvokeBindingRequest{
        Name:      "sox-audit-binding",
        Operation: "create",
        Data:      auditBytes,
    })
}
```

## Role-Based Access Control for Financial Services

Use Dapr component scopes combined with Kubernetes RBAC to restrict access:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: financial-service-role
  namespace: finance
rules:
- apiGroups: ["dapr.io"]
  resources: ["components"]
  resourceNames: ["ledger-store", "sox-audit-binding"]
  verbs: ["get", "list"]
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ledger-store
  namespace: finance
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-finance:6379"
  - name: enableTLS
    value: "true"
scopes:
- financial-reporting-service
- ledger-service
```

## Segregation of Duties

Enforce separation between services that can read vs. write financial data:

```yaml
# Read-only service - can only access read endpoint
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ledger-readonly-store
  namespace: finance
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-finance-replica:6379"
  - name: enableTLS
    value: "true"
scopes:
- financial-reporting-readonly
- audit-query-service
```

## Alerting on Unauthorized Access Attempts

```bash
# Prometheus alert rule for unauthorized Dapr component access
cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: sox-dapr-alerts
  namespace: finance
spec:
  groups:
  - name: sox.dapr
    rules:
    - alert: UnauthorizedComponentAccess
      expr: increase(dapr_runtime_acl_app_policy_action_blocked_total[5m]) > 0
      for: 0m
      labels:
        severity: critical
      annotations:
        summary: "SOX: Unauthorized Dapr component access attempt"
EOF
```

## Summary

SOX compliance with Dapr centers on three pillars: immutable audit trails using append-only bindings to Kafka or object storage, strict role-based access enforced through Dapr component scopes and Kubernetes RBAC, and separation of duties between services that read vs. write financial data. Log every financial state change with before/after snapshots, retain audit logs for at least 7 years per SEC Rule 2-06 implementing SOX Section 802, and configure alerts for unauthorized access attempts to financial components.
