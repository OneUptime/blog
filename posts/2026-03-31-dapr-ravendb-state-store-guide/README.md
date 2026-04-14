# How to Use RavenDB with Dapr State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, RavenDB, State Store, Document Database, .NET, NoSQL

Description: Configure RavenDB as a Dapr state store for document-oriented state management with ACID transactions and built-in indexing.

---

## Overview

RavenDB is a NoSQL document database with native ACID transactions, full-text search, and built-in change notifications. Dapr's RavenDB state store component leverages these capabilities for .NET-centric microservices that need document-oriented state with transactional guarantees.

## RavenDB Deployment

Deploy RavenDB on Kubernetes:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ravendb
spec:
  serviceName: ravendb
  replicas: 1
  selector:
    matchLabels:
      app: ravendb
  template:
    metadata:
      labels:
        app: ravendb
    spec:
      containers:
      - name: ravendb
        image: ravendb/ravendb:6.0-latest
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 38888
          name: tcp
        env:
        - name: RAVEN_Setup_Mode
          value: "None"
        - name: RAVEN_License_Eula_Accepted
          value: "true"
        - name: RAVEN_Security_UnsecuredAccessAllowed
          value: "PrivateNetwork"
        volumeMounts:
        - name: ravendb-data
          mountPath: /var/lib/ravendb/data
```

For production, enable TLS and license:

```bash
# Access RavenDB Studio
kubectl port-forward service/ravendb 8080:8080

# Open http://localhost:8080 to configure license and TLS
```

## Creating a Database

```bash
# Create database via RavenDB HTTP API
curl -X PUT http://ravendb:8080/admin/databases \
  -H "Content-Type: application/json" \
  -d '{
    "DatabaseName": "DaprState",
    "Settings": {},
    "Disabled": false,
    "Topology": {
      "Members": ["A"]
    }
  }'
```

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ravendb-state
  namespace: default
spec:
  type: state.ravendb
  version: v1
  metadata:
  - name: serverUrl
    value: "http://ravendb:8080"
  - name: databaseName
    value: "DaprState"
  - name: certificate
    secretKeyRef:
      name: ravendb-cert
      key: cert.pfx
  - name: certificatePassword
    secretKeyRef:
      name: ravendb-cert
      key: password
```

## State Operations in .NET

```csharp
using Dapr.Client;
using System.Text.Json;

public class ProductStateService
{
    private readonly DaprClient _daprClient;

    public ProductStateService(DaprClient daprClient)
    {
        _daprClient = daprClient;
    }

    public async Task SaveProductAsync(Product product)
    {
        await _daprClient.SaveStateAsync(
            "ravendb-state",
            $"product:{product.Id}",
            product,
            new StateOptions
            {
                Consistency = ConsistencyMode.Strong,
                Concurrency = ConcurrencyMode.LastWrite
            }
        );
    }

    public async Task<Product> GetProductAsync(string productId)
    {
        return await _daprClient.GetStateAsync<Product>(
            "ravendb-state",
            $"product:{productId}"
        );
    }

    public async Task DeleteProductAsync(string productId)
    {
        await _daprClient.DeleteStateAsync(
            "ravendb-state",
            $"product:{productId}"
        );
    }
}
```

## RavenDB Cluster for High Availability

Configure a three-node RavenDB cluster:

```bash
# Add nodes to cluster via RavenDB API
curl -X PUT "http://ravendb-0:8080/admin/cluster/node?url=http://ravendb-1:8080&tag=B"

curl -X PUT "http://ravendb-0:8080/admin/cluster/node?url=http://ravendb-2:8080&tag=C"
```

Update the Dapr component to use all cluster nodes:

```yaml
  - name: serverUrl
    value: "http://ravendb-0:8080,http://ravendb-1:8080,http://ravendb-2:8080"
```

## Monitoring RavenDB

```bash
# Check cluster health
curl http://ravendb:8080/cluster/topology

# View database stats
curl http://ravendb:8080/databases/DaprState/stats

# Monitor document count and index performance
curl http://ravendb:8080/databases/DaprState/indexes/performance
```

## Summary

RavenDB with Dapr state store is a natural fit for .NET microservices that require document-oriented state with ACID transactions. The built-in indexing enables rich queries on state data without maintaining separate read models. RavenDB's cluster topology with automatic leader election provides high availability, while its Studio UI simplifies operational tasks like index management and data inspection.
