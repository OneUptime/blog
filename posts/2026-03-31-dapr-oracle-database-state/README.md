# How to Use Oracle Database with Dapr State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Oracle, State Store, Enterprise, Database, Java

Description: Configure Oracle Database as a Dapr state store for enterprise microservices that need to leverage existing Oracle infrastructure.

---

## Overview

Oracle Database is the backbone of many enterprise systems. Dapr's Oracle state store component allows microservices to use Oracle as a state backend, enabling gradual migration to cloud-native architectures without replacing existing Oracle investments.

## Prerequisites

- Oracle Database 19c or later (or Oracle Autonomous Database)
- Oracle JDBC driver or Go Oracle driver
- Dapr 1.12 or later with Oracle state store component

## Database Schema Setup

Create the state store user and schema in Oracle:

```sql
-- Connect as SYSDBA
CREATE USER dapr_state IDENTIFIED BY "SecurePassword123!"
  DEFAULT TABLESPACE USERS
  TEMPORARY TABLESPACE TEMP
  QUOTA UNLIMITED ON USERS;

GRANT CONNECT, RESOURCE TO dapr_state;
GRANT CREATE SESSION TO dapr_state;
GRANT CREATE TABLE TO dapr_state;
GRANT CREATE SEQUENCE TO dapr_state;
GRANT CREATE INDEX TO dapr_state;

-- Switch to dapr_state schema
ALTER SESSION SET CURRENT_SCHEMA = dapr_state;
```

Dapr creates the state table automatically, but you can pre-create it for better control:

```sql
CREATE TABLE dapr_state.state (
  key             VARCHAR2(100)   NOT NULL,
  value           CLOB            NOT NULL,
  binary_yn       VARCHAR2(1)     NOT NULL,
  etag            VARCHAR2(50)    NOT NULL,
  creation_time   TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  expiration_time TIMESTAMP WITH TIME ZONE NULL,
  update_time     TIMESTAMP WITH TIME ZONE NULL,
  CONSTRAINT pk_state PRIMARY KEY (key)
);

-- Index for TTL-based cleanup
-- Oracle B-tree indexes automatically exclude all-NULL entries,
-- so no partial index clause is needed.
CREATE INDEX idx_state_expire ON dapr_state.state (expiration_time);
```

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oracle-state
  namespace: default
spec:
  type: state.oracledatabase
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: oracle-secret
      key: connectionString
  - name: tableName
    value: "STATE"
  - name: oracleWalletLocation
    value: "/opt/oracle/wallets"
```

Create the connection string secret:

```bash
kubectl create secret generic oracle-secret \
  --from-literal=connectionString="oracle://dapr_state:SecurePassword123!@oracle-db:1521/ORCLPDB1"
```

For Oracle Autonomous Database with wallet:

```bash
# Extract wallet to a directory
unzip /tmp/wallet.zip -d /opt/oracle/wallets/

kubectl create configmap oracle-wallet \
  --from-file=/opt/oracle/wallets/

kubectl create secret generic oracle-secret \
  --from-literal=connectionString="oracle://ADMIN:P4ssword@(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=atp-host)(PORT=1522))(CONNECT_DATA=(SERVICE_NAME=mydb_high.adb.oraclecloud.com)))"
```

## State Operations in Java

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.domain.State;
import io.dapr.client.domain.StateOptions;
import io.dapr.client.domain.TransactionalStateOperation;
import io.dapr.client.domain.TransactionalStateOperation.OperationType;

import java.util.List;

public class OracleStateExample {
    public static void main(String[] args) {
        try (DaprClient client = new DaprClientBuilder().build()) {
            // Save customer state
            CustomerState customer = new CustomerState("C001", "ACME Corp", 500000.00);
            client.saveState("oracle-state", "customer:C001", customer).block();

            // Read customer state
            State<CustomerState> retrieved = client.getState(
                "oracle-state",
                "customer:C001",
                CustomerState.class
            ).block();

            System.out.println("Customer: " + retrieved.getValue().getName());

            // Transactional update
            client.executeStateTransaction(
                "oracle-state",
                List.of(
                    new TransactionalStateOperation<>(
                        OperationType.UPSERT,
                        new State<>("customer:C001",
                            new CustomerState("C001", "ACME Corp", 600000.00),
                            null, new StateOptions(StateOptions.Consistency.STRONG, null))
                    )
                )
            ).block();
        }
    }
}
```

## Oracle Data Guard Integration

For Oracle Data Guard failover, use a SCAN listener connection string:

```yaml
  - name: connectionString
    value: "oracle://dapr_state:pass@scan-listener:1521/dapr_service_taf"
```

## Summary

Oracle Database as a Dapr state store enables enterprise teams to adopt microservices incrementally while reusing existing Oracle infrastructure and expertise. The Oracle Autonomous Database with wallet-based authentication provides secure, managed connectivity. Using TTL-based expiration keeps the state table performant as data volume grows.
