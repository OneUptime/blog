# How to Deploy MongoDB Community Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, MongoDB, Community Operator, Database Operators, NoSQL

Description: Deploy the MongoDB Community Kubernetes Operator for managed MongoDB replica sets using Flux CD GitOps workflows.

---

## Introduction

The MongoDB Community Operator is the free, open-source Kubernetes operator maintained by MongoDB, Inc. It supports MongoDB replica sets, TLS configuration, SCRAM authentication, and rolling upgrades. While it lacks some enterprise features of the Percona or Ops Manager operators (like automated backups to S3 and sharding), it is the simplest path to running a production-grade MongoDB replica set on Kubernetes for teams that don't need those features.

Deploying the MongoDB Community Operator through Flux CD gives you GitOps-managed MongoDB clusters where topology changes and configuration updates flow through pull requests. The operator is available as a Helm chart from MongoDB's official repository.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs
- `kubectl` and `flux` CLIs installed

## Step 1: Add the MongoDB HelmRepository

```yaml
# infrastructure/sources/mongodb-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: mongodb
  namespace: flux-system
spec:
  interval: 12h
  url: https://mongodb.github.io/helm-charts
```

## Step 2: Deploy the MongoDB Community Operator

```yaml
# infrastructure/databases/mongodb-community/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mongodb
```

```yaml
# infrastructure/databases/mongodb-community/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: community-operator
  namespace: mongodb
spec:
  interval: 30m
  chart:
    spec:
      chart: community-operator
      version: "0.10.0"
      sourceRef:
        kind: HelmRepository
        name: mongodb
        namespace: flux-system
  install:
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    operator:
      watchNamespace: "*"  # watch all namespaces, or specify "mongodb"
    resources:
      operator:
        requests:
          cpu: "100m"
          memory: "256Mi"
        limits:
          cpu: "500m"
          memory: "512Mi"
```

## Step 3: Create a MongoDB Replica Set

```yaml
# infrastructure/databases/mongodb-community/mongodb-replicaset.yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: my-mongodb
  namespace: mongodb
spec:
  members: 3
  type: ReplicaSet
  version: "7.0.11"

  security:
    authentication:
      modes:
        - SCRAM  # SCRAM-SHA-256 authentication
    tls:
      enabled: true
      certificateKeySecretRef:
        name: mongodb-tls-cert
      caCertificateSecretRef:
        name: mongodb-ca-cert

  users:
    # Admin user
    - name: my-user
      db: admin
      passwordSecretRef:
        name: my-user-password
      roles:
        - name: clusterAdmin
          db: admin
        - name: userAdminAnyDatabase
          db: admin
      scramCredentialsSecretName: my-scram

    # Application user
    - name: app-user
      db: myapp
      passwordSecretRef:
        name: app-user-password
      roles:
        - name: readWrite
          db: myapp
      scramCredentialsSecretName: app-scram

  additionalMongodConfig:
    # MongoDB configuration options
    storage.wiredTiger.engineConfig.journalCompressor: snappy
    operationProfiling.mode: slowOp
    operationProfiling.slowOpThresholdMs: 100
    net.ssl.mode: requireSSL

  statefulSet:
    spec:
      template:
        spec:
          containers:
            - name: mongod
              resources:
                requests:
                  cpu: "500m"
                  memory: "1Gi"
                limits:
                  cpu: "1"
                  memory: "2Gi"
          affinity:
            podAntiAffinity:
              preferredDuringSchedulingIgnoredDuringExecution:
                - weight: 100
                  podAffinityTerm:
                    topologyKey: kubernetes.io/hostname
                    labelSelector:
                      matchLabels:
                        app: my-mongodb-svc
      volumeClaimTemplates:
        - metadata:
            name: data-volume
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 20Gi
            storageClassName: fast-ssd
```

## Step 4: Create Required Secrets

```yaml
# infrastructure/databases/mongodb-community/secrets.yaml (use SealedSecret)
apiVersion: v1
kind: Secret
metadata:
  name: my-user-password
  namespace: mongodb
type: Opaque
stringData:
  password: "AdminPassword123!"
---
apiVersion: v1
kind: Secret
metadata:
  name: app-user-password
  namespace: mongodb
type: Opaque
stringData:
  password: "AppPassword123!"
```

For TLS, generate certificates using cert-manager:

```yaml
# infrastructure/databases/mongodb-community/certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: mongodb-tls
  namespace: mongodb
spec:
  secretName: mongodb-tls-cert
  duration: 8760h  # 1 year
  renewBefore: 720h
  subject:
    organizations:
      - my-org
  isCA: false
  privateKey:
    algorithm: RSA
    size: 2048
  dnsNames:
    - "*.my-mongodb-svc.mongodb.svc.cluster.local"
    - "*.my-mongodb-svc.mongodb.svc"
  issuerRef:
    name: cluster-issuer
    kind: ClusterIssuer
```

## Step 5: Flux Kustomization

```yaml
# clusters/production/mongodb-community-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: mongodb-community
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/databases/mongodb-community
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: mongodb-kubernetes-operator
      namespace: mongodb
```

## Step 6: Verify the Replica Set

```bash
# Check operator
kubectl get deployment mongodb-kubernetes-operator -n mongodb

# Check MongoDBCommunity resource
kubectl get mongodbcommunity my-mongodb -n mongodb

# Check pods
kubectl get pods -n mongodb

# Get the connection string
kubectl get secret my-mongodb-my-user -n mongodb \
  -o jsonpath='{.data.connectionString\.standardSrv}' | base64 -d

# Connect with mongosh (requires TLS cert)
kubectl exec -n mongodb -it my-mongodb-0 -- \
  mongosh --tls --tlsCAFile /var/lib/tls/ca/ca.crt \
  -u my-user -p 'AdminPassword123!' --authenticationDatabase admin
```

## Best Practices

- Enable TLS (`security.tls.enabled: true`) and use cert-manager for automated certificate management.
- Use SCRAM-SHA-256 authentication (`modes: [SCRAM]`) and avoid unauthenticated deployments.
- Set `operationProfiling.mode: slowOp` with a threshold to automatically capture slow queries.
- Configure pod anti-affinity to ensure replica set members are on different nodes for resilience.
- For backups, use MongoDB's `mongodump` in a scheduled CronJob or a third-party backup solution like Kasten K10 since the Community Operator does not include integrated backup management.

## Conclusion

The MongoDB Community Operator deployed via Flux CD provides a straightforward path to running MongoDB replica sets on Kubernetes with SCRAM authentication, TLS, and rolling upgrades — all managed declaratively. For teams with straightforward MongoDB requirements who don't need sharding or integrated backup management, this operator offers the cleanest API and the simplest operational model. Combined with Flux CD, your MongoDB clusters are fully described in Git and automatically reconciled.
