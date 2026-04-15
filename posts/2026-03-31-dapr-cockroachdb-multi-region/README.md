# How to Use CockroachDB Multi-Region with Dapr State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CockroachDB, Multi-Region, State Store, Distributed Database, PostgreSQL

Description: Configure CockroachDB multi-region clusters as a Dapr state store for globally distributed stateful microservices with strong consistency.

---

## Overview

CockroachDB is a distributed SQL database that speaks the PostgreSQL wire protocol, making it compatible with Dapr's PostgreSQL state store component. Its multi-region capabilities allow you to pin data to specific regions, reduce read latency, and survive regional failures without data loss.

## CockroachDB Cluster Setup

Deploy a multi-region CockroachDB cluster using Kubernetes:

```bash
# Install CockroachDB operator
kubectl apply -f https://raw.githubusercontent.com/cockroachdb/cockroach-operator/master/install/crds.yaml
kubectl apply -f https://raw.githubusercontent.com/cockroachdb/cockroach-operator/master/install/operator.yaml

# Create a CockroachDB cluster
cat <<EOF | kubectl apply -f -
apiVersion: crdb.cockroachlabs.com/v1alpha1
kind: CrdbCluster
metadata:
  name: cockroachdb
spec:
  dataStore:
    pvc:
      spec:
        accessModes: [ReadWriteOnce]
        resources:
          requests:
            storage: 60Gi
  resources:
    requests:
      cpu: "2"
      memory: 8Gi
  tlsEnabled: true
  image:
    name: cockroachdb/cockroach:v23.2.0
  nodes: 3
  additionalLabels:
    crdb: cockroachdb
EOF
```

Initialize multi-region configuration:

```sql
-- Add regions to the cluster
ALTER DATABASE dapr_state SET PRIMARY REGION "us-east1";
ALTER DATABASE dapr_state ADD REGION "eu-west1";
ALTER DATABASE dapr_state ADD REGION "ap-southeast1";
```

## Dapr Component Configuration

CockroachDB uses the PostgreSQL component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cockroach-state
  namespace: default
spec:
  type: state.postgresql
  version: v2
  metadata:
  - name: connectionString
    secretKeyRef:
      name: cockroach-secret
      key: connectionString
  - name: tablePrefix
    value: "dapr_"
  - name: maxConns
    value: "20"
  - name: cleanupInterval
    value: "1h"
```

Create the connection string secret:

```bash
kubectl create secret generic cockroach-secret \
  --from-literal=connectionString="postgresql://dapr:secret@cockroachdb-public:26257/dapr_state?sslmode=verify-full&sslrootcert=/certs/ca.crt"
```

## Regional Table Configuration

Pin state data to specific regions for compliance and latency:

```sql
-- Add region column for row pinning
ALTER TABLE public.dapr_state
  ADD COLUMN IF NOT EXISTS region crdb_internal_region
  NOT NULL DEFAULT gateway_region();

-- Set locality using the custom region column
ALTER TABLE public.dapr_state
  SET LOCALITY REGIONAL BY ROW AS region;

-- Create index for regional reads
CREATE INDEX ON public.dapr_state (region, key);
```

## Survival Goals

Set the cluster survival goal based on your requirements:

```sql
-- Survive availability zone failures (default)
ALTER DATABASE dapr_state SURVIVE ZONE FAILURE;

-- Survive entire region failures (requires 3+ regions)
ALTER DATABASE dapr_state SURVIVE REGION FAILURE;
```

## Connection from Each Region

Deploy region-specific Dapr sidecars pointing to the local CockroachDB nodes:

```yaml
# us-east1 deployment
  - name: connectionString
    value: "postgresql://dapr:secret@cockroachdb-us-east1:26257/dapr_state"
```

Monitor cluster health:

```bash
# Check node status
cockroach node status --host=cockroachdb-public:26257 --certs-dir=/certs

# Check database regions
cockroach sql --host=cockroachdb-public:26257 --certs-dir=/certs -e "SHOW REGIONS FROM DATABASE dapr_state;"
```

## Summary

CockroachDB multi-region with Dapr state store provides PostgreSQL-compatible, globally distributed state with strong consistency guarantees. Regional By Row locality pins specific state data to geographic regions for compliance and latency optimization. The survive region failure goal ensures zero data loss during regional outages, making it ideal for financial and healthcare microservices with strict availability requirements.
