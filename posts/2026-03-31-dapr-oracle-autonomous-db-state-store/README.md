# How to Configure Dapr with Oracle Autonomous Database State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Oracle, Autonomous Database, State Store, Cloud

Description: Learn how to configure Dapr with Oracle Autonomous Database as a state store, using Oracle's self-managing cloud database for enterprise microservice state persistence.

---

## Overview

Oracle Autonomous Database (ADB) is a fully managed, self-tuning database service that automates provisioning, tuning, patching, and scaling. It comes in two flavors: Autonomous Data Warehouse (ADW) and Autonomous Transaction Processing (ATP). For Dapr state management, ATP is the appropriate choice, providing OLTP performance with zero-downtime scaling and automatic index management.

## Prerequisites

- An Oracle Cloud Infrastructure account with Autonomous Database provisioned
- Dapr CLI and runtime installed
- Oracle Wallet downloaded from the ADB console

## Setting Up Oracle Autonomous Database

Provision an ATP instance from the OCI console or CLI:

```bash
oci db autonomous-database create \
  --compartment-id YOUR_COMPARTMENT_OCID \
  --db-name DaprStateATP \
  --display-name "Dapr State ATP" \
  --db-workload OLTP \
  --compute-model ECPU \
  --compute-count 2 \
  --data-storage-size-in-tbs 1 \
  --admin-password ATPAdminPass123! \
  --is-auto-scaling-enabled true
```

Download the wallet from the OCI console and create a Kubernetes secret:

```bash
# Extract the wallet ZIP
unzip Wallet_DaprStateATP.zip -d wallet/

# Create Kubernetes secret with the wallet contents
kubectl create secret generic adb-wallet \
  --from-file=wallet/
```

## Creating the Dapr User in ADB

Connect to ADB using SQLcl or SQL Developer and create a dedicated user:

```sql
-- Connect as ADMIN
CREATE USER dapr_user IDENTIFIED BY DaprUser123!;
GRANT CONNECT, RESOURCE TO dapr_user;
GRANT CREATE TABLE TO dapr_user;
GRANT UNLIMITED TABLESPACE TO dapr_user;
```

## Configuring the Dapr Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: adb-statestore
  namespace: default
spec:
  type: state.oracledatabase
  version: v1
  metadata:
  - name: connectionString
    value: "oracle://dapr_user:DaprUser123!@(description=(retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)(host=adb.us-ashburn-1.oraclecloud.com))(connect_data=(service_name=your_service_high))(security=(ssl_server_dn_match=yes)))"
  - name: oracleWalletLocation
    value: "/wallet"
  - name: tableName
    value: "DAPR_STATE"
```

Mount the wallet in your Dapr sidecar:

```yaml
# In your app Deployment spec
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "myservice"
  dapr.io/volume-mounts: "wallet-vol:/wallet"
volumes:
- name: wallet-vol
  secret:
    secretName: adb-wallet
```

Apply the component:

```bash
kubectl apply -f adb-statestore.yaml
```

## Using the ADB State Store

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// Store financial transaction state
await client.state.save("adb-statestore", [
  {
    key: "txn-FIN-2026-001042",
    value: {
      transactionId: "FIN-2026-001042",
      amount: 95000.00,
      currency: "USD",
      status: "pending-approval",
      initiator: "treasury@corp.com",
      createdAt: new Date().toISOString()
    }
  }
]);

const txn = await client.state.get("adb-statestore", "txn-FIN-2026-001042");
console.log("Transaction:", txn);
```

## Summary

Oracle Autonomous Database as a Dapr state store combines Oracle's enterprise-grade ACID guarantees with fully automated self-management, making it ideal for regulated industries and enterprise applications on OCI. The Wallet-based TLS authentication ensures encrypted connections, while ATP's auto-scaling handles variable Dapr state workloads without manual intervention.
