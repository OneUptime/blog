# How to Use Dapr with Azure SQL Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, SQL, Database, Microservice

Description: Learn how to integrate Dapr state management and bindings with Azure SQL Database to build scalable, cloud-native microservices on Azure.

---

## Overview

Dapr provides a consistent API for state management, making it straightforward to integrate with Azure SQL Database. By using Dapr's state store component, your microservices can interact with Azure SQL without tight coupling to the database driver.

## Prerequisites

- An Azure SQL Database instance provisioned
- Dapr CLI installed and initialized
- kubectl configured for your Kubernetes cluster (or Docker Desktop for local dev)

## Configuring the Azure SQL State Store

Dapr supports Azure SQL as a state store via the `sqlserver` component. Create a component YAML file:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.sqlserver
  version: v1
  metadata:
  - name: connectionString
    value: "Server=myserver.database.windows.net;Database=mydb;User Id=myuser;Password=mypassword;Encrypt=true;"
  - name: tableName
    value: "dapr_state"
  - name: schema
    value: "dbo"
```

Apply the component to your cluster:

```bash
kubectl apply -f azure-sql-state.yaml
```

## Storing and Retrieving State

Once the component is configured, use Dapr's HTTP API or SDK to interact with Azure SQL:

```bash
# Save state
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key": "order-1001", "value": {"product": "widget", "qty": 5}}]'

# Get state
curl http://localhost:3500/v1.0/state/statestore/order-1001
```

## Using the Go SDK

```go
import (
    dapr "github.com/dapr/go-sdk/client"
)

func saveOrderState(ctx context.Context, client dapr.Client) error {
    data := map[string]interface{}{
        "product": "widget",
        "qty":     5,
    }
    jsonData, _ := json.Marshal(data)
    return client.SaveState(ctx, "statestore", "order-1001", jsonData, nil)
}
```

## Using Managed Identity

For production deployments on Azure Kubernetes Service, use Managed Identity instead of a password:

```yaml
  metadata:
  - name: connectionString
    value: "Server=myserver.database.windows.net;Database=mydb;"
  - name: useAzureAD
    value: "true"
  - name: azureClientId
    value: "<managed-identity-client-id>"
```

Enable workload identity on AKS and ensure the managed identity has the `db_datareader` and `db_datawriter` roles on the database. The `azureClientId` field is only needed for user-assigned managed identities; omit it when using a system-assigned identity.

## Summary

Dapr integrates with Azure SQL Database through the state store component, allowing microservices to persist and query data without hard-coding database drivers. Using Managed Identity for authentication removes credential management overhead and follows Azure security best practices.
