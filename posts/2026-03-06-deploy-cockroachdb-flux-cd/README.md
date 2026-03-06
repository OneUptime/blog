# How to Deploy CockroachDB with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, cockroachdb, kubernetes, database, gitops, distributed sql, newSQL, cloud-native

Description: A practical guide to deploying CockroachDB distributed SQL database on Kubernetes using Flux CD for GitOps-managed database infrastructure.

---

## Introduction

CockroachDB is a cloud-native, distributed SQL database designed for high availability, horizontal scalability, and strong consistency. It provides PostgreSQL-compatible SQL with automatic sharding, replication, and failover. CockroachDB is well-suited for Kubernetes deployments due to its self-healing and distributed nature.

This guide demonstrates how to deploy CockroachDB on Kubernetes using Flux CD, covering secure cluster setup, node configuration, backup scheduling, and monitoring.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later) with at least three worker nodes
- Flux CD installed and bootstrapped on your cluster
- A storage class that supports dynamic provisioning
- kubectl configured to access your cluster
- A Git repository connected to Flux CD
- cert-manager installed (for TLS certificate management)

## Repository Structure

```
clusters/
  my-cluster/
    databases/
      cockroachdb/
        namespace.yaml
        helmrepository.yaml
        helmrelease.yaml
        certificate.yaml
        client-secret.yaml
        kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/databases/cockroachdb/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cockroachdb
  labels:
    app.kubernetes.io/name: cockroachdb
    app.kubernetes.io/part-of: database
```

## Step 2: Add the CockroachDB Helm Repository

```yaml
# clusters/my-cluster/databases/cockroachdb/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: cockroachdb
  namespace: cockroachdb
spec:
  interval: 1h
  # Official CockroachDB Helm chart repository
  url: https://charts.cockroachdb.com/
```

## Step 3: Create TLS Certificates

CockroachDB requires TLS certificates for secure inter-node and client communication. Use cert-manager to manage these.

```yaml
# clusters/my-cluster/databases/cockroachdb/certificate.yaml
# CA Issuer for CockroachDB
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: cockroachdb-ca-issuer
  namespace: cockroachdb
spec:
  selfSigned: {}
---
# CA Certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: cockroachdb-ca
  namespace: cockroachdb
spec:
  isCA: true
  commonName: cockroachdb-ca
  secretName: cockroachdb-ca-secret
  duration: 87600h # 10 years
  renewBefore: 720h # 30 days
  issuerRef:
    name: cockroachdb-ca-issuer
    kind: Issuer
---
# Issuer using the CA
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: cockroachdb-issuer
  namespace: cockroachdb
spec:
  ca:
    secretName: cockroachdb-ca-secret
---
# Node certificate for inter-node communication
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: cockroachdb-node
  namespace: cockroachdb
spec:
  secretName: cockroachdb-node-secret
  duration: 8760h # 1 year
  renewBefore: 720h # 30 days
  issuerRef:
    name: cockroachdb-issuer
    kind: Issuer
  commonName: node
  usages:
    - digital signature
    - key encipherment
    - server auth
    - client auth
  dnsNames:
    - localhost
    - "127.0.0.1"
    - "cockroachdb-public"
    - "cockroachdb-public.cockroachdb"
    - "cockroachdb-public.cockroachdb.svc.cluster.local"
    - "*.cockroachdb"
    - "*.cockroachdb.cockroachdb"
    - "*.cockroachdb.cockroachdb.svc.cluster.local"
---
# Client certificate for root user
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: cockroachdb-root
  namespace: cockroachdb
spec:
  secretName: cockroachdb-root-secret
  duration: 8760h
  renewBefore: 720h
  issuerRef:
    name: cockroachdb-issuer
    kind: Issuer
  commonName: root
  usages:
    - digital signature
    - key encipherment
    - client auth
```

## Step 4: Deploy CockroachDB

```yaml
# clusters/my-cluster/databases/cockroachdb/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cockroachdb
  namespace: cockroachdb
spec:
  interval: 30m
  chart:
    spec:
      chart: cockroachdb
      version: "13.x"
      sourceRef:
        kind: HelmRepository
        name: cockroachdb
        namespace: cockroachdb
  timeout: 20m
  values:
    # Number of CockroachDB nodes
    statefulset:
      replicas: 3
      # Resource configuration
      resources:
        requests:
          cpu: "1"
          memory: 4Gi
        limits:
          cpu: "4"
          memory: 8Gi
      # Update strategy
      updateStrategy:
        type: RollingUpdate
      # Pod anti-affinity to spread across nodes
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app.kubernetes.io/name: cockroachdb

    # Storage configuration
    storage:
      persistentVolume:
        enabled: true
        size: 100Gi
        storageClass: standard

    # TLS configuration using cert-manager certificates
    tls:
      enabled: true
      certs:
        provided: true
        nodeSecret: cockroachdb-node-secret
        clientRootSecret: cockroachdb-root-secret
        tlsSecret: true

    # CockroachDB configuration
    conf:
      # Maximum memory allocated to CockroachDB cache
      cache: "2GB"
      # Maximum memory allocated to SQL operations
      max-sql-memory: "2GB"
      # Locality configuration for rack-awareness
      locality: "region=us-east-1,zone=us-east-1a"
      # Join addresses for cluster formation
      join: []
      # Log configuration
      logtostderr: INFO
      # Maximum clock offset for distributed consistency
      max-offset: 500ms

    # Service configuration
    service:
      public:
        type: ClusterIP
        ports:
          grpc:
            port: 26257
          http:
            port: 8080

    # Init job configuration
    init:
      provisioning:
        enabled: true
        # SQL commands to run after cluster initialization
        databases:
          - name: appdb
        users:
          - name: app_user
            password: "change-me-app-password"
            options:
              - "LOGIN"
        grants:
          - database: appdb
            user: app_user
            privileges:
              - "ALL"
```

## Step 5: Configure Backup Schedule

```yaml
# clusters/my-cluster/databases/cockroachdb/backup.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cockroachdb-backup
  namespace: cockroachdb
spec:
  # Daily backup at 2 AM UTC
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: cockroachdb/cockroach:v24.1.0
              command:
                - /bin/bash
                - -c
                - |
                  # Set timestamp for backup naming
                  TIMESTAMP=$(date +%Y%m%d-%H%M%S)

                  # Run full cluster backup to S3
                  cockroach sql \
                    --certs-dir=/cockroach/cockroach-certs \
                    --host=cockroachdb-public \
                    --execute="BACKUP INTO 's3://cockroachdb-backups/cluster/${TIMESTAMP}?AUTH=specified&AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}&AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}&AWS_REGION=us-east-1'
                    WITH revision_history;"

                  echo "Backup completed: ${TIMESTAMP}"
              env:
                - name: AWS_ACCESS_KEY_ID
                  valueFrom:
                    secretKeyRef:
                      name: cockroachdb-s3-credentials
                      key: access-key
                - name: AWS_SECRET_ACCESS_KEY
                  valueFrom:
                    secretKeyRef:
                      name: cockroachdb-s3-credentials
                      key: secret-key
              volumeMounts:
                - name: client-certs
                  mountPath: /cockroach/cockroach-certs
                  readOnly: true
          volumes:
            - name: client-certs
              projected:
                sources:
                  - secret:
                      name: cockroachdb-root-secret
                      items:
                        - key: tls.crt
                          path: client.root.crt
                        - key: tls.key
                          path: client.root.key
                  - secret:
                      name: cockroachdb-ca-secret
                      items:
                        - key: ca.crt
                          path: ca.crt
---
# S3 credentials secret
apiVersion: v1
kind: Secret
metadata:
  name: cockroachdb-s3-credentials
  namespace: cockroachdb
type: Opaque
stringData:
  access-key: "your-access-key"
  secret-key: "your-secret-key"
```

## Step 6: Configure Monitoring

```yaml
# clusters/my-cluster/databases/cockroachdb/monitoring.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cockroachdb
  namespace: cockroachdb
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: cockroachdb
  endpoints:
    # CockroachDB exposes Prometheus metrics on the HTTP port
    - port: http
      path: /_status/vars
      interval: 15s
      scheme: https
      tlsConfig:
        insecureSkipVerify: true
```

## Step 7: Create the Kustomization

```yaml
# clusters/my-cluster/databases/cockroachdb/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - certificate.yaml
  - helmrelease.yaml
  - backup.yaml
  - monitoring.yaml
```

## Step 8: Create the Flux Kustomization

```yaml
# clusters/my-cluster/databases/cockroachdb-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cockroachdb
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/databases/cockroachdb
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: cockroachdb
      namespace: cockroachdb
  timeout: 25m
```

## Verify the Deployment

```bash
# Check Flux reconciliation
flux get kustomizations cockroachdb

# Check the HelmRelease
flux get helmreleases -n cockroachdb

# Verify all pods are running
kubectl get pods -n cockroachdb

# Check cluster status via the SQL shell
kubectl exec -it cockroachdb-0 -n cockroachdb -- \
  cockroach sql --certs-dir=/cockroach/cockroach-certs \
  --host=cockroachdb-public \
  --execute="SHOW CLUSTER SETTING version;"

# Check node status
kubectl exec -it cockroachdb-0 -n cockroachdb -- \
  cockroach node status --certs-dir=/cockroach/cockroach-certs \
  --host=cockroachdb-public

# Access the CockroachDB admin UI
kubectl port-forward svc/cockroachdb-public -n cockroachdb 8080:8080
```

## Scaling the Cluster

CockroachDB scales horizontally by adding more nodes. Update the replicas count:

```yaml
statefulset:
  # Scale from 3 to 5 nodes
  replicas: 5
```

After pushing to Git, Flux CD will reconcile and CockroachDB will automatically rebalance data across the new nodes.

## Application Connection

```yaml
# Example application connecting to CockroachDB
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-db-config
  namespace: default
data:
  # PostgreSQL-compatible connection string
  DATABASE_URL: "postgresql://app_user:change-me-app-password@cockroachdb-public.cockroachdb.svc.cluster.local:26257/appdb?sslmode=verify-full&sslrootcert=/certs/ca.crt"
```

## Troubleshooting

1. **Nodes not joining the cluster**: Verify TLS certificates are valid and that DNS resolution works between pods. Check the join addresses.

2. **Rebalancing too slow**: Adjust the rebalance rate with `SET CLUSTER SETTING kv.snapshot_rebalance.max_rate = '64MiB'`.

3. **Clock synchronization errors**: CockroachDB requires clock skew under 500ms. Ensure NTP is configured on all nodes.

```bash
# Check CockroachDB logs
kubectl logs -n cockroachdb cockroachdb-0 --tail=100

# Check cluster health
kubectl exec -it cockroachdb-0 -n cockroachdb -- \
  cockroach node status --certs-dir=/cockroach/cockroach-certs \
  --host=cockroachdb-public --decommission

# Check ranges distribution
kubectl exec -it cockroachdb-0 -n cockroachdb -- \
  cockroach sql --certs-dir=/cockroach/cockroach-certs \
  --host=cockroachdb-public \
  --execute="SELECT * FROM crdb_internal.ranges_no_leases LIMIT 10;"
```

## Conclusion

You have successfully deployed CockroachDB on Kubernetes using Flux CD. The setup provides a distributed SQL database with automatic replication, horizontal scaling, and strong consistency guarantees. With TLS encryption, automated backups, and Prometheus monitoring, your CockroachDB cluster is production-ready and fully managed through GitOps.
