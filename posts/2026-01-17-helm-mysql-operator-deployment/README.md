# Deploying MySQL Operator with Helm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, DevOps, MySQL, Operator, Database, InnoDB Cluster

Description: Complete guide to deploying MySQL Operator for Kubernetes using Helm charts for managing MySQL InnoDB clusters and high-availability database deployments.

> MySQL Operator simplifies the deployment and management of MySQL InnoDB clusters on Kubernetes. This guide covers deploying MySQL using the official Oracle MySQL Operator with Helm charts for production environments.

## MySQL Operator Architecture

```mermaid
flowchart TB
  subgraph "MySQL Operator"
    operator[MySQL Operator]
    sidecar[Sidecar Agent]
  end
  
  subgraph "InnoDB Cluster"
    primary[(Primary)]
    secondary1[(Secondary 1)]
    secondary2[(Secondary 2)]
    router1[MySQL Router 1]
    router2[MySQL Router 2]
  end
  
  subgraph "Kubernetes Resources"
    statefulset[StatefulSet]
    services[Services]
    secrets[Secrets]
    pvc[PVCs]
    configmap[ConfigMaps]
  end
  
  subgraph "Applications"
    app1[App 1]
    app2[App 2]
  end
  
  operator --> statefulset
  operator --> services
  operator --> secrets
  operator --> configmap
  
  statefulset --> primary
  statefulset --> secondary1
  statefulset --> secondary2
  
  sidecar --> primary
  sidecar --> secondary1
  sidecar --> secondary2
  
  app1 --> router1
  app2 --> router2
  router1 --> primary
  router2 --> primary
```

## Prerequisites

```bash
# Add MySQL Helm repository

helm repo add mysql-operator https://mysql.github.io/mysql-operator/
helm repo update

# Search available versions
helm search repo mysql-operator --versions
```

## Install MySQL Operator

### Basic Installation

```yaml
# mysql-operator-values.yaml
image:
  registry: container-registry.oracle.com
  repository: mysql
  name: community-operator
  tag: 9.7.0-2.2.8

deployment:
  # Watch specific namespaces (empty = all)
  namespaces: []

  resources:
    requests:
      cpu: 100m
      memory: 512Mi
    limits:
      cpu: 500m
      memory: 1Gi
```

```bash
helm install mysql-operator mysql-operator/mysql-operator \
  --namespace mysql-operator \
  --create-namespace \
  -f mysql-operator-values.yaml
```

## Deploy MySQL InnoDB Cluster

### Create Root Password Secret

```bash
kubectl create namespace mysql

kubectl create secret generic mysql-root-credentials \
  --namespace mysql \
  --from-literal=rootUser=root \
  --from-literal=rootHost=% \
  --from-literal=rootPassword=$(openssl rand -base64 24)
```

### Basic InnoDB Cluster

```yaml
# mysql-innodb-cluster.yaml
apiVersion: mysql.oracle.com/v2
kind: InnoDBCluster
metadata:
  name: mysql-cluster
  namespace: mysql
spec:
  secretName: mysql-root-credentials
  
  instances: 3
  
  version: "9.7.0"
  
  router:
    instances: 2
    
  datadirVolumeClaimTemplate:
    accessModes: ["ReadWriteOnce"]
    storageClassName: fast-ssd
    resources:
      requests:
        storage: 50Gi
```

```bash
kubectl apply -f mysql-innodb-cluster.yaml
```

### Production InnoDB Cluster

```yaml
# mysql-production-cluster.yaml
apiVersion: mysql.oracle.com/v2
kind: InnoDBCluster
metadata:
  name: mysql-production
  namespace: mysql
spec:
  secretName: mysql-root-credentials
  
  instances: 3
  
  version: "9.7.0"
  
  edition: community  # or enterprise
  
  # MySQL Server configuration
  mycnf: |
    [mysqld]
    max_connections = 500
    innodb_buffer_pool_size = 2G
    innodb_log_file_size = 512M
    innodb_flush_log_at_trx_commit = 1
    sync_binlog = 1
    binlog_format = ROW
    gtid_mode = ON
    enforce_gtid_consistency = ON
    
    # Performance tuning
    innodb_io_capacity = 2000
    innodb_io_capacity_max = 4000
    innodb_read_io_threads = 8
    innodb_write_io_threads = 8
    
    # Security
    local_infile = 0
    
  # Pod template for MySQL instances
  podSpec:
    containers:
      - name: mysql
        resources:
          requests:
            cpu: 1000m
            memory: 4Gi
          limits:
            cpu: 4000m
            memory: 8Gi
            
    affinity:
      podAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                mysql.oracle.com/cluster: mysql-production
            topologyKey: kubernetes.io/hostname
            
    tolerations:
      - key: "dedicated"
        operator: "Equal"
        value: "mysql"
        effect: "NoSchedule"
        
    nodeSelector:
      node-type: database
      
  # Storage configuration
  datadirVolumeClaimTemplate:
    accessModes: ["ReadWriteOnce"]
    storageClassName: fast-ssd
    resources:
      requests:
        storage: 100Gi
        
  # MySQL Router configuration
  router:
    instances: 2
    
    podSpec:
      containers:
        - name: router
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
              
    routingOptions:
      # Connection routing options
      read_only_targets: secondaries
      stats_updates_frequency: 1
      
  # TLS configuration
  tlsUseSelfSigned: false
  tlsCASecretName: mysql-ca
  tlsSecretName: mysql-server-tls
  
  # Image pull secrets
  imagePullSecrets:
    - name: regcred
```

## TLS Configuration

### Generate Certificates

```bash
# Create CA
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 \
  -out ca.crt -subj "/CN=MySQL CA"

# Create server certificate
openssl genrsa -out server.key 2048
cat > server.cnf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
[req_distinguished_name]
CN = mysql-production
[v3_req]
subjectAltName = @alt_names
[alt_names]
DNS.1 = *.mysql-production.mysql.svc.cluster.local
DNS.2 = mysql-production.mysql.svc.cluster.local
DNS.3 = *.mysql.svc.cluster.local
EOF

openssl req -new -key server.key -out server.csr -config server.cnf
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt -days 365 -sha256 \
  -extensions v3_req -extfile server.cnf

# Create secrets
kubectl create secret generic mysql-ca \
  --namespace mysql \
  --from-file=ca.pem=ca.crt

kubectl create secret tls mysql-server-tls \
  --namespace mysql \
  --cert=server.crt \
  --key=server.key
```

## Backup and Restore

### MySQL Backup CRD

```yaml
# mysql-backup.yaml
apiVersion: mysql.oracle.com/v2
kind: MySQLBackup
metadata:
  name: mysql-backup-20240117
  namespace: mysql
spec:
  clusterName: mysql-production

  backupProfile:
    dumpInstance:
      storage:
        ociObjectStorage:
          bucketName: mysql-backups
          prefix: production/
          credentials: oci-credentials
      
  # Or S3 storage
  # backupProfile:
  #   dumpInstance:
  #     storage:
  #       s3:
  #         bucketName: mysql-backups
  #         prefix: production/
  #         endpoint: https://s3.us-east-1.amazonaws.com
  #         profile: default
  #         config: s3-config
```

### Scheduled Backups

```yaml
# Add to InnoDB cluster spec
backupProfiles:
  - name: dump-instance-profile-s3
    dumpInstance:
      storage:
        s3:
          bucketName: mysql-backups
          prefix: production/
          endpoint: https://s3.us-east-1.amazonaws.com
          profile: default
          config: s3-config

backupSchedules:
  - name: daily-s3-backup
    schedule: "0 2 * * *"  # Daily at 2 AM
    backupProfileName: dump-instance-profile-s3
    enabled: true
    deleteBackupData: false
```

### Backup Credentials for S3

```yaml
# s3-config.yaml
apiVersion: v1
kind: Secret
metadata:
  name: s3-config
  namespace: mysql
type: Opaque
stringData:
  credentials: |
    [default]
    aws_access_key_id = YOUR_ACCESS_KEY
    aws_secret_access_key = YOUR_SECRET_KEY
  config: |
    [default]
    region = us-east-1
```

### Restore from Backup

```yaml
# mysql-restore.yaml
apiVersion: mysql.oracle.com/v2
kind: InnoDBCluster
metadata:
  name: mysql-restored
  namespace: mysql
spec:
  secretName: mysql-root-credentials
  instances: 3
  version: "9.7.0"
  
  # Initialize from backup
  initDB:
    clone:
      donorUrl: root@mysql-production-0.mysql-production-instances.mysql.svc.cluster.local:3306
      rootUser: root
      secretKeyRef:
        name: mysql-root-credentials
```

## User Management

### Create Application Users

```yaml
# mysql-users.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysql-app-credentials
  namespace: mysql
type: Opaque
stringData:
  username: app_user
  password: "secure-app-password"

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-init-script
  namespace: mysql
data:
  init.sql: |
    CREATE USER IF NOT EXISTS 'app_user'@'%' 
      IDENTIFIED BY 'secure-app-password';
    
    GRANT SELECT, INSERT, UPDATE, DELETE ON myapp.* 
      TO 'app_user'@'%';
    
    CREATE USER IF NOT EXISTS 'readonly_user'@'%' 
      IDENTIFIED BY 'readonly-password';
    
    GRANT SELECT ON myapp.* TO 'readonly_user'@'%';
    
    FLUSH PRIVILEGES;
```

### Run Init Script

```bash
# Connect to primary and run init
kubectl exec -it -n mysql mysql-production-0 -- \
  mysql -u root -p$(kubectl get secret -n mysql mysql-root-credentials -o jsonpath='{.data.rootPassword}' | base64 -d) \
  < /path/to/init.sql
```

## Connection Configuration

### Connection String Examples

```yaml
# mysql-connection.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysql-connection
  namespace: myapp
type: Opaque
stringData:
  # Through MySQL Router (recommended)
  MYSQL_HOST: "mysql-production.mysql.svc.cluster.local"
  MYSQL_PORT: "6446"  # Read/Write port
  MYSQL_RO_PORT: "6447"  # Read-Only port
  
  # Direct connection string
  DATABASE_URL: "mysql://app_user:password@mysql-production.mysql.svc.cluster.local:6446/myapp"
  
  # Read-only connection
  DATABASE_URL_RO: "mysql://app_user:password@mysql-production.mysql.svc.cluster.local:6447/myapp"
```

### Application Deployment

```yaml
# app-with-mysql.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: app
          image: myapp:latest
          env:
            - name: MYSQL_HOST
              valueFrom:
                secretKeyRef:
                  name: mysql-connection
                  key: MYSQL_HOST
            - name: MYSQL_PORT
              valueFrom:
                secretKeyRef:
                  name: mysql-connection
                  key: MYSQL_PORT
            - name: MYSQL_USER
              valueFrom:
                secretKeyRef:
                  name: mysql-app-credentials
                  key: username
            - name: MYSQL_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-app-credentials
                  key: password
          volumeMounts:
            - name: mysql-ca
              mountPath: /etc/ssl/certs/mysql-ca.crt
              subPath: ca.crt
      volumes:
        - name: mysql-ca
          secret:
            secretName: mysql-ca
```

## Monitoring

### Enable MySQL Metrics

```yaml
# Add to InnoDB cluster spec
metrics:
  enable: true
  image: prom/mysqld-exporter:v0.19.0
  monitor: true
  options:
    - --collect.perf_schema.replication_group_members
    - --collect.perf_schema.replication_group_member_stats
```

### Prometheus Alerts

```yaml
# mysql-prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: mysql-alerts
spec:
  groups:
    - name: mysql
      rules:
        - alert: MySQLDown
          expr: mysql_up == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "MySQL instance is down"
            
        - alert: MySQLGroupReplicationQueue
          expr: mysql_perf_schema_transactions_remote_in_applier_queue > 30
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "MySQL group replication apply queue is high"
            
        - alert: MySQLHighConnections
          expr: |
            mysql_global_status_threads_connected 
            / mysql_global_variables_max_connections > 0.8
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "MySQL connections running high"
            
        - alert: MySQLSlowQueries
          expr: |
            rate(mysql_global_status_slow_queries[5m]) > 0.1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "MySQL slow queries detected"
            
        - alert: MySQLInnoDBLogWaits
          expr: |
            rate(mysql_global_status_innodb_log_waits[5m]) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "MySQL InnoDB log waits detected"
```

## Scaling Operations

### Horizontal Scaling

```bash
# Scale from 3 to 5 instances
kubectl patch innodbcluster mysql-production -n mysql --type merge -p '{"spec":{"instances":5}}'

# Verify scaling
kubectl get pods -n mysql -l mysql.oracle.com/cluster=mysql-production
```

### Router Scaling

```bash
# Scale routers
kubectl patch innodbcluster mysql-production -n mysql --type merge -p '{"spec":{"router":{"instances":4}}}'
```

## Failover and Recovery

### Manual Failover

```bash
# Connect to MySQL Shell
kubectl exec -it -n mysql mysql-production-0 -- mysqlsh root@localhost

# In MySQL Shell
dba.getCluster().status()
dba.getCluster().setPrimaryInstance('mysql-production-1.mysql-production-instances.mysql.svc.cluster.local:3306')
```

### Automatic Recovery

The operator automatically handles:
- Pod failures and restarts
- Primary election on primary failure
- Rejoining recovered instances to cluster

## Troubleshooting

```bash
# Check operator logs
kubectl logs -n mysql-operator -l app.kubernetes.io/name=mysql-operator

# Check MySQL pods
kubectl get pods -n mysql

# Check InnoDB cluster status
kubectl get innodbcluster -n mysql

# Describe cluster
kubectl describe innodbcluster mysql-production -n mysql

# Check MySQL logs
kubectl logs -n mysql mysql-production-0 -c mysql

# Connect to MySQL
kubectl exec -it -n mysql mysql-production-0 -- mysql -u root -p

# Check cluster status in MySQL Shell
kubectl exec -it -n mysql mysql-production-0 -- \
  mysqlsh root@localhost --js -e "dba.getCluster().status()"

# Check replication status
kubectl exec -n mysql mysql-production-0 -- mysql -u root -p -e "SELECT * FROM performance_schema.replication_group_members"

# Check router status
kubectl get pods -n mysql -l app.kubernetes.io/name=mysql-router
```

## Wrap-up

MySQL Operator simplifies the deployment and management of MySQL InnoDB clusters on Kubernetes with automatic failover, scaling, and recovery. Configure proper resources, TLS encryption, and backup strategies for production deployments. Use MySQL Router for connection routing and load balancing between read and write operations. Monitor your clusters with the MySQL Exporter and set up alerts for replication lag and connection issues.
