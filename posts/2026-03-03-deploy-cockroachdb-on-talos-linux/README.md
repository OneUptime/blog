# How to Deploy CockroachDB on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CockroachDB, Kubernetes, Distributed Database, SQL, DevOps

Description: Learn how to deploy CockroachDB distributed SQL database on Talos Linux with multi-node clusters, TLS certificates, and automated operations.

---

CockroachDB is a distributed SQL database designed to survive failures at every level, from disk to datacenter. It gives you the familiarity of PostgreSQL-compatible SQL with horizontal scalability built in. Running CockroachDB on Talos Linux is a natural fit because both are designed for cloud-native, Kubernetes-first environments.

This guide covers deploying CockroachDB on Talos Linux, including cluster initialization, certificate management, and production configuration.

## Why CockroachDB on Talos Linux

CockroachDB was built from the ground up for Kubernetes. It handles its own replication, automatically rebalances data across nodes, and survives node failures without manual intervention. Talos Linux complements this by providing an immutable, API-driven OS that eliminates the risk of configuration drift on your database nodes. Together, they form a resilient stack where both the OS and the database handle failures gracefully.

## Prerequisites

- Talos Linux cluster with at least three worker nodes
- `kubectl` and `talosctl` configured
- `cockroach` CLI installed locally (optional but helpful)
- A StorageClass with at least 100GB available per node

## Step 1: Prepare the Namespace

```yaml
# cockroachdb-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cockroachdb
```

```bash
kubectl apply -f cockroachdb-namespace.yaml
```

## Step 2: Generate TLS Certificates

CockroachDB strongly recommends using TLS for inter-node and client communication. You can use cert-manager to automate this:

```bash
# Install cert-manager if not already installed
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml
```

```yaml
# cockroach-certs.yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: cockroachdb-ca-issuer
  namespace: cockroachdb
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: cockroachdb-ca
  namespace: cockroachdb
spec:
  isCA: true
  commonName: cockroachdb-ca
  secretName: cockroachdb-ca-secret
  issuerRef:
    name: cockroachdb-ca-issuer
    kind: Issuer
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: cockroachdb-issuer
  namespace: cockroachdb
spec:
  ca:
    secretName: cockroachdb-ca-secret
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: cockroachdb-node-cert
  namespace: cockroachdb
spec:
  secretName: cockroachdb-node-secret
  issuerRef:
    name: cockroachdb-issuer
    kind: Issuer
  commonName: node
  dnsNames:
    - localhost
    - "*.cockroachdb"
    - "*.cockroachdb.cockroachdb"
    - "*.cockroachdb.cockroachdb.svc.cluster.local"
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: cockroachdb-client-cert
  namespace: cockroachdb
spec:
  secretName: cockroachdb-client-secret
  issuerRef:
    name: cockroachdb-issuer
    kind: Issuer
  commonName: root
```

```bash
kubectl apply -f cockroach-certs.yaml
```

## Step 3: Deploy CockroachDB StatefulSet

```yaml
# cockroachdb-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cockroachdb
  namespace: cockroachdb
spec:
  serviceName: cockroachdb
  replicas: 3
  selector:
    matchLabels:
      app: cockroachdb
  template:
    metadata:
      labels:
        app: cockroachdb
    spec:
      containers:
        - name: cockroachdb
          image: cockroachdb/cockroach:v23.2.3
          ports:
            - containerPort: 26257
              name: grpc
            - containerPort: 8080
              name: http
          command:
            - /cockroach/cockroach
            - start
            - --logtostderr
            - --certs-dir=/cockroach/cockroach-certs
            - --advertise-host=$(POD_NAME).cockroachdb.cockroachdb.svc.cluster.local
            - --http-addr=0.0.0.0
            - --join=cockroachdb-0.cockroachdb.cockroachdb.svc.cluster.local:26257,cockroachdb-1.cockroachdb.cockroachdb.svc.cluster.local:26257,cockroachdb-2.cockroachdb.cockroachdb.svc.cluster.local:26257
            - --cache=.25
            - --max-sql-memory=.25
          env:
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
          volumeMounts:
            - name: datadir
              mountPath: /cockroach/cockroach-data
            - name: certs
              mountPath: /cockroach/cockroach-certs
          resources:
            requests:
              memory: "4Gi"
              cpu: "1"
            limits:
              memory: "8Gi"
              cpu: "4"
          livenessProbe:
            httpGet:
              path: /health
              port: http
              scheme: HTTPS
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health?ready=1
              port: http
              scheme: HTTPS
            initialDelaySeconds: 10
            periodSeconds: 5
      volumes:
        - name: certs
          projected:
            sources:
              - secret:
                  name: cockroachdb-node-secret
                  items:
                    - key: tls.crt
                      path: node.crt
                    - key: tls.key
                      path: node.key
                    - key: ca.crt
                      path: ca.crt
              - secret:
                  name: cockroachdb-client-secret
                  items:
                    - key: tls.crt
                      path: client.root.crt
                    - key: tls.key
                      path: client.root.key
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - cockroachdb
              topologyKey: kubernetes.io/hostname
  volumeClaimTemplates:
    - metadata:
        name: datadir
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: local-path
        resources:
          requests:
            storage: 100Gi
```

## Step 4: Create Services

```yaml
# cockroachdb-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: cockroachdb
  namespace: cockroachdb
spec:
  selector:
    app: cockroachdb
  ports:
    - port: 26257
      targetPort: 26257
      name: grpc
    - port: 8080
      targetPort: 8080
      name: http
  clusterIP: None
---
apiVersion: v1
kind: Service
metadata:
  name: cockroachdb-public
  namespace: cockroachdb
spec:
  selector:
    app: cockroachdb
  ports:
    - port: 26257
      targetPort: 26257
      name: grpc
    - port: 8080
      targetPort: 8080
      name: http
  type: ClusterIP
```

```bash
kubectl apply -f cockroachdb-statefulset.yaml
kubectl apply -f cockroachdb-service.yaml
```

## Step 5: Initialize the Cluster

After the pods are running, initialize the CockroachDB cluster:

```bash
# Run the init command on the first node
kubectl exec -it cockroachdb-0 -n cockroachdb -- \
  /cockroach/cockroach init \
  --certs-dir=/cockroach/cockroach-certs \
  --host=cockroachdb-0.cockroachdb.cockroachdb.svc.cluster.local
```

## Step 6: Access the SQL Shell

```bash
# Connect to CockroachDB SQL
kubectl exec -it cockroachdb-0 -n cockroachdb -- \
  /cockroach/cockroach sql \
  --certs-dir=/cockroach/cockroach-certs \
  --host=cockroachdb-0.cockroachdb.cockroachdb.svc.cluster.local
```

```sql
-- Create a database and user
CREATE DATABASE myapp;
CREATE USER appuser WITH PASSWORD 'app-password';
GRANT ALL ON DATABASE myapp TO appuser;

-- Check cluster status
SHOW CLUSTER SETTING version;
SELECT * FROM crdb_internal.gossip_nodes;
```

## Step 7: Access the Admin UI

Forward the CockroachDB admin UI port to access the dashboard:

```bash
kubectl port-forward svc/cockroachdb-public -n cockroachdb 8080:8080
```

Open your browser and navigate to `https://localhost:8080` to see cluster metrics, node status, and query performance data.

## Using the CockroachDB Operator

For production environments, CockroachDB provides an official Kubernetes operator:

```bash
# Install the CockroachDB operator
kubectl apply -f https://raw.githubusercontent.com/cockroachdb/cockroach-operator/v2.13.0/install/crds.yaml
kubectl apply -f https://raw.githubusercontent.com/cockroachdb/cockroach-operator/v2.13.0/install/operator.yaml
```

```yaml
# cockroach-operator-cluster.yaml
apiVersion: crdb.cockroachlabs.com/v1alpha1
kind: CrdbCluster
metadata:
  name: cockroachdb
  namespace: cockroachdb
spec:
  dataStore:
    pvc:
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: local-path
        resources:
          requests:
            storage: 100Gi
  resources:
    requests:
      memory: "4Gi"
      cpu: "1"
    limits:
      memory: "8Gi"
      cpu: "4"
  tlsEnabled: true
  image:
    name: cockroachdb/cockroach:v23.2.3
  nodes: 3
```

The operator handles certificate rotation, version upgrades, and node decommissioning automatically.

## Backup and Restore

CockroachDB supports full and incremental backups natively. You can back up to S3-compatible storage:

```sql
-- Full backup to S3
BACKUP INTO 's3://my-bucket/cockroach-backups?AUTH=implicit'
  AS OF SYSTEM TIME '-10s';

-- Incremental backup
BACKUP INTO LATEST IN 's3://my-bucket/cockroach-backups?AUTH=implicit'
  AS OF SYSTEM TIME '-10s';

-- Schedule automatic backups
CREATE SCHEDULE daily_backup
  FOR BACKUP INTO 's3://my-bucket/cockroach-backups?AUTH=implicit'
  RECURRING '@daily'
  WITH SCHEDULE OPTIONS first_run = 'now';
```

## Conclusion

CockroachDB on Talos Linux is a powerful combination for applications that need distributed SQL with strong consistency. The deployment process involves setting up TLS certificates, using StatefulSets for stable identities, and initializing the cluster after the nodes are running. For production use, the CockroachDB operator reduces operational burden significantly. The key advantage of running this combination is that both CockroachDB and Talos Linux are designed for automated, self-healing operation, reducing the need for manual intervention in your database infrastructure.
