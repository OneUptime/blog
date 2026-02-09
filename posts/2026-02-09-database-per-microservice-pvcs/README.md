# How to Implement Database Per Microservice Pattern on Kubernetes with Separate PVCs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Microservices, Database, PersistentVolumeClaim, Architecture

Description: Implement the database per microservice pattern on Kubernetes using separate PersistentVolumeClaims for data isolation, including StatefulSet configurations, storage classes, and backup strategies.

---

The database per microservice pattern ensures each service owns its data, preventing tight coupling and enabling independent scaling. On Kubernetes, implementing this pattern requires careful management of PersistentVolumeClaims (PVCs) to provide isolated, durable storage for each database instance.

## Understanding the Pattern Benefits

When each microservice has its own database, services can choose the database technology that best fits their needs. The user service might use PostgreSQL for relational data, while the session service uses Redis for fast key-value operations. The order service could use MongoDB for flexible document storage.

Data isolation prevents accidental dependencies. Without shared databases, services cannot create foreign keys across boundaries or run complex joins that would break when services are deployed separately. This isolation forces proper API design and service boundaries.

Independent scaling becomes possible. A high-traffic service can scale its database vertically or horizontally without affecting other services. Database maintenance, upgrades, and migrations happen on a per-service basis, reducing coordination overhead.

## Designing Storage Architecture

Each microservice requires a dedicated StatefulSet with its own PVC. StatefulSets provide stable network identities and persistent storage that survives pod restarts. The volumeClaimTemplate automatically creates PVCs for each replica.

Choose appropriate storage classes based on workload requirements. Use SSD-backed storage for databases requiring low latency and high IOPS. Network-attached storage works well for development environments where performance is less critical.

Size PVCs based on growth projections. Include buffer space for indexes, temporary tables, and write-ahead logs. Monitor disk usage and implement alerting before reaching capacity limits.

## Implementing PostgreSQL Per Service

Here's a complete StatefulSet for a user service database:

```yaml
# user-service-postgres.yaml
apiVersion: v1
kind: Service
metadata:
  name: user-db
  namespace: microservices
  labels:
    app: user-db
spec:
  ports:
    - port: 5432
      name: postgres
  clusterIP: None
  selector:
    app: user-db
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: user-db
  namespace: microservices
spec:
  serviceName: user-db
  replicas: 1
  selector:
    matchLabels:
      app: user-db
  template:
    metadata:
      labels:
        app: user-db
    spec:
      containers:
        - name: postgres
          image: postgres:15
          ports:
            - containerPort: 5432
              name: postgres
          env:
            - name: POSTGRES_DB
              value: userdb
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: user-db-credentials
                  key: username
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: user-db-credentials
                  key: password
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          livenessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - $(POSTGRES_USER)
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - $(POSTGRES_USER)
            initialDelaySeconds: 5
            periodSeconds: 5
  volumeClaimTemplates:
    - metadata:
        name: postgres-storage
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 20Gi
```

Create a similar StatefulSet for each microservice, adjusting the namespace, service name, and database configuration.

## Creating Service-Specific Secrets

Each database needs unique credentials:

```bash
# User service database credentials
kubectl create secret generic user-db-credentials \
  --from-literal=username=userdbadmin \
  --from-literal=password=user-secure-pass-123 \
  --namespace=microservices

# Order service database credentials
kubectl create secret generic order-db-credentials \
  --from-literal=username=orderdbadmin \
  --from-literal=password=order-secure-pass-456 \
  --namespace=microservices

# Product service database credentials
kubectl create secret generic product-db-credentials \
  --from-literal=username=productdbadmin \
  --from-literal=password=product-secure-pass-789 \
  --namespace=microservices
```

Never reuse credentials across services. Separate credentials enable fine-grained access control and easier credential rotation.

## Implementing Multi-Database Architecture

Deploy different database technologies based on service needs:

```yaml
# order-service-mongodb.yaml
apiVersion: v1
kind: Service
metadata:
  name: order-db
  namespace: microservices
spec:
  ports:
    - port: 27017
      name: mongodb
  clusterIP: None
  selector:
    app: order-db
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: order-db
  namespace: microservices
spec:
  serviceName: order-db
  replicas: 1
  selector:
    matchLabels:
      app: order-db
  template:
    metadata:
      labels:
        app: order-db
    spec:
      containers:
        - name: mongodb
          image: mongo:7.0
          ports:
            - containerPort: 27017
              name: mongodb
          env:
            - name: MONGO_INITDB_DATABASE
              value: orderdb
            - name: MONGO_INITDB_ROOT_USERNAME
              valueFrom:
                secretKeyRef:
                  name: order-db-credentials
                  key: username
            - name: MONGO_INITDB_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: order-db-credentials
                  key: password
          volumeMounts:
            - name: mongodb-storage
              mountPath: /data/db
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
  volumeClaimTemplates:
    - metadata:
        name: mongodb-storage
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 30Gi
```

## Configuring Storage Classes

Define storage classes that match your infrastructure:

```yaml
# storage-classes.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard-disk
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp2
  encrypted: "true"
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: high-performance
provisioner: kubernetes.io/aws-ebs
parameters:
  type: io2
  iops: "10000"
  encrypted: "true"
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

Apply the storage classes:

```bash
kubectl apply -f storage-classes.yaml
```

Use `fast-ssd` for most production databases, `standard-disk` for development, and `high-performance` for databases with extreme throughput requirements.

## Implementing Network Policies

Restrict database access to only the owning service:

```yaml
# user-db-network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: user-db-policy
  namespace: microservices
spec:
  podSelector:
    matchLabels:
      app: user-db
  policyTypes:
    - Ingress
  ingress:
    # Only allow user service to access
    - from:
        - podSelector:
            matchLabels:
              app: user-service
      ports:
        - protocol: TCP
          port: 5432
```

Create similar policies for each database, ensuring only the owning service can connect. This enforces the architectural boundary at the network level.

## Managing Database Initialization

Use init containers to run schema migrations:

```yaml
# user-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: microservices
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      initContainers:
        - name: migrate
          image: myregistry/user-service-migrator:latest
          env:
            - name: DATABASE_URL
              value: postgresql://$(DB_USER):$(DB_PASS)@user-db:5432/userdb
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: user-db-credentials
                  key: username
            - name: DB_PASS
              valueFrom:
                secretKeyRef:
                  name: user-db-credentials
                  key: password
          command:
            - /app/migrate
            - up
      containers:
        - name: user-service
          image: myregistry/user-service:latest
          env:
            - name: DATABASE_URL
              value: postgresql://$(DB_USER):$(DB_PASS)@user-db:5432/userdb
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: user-db-credentials
                  key: username
            - name: DB_PASS
              valueFrom:
                secretKeyRef:
                  name: user-db-credentials
                  key: password
          ports:
            - containerPort: 8080
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
```

## Implementing Backup Strategies

Create CronJobs for automated backups of each database:

```yaml
# user-db-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: user-db-backup
  namespace: microservices
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: postgres:15
              command:
                - sh
                - -c
                - |
                  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
                  pg_dump -h user-db -U $POSTGRES_USER -d userdb | \
                    gzip > /backups/user-db-$TIMESTAMP.sql.gz

                  # Upload to S3
                  aws s3 cp /backups/user-db-$TIMESTAMP.sql.gz \
                    s3://my-backup-bucket/user-db/

                  # Clean up local file
                  rm /backups/user-db-$TIMESTAMP.sql.gz

                  # Keep only last 7 days in S3
                  aws s3 ls s3://my-backup-bucket/user-db/ | \
                    awk '{print $4}' | \
                    sort -r | \
                    tail -n +8 | \
                    xargs -I {} aws s3 rm s3://my-backup-bucket/user-db/{}
              env:
                - name: POSTGRES_USER
                  valueFrom:
                    secretKeyRef:
                      name: user-db-credentials
                      key: username
                - name: PGPASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: user-db-credentials
                      key: password
                - name: AWS_ACCESS_KEY_ID
                  valueFrom:
                    secretKeyRef:
                      name: aws-credentials
                      key: access-key
                - name: AWS_SECRET_ACCESS_KEY
                  valueFrom:
                    secretKeyRef:
                      name: aws-credentials
                      key: secret-key
              volumeMounts:
                - name: backup-storage
                  mountPath: /backups
          volumes:
            - name: backup-storage
              emptyDir: {}
```

## Monitoring Storage Usage

Deploy a monitoring solution to track PVC usage:

```bash
# Check PVC status
kubectl get pvc -n microservices

# View detailed PVC information
kubectl describe pvc postgres-storage-user-db-0 -n microservices

# Monitor disk usage in pods
kubectl exec -it user-db-0 -n microservices -- df -h /var/lib/postgresql/data
```

Set up alerts when PVCs reach 80% capacity to allow time for expansion or cleanup.

## Handling Data Consistency

While each service owns its data, you sometimes need consistency across services. Use the Saga pattern or event sourcing instead of distributed transactions.

Publish domain events when data changes. Other services subscribe to relevant events and update their own databases. This maintains loose coupling while ensuring eventual consistency.

Never access another service's database directly. Always use the service's API, even if it seems less efficient. This architectural discipline prevents hidden dependencies that break during independent deployments.

The database per microservice pattern with separate PVCs provides true service independence on Kubernetes. While it requires more infrastructure management, the benefits of isolated failure domains, independent scaling, and technology flexibility outweigh the operational complexity.
