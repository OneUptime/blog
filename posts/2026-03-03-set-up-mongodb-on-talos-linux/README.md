# How to Set Up MongoDB on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, MongoDB, Kubernetes, NoSQL, Database, DevOps

Description: Step-by-step guide to deploying MongoDB on Talos Linux with replica sets, persistent storage, and production-ready configurations.

---

MongoDB is a popular document database that handles unstructured and semi-structured data with ease. Running MongoDB on Talos Linux gives you the security benefits of an immutable OS combined with the flexibility of a NoSQL database. Since Talos Linux operates entirely through APIs and Kubernetes, MongoDB gets deployed as a containerized workload rather than a traditional installation.

This guide walks through setting up MongoDB on Talos Linux, from a single instance to a full replica set with proper authentication and storage.

## Why MongoDB on Talos Linux

Talos Linux removes the traditional OS management overhead. There are no system packages to update, no SSH sessions to manage, and no configuration files scattered across the filesystem. For MongoDB, this means the underlying OS is predictable and secure, letting you focus on database configuration rather than OS hardening. MongoDB's storage engine benefits from consistent kernel parameters, and Talos Linux provides that consistency by design.

## Prerequisites

- A functioning Talos Linux Kubernetes cluster
- `kubectl` and `talosctl` configured
- A StorageClass available for persistent volumes
- Minimum 4GB RAM per MongoDB node

## Step 1: Prepare Talos Linux for MongoDB

MongoDB works best with specific kernel parameters. Talos Linux lets you configure these through machine config patches:

```yaml
# talos-mongodb-patch.yaml
machine:
  sysctls:
    # MongoDB recommends disabling transparent huge pages
    vm.max_map_count: "262144"
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/lib/mongo-data
```

```bash
# Apply the configuration to worker nodes
talosctl apply-config --nodes 10.0.0.2,10.0.0.3,10.0.0.4 \
  --file talos-mongodb-patch.yaml
```

## Step 2: Create Namespace and Authentication

```yaml
# mongodb-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mongodb
---
# mongodb-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-credentials
  namespace: mongodb
type: Opaque
stringData:
  MONGO_INITDB_ROOT_USERNAME: "admin"
  MONGO_INITDB_ROOT_PASSWORD: "secure-mongo-password"
```

```bash
kubectl apply -f mongodb-namespace.yaml
```

## Step 3: Generate a Replica Set Key

MongoDB replica sets require a shared key file for internal authentication between members:

```bash
# Generate the keyfile and store it as a Kubernetes secret
openssl rand -base64 756 > mongodb-keyfile
kubectl create secret generic mongodb-keyfile \
  --from-file=keyfile=mongodb-keyfile \
  --namespace=mongodb
rm mongodb-keyfile
```

## Step 4: Deploy MongoDB as a StatefulSet

```yaml
# mongodb-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: mongodb
spec:
  serviceName: mongodb
  replicas: 3
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: mongodb
          image: mongo:7.0
          ports:
            - containerPort: 27017
              name: mongodb
          command:
            - mongod
            - "--replSet"
            - "rs0"
            - "--bind_ip_all"
            - "--keyFile"
            - "/etc/mongodb-keyfile/keyfile"
          envFrom:
            - secretRef:
                name: mongodb-credentials
          volumeMounts:
            - name: mongodb-data
              mountPath: /data/db
            - name: mongodb-keyfile
              mountPath: /etc/mongodb-keyfile
              readOnly: true
          resources:
            requests:
              memory: "2Gi"
              cpu: "500m"
            limits:
              memory: "4Gi"
              cpu: "2000m"
          # Check if MongoDB process is alive
          livenessProbe:
            exec:
              command:
                - mongosh
                - --eval
                - "db.adminCommand('ping')"
            initialDelaySeconds: 30
            periodSeconds: 10
          # Check if MongoDB is ready to serve traffic
          readinessProbe:
            exec:
              command:
                - mongosh
                - --eval
                - "db.adminCommand('ping')"
            initialDelaySeconds: 10
            periodSeconds: 5
      volumes:
        - name: mongodb-keyfile
          secret:
            secretName: mongodb-keyfile
            defaultMode: 0400
  volumeClaimTemplates:
    - metadata:
        name: mongodb-data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: local-path
        resources:
          requests:
            storage: 50Gi
```

## Step 5: Create Services

```yaml
# mongodb-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  namespace: mongodb
spec:
  selector:
    app: mongodb
  ports:
    - port: 27017
      targetPort: 27017
  clusterIP: None
```

```bash
# Deploy MongoDB
kubectl apply -f mongodb-statefulset.yaml
kubectl apply -f mongodb-service.yaml

# Wait for all pods to be ready
kubectl rollout status statefulset/mongodb -n mongodb
```

## Step 6: Initialize the Replica Set

Once all three pods are running, connect to the first pod and initialize the replica set:

```bash
# Connect to the primary node
kubectl exec -it mongodb-0 -n mongodb -- mongosh -u admin -p secure-mongo-password --authenticationDatabase admin
```

Inside the MongoDB shell, run:

```javascript
// Initialize the replica set with all three members
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongodb-0.mongodb.mongodb.svc.cluster.local:27017" },
    { _id: 1, host: "mongodb-1.mongodb.mongodb.svc.cluster.local:27017" },
    { _id: 2, host: "mongodb-2.mongodb.mongodb.svc.cluster.local:27017" }
  ]
});

// Verify replica set status
rs.status();
```

## Step 7: Create Application Users

```javascript
// Switch to the application database
use appdb;

// Create an application user with readWrite access
db.createUser({
  user: "appuser",
  pwd: "app-user-password",
  roles: [
    { role: "readWrite", db: "appdb" }
  ]
});
```

## Using the MongoDB Community Operator

For a more automated approach, the MongoDB Community Operator handles replica set initialization, user creation, and scaling:

```bash
# Install the MongoDB Community Operator
helm repo add mongodb https://mongodb.github.io/helm-charts
helm install community-operator mongodb/community-operator \
  --namespace mongodb
```

```yaml
# mongodb-community.yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: mongodb-cluster
  namespace: mongodb
spec:
  members: 3
  type: ReplicaSet
  version: "7.0.0"
  security:
    authentication:
      modes: ["SCRAM"]
  users:
    - name: admin
      db: admin
      passwordSecretRef:
        name: mongodb-admin-password
      roles:
        - name: clusterAdmin
          db: admin
        - name: userAdminAnyDatabase
          db: admin
      scramCredentialsSecretName: admin-scram
  statefulSet:
    spec:
      volumeClaimTemplates:
        - metadata:
            name: data-volume
          spec:
            accessModes:
              - ReadWriteOnce
            storageClassName: local-path
            resources:
              requests:
                storage: 50Gi
```

## Backup and Restore

Set up regular backups using `mongodump`:

```yaml
# mongodb-backup.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-backup
  namespace: mongodb
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: mongo:7.0
              command:
                - /bin/sh
                - -c
                - |
                  mongodump \
                    --uri="mongodb://admin:secure-mongo-password@mongodb-0.mongodb:27017,mongodb-1.mongodb:27017,mongodb-2.mongodb:27017/?replicaSet=rs0&authSource=admin" \
                    --out=/backups/$(date +%Y%m%d)
              volumeMounts:
                - name: backup-volume
                  mountPath: /backups
          restartPolicy: OnFailure
          volumes:
            - name: backup-volume
              persistentVolumeClaim:
                claimName: mongodb-backup-pvc
```

## Performance Tuning Tips

When running MongoDB on Talos Linux, keep these points in mind:

- Use dedicated disks for MongoDB data rather than sharing with the OS
- Ensure your storage class supports fast I/O, especially for write-heavy workloads
- Set appropriate WiredTiger cache sizes based on your pod memory limits
- Monitor connection counts and adjust `maxIncomingConnections` accordingly
- Use pod anti-affinity rules to spread replica set members across different nodes

```yaml
# Add pod anti-affinity to spread replicas across nodes
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
            - key: app
              operator: In
              values:
                - mongodb
        topologyKey: kubernetes.io/hostname
```

## Conclusion

MongoDB runs well on Talos Linux when you plan for the immutable OS constraints upfront. The key takeaways are to use StatefulSets for stable storage and network identities, configure replica sets for high availability, and leverage operators when you want automated day-two operations. The security posture of Talos Linux complements MongoDB's own authentication and encryption capabilities, giving you a solid defense-in-depth approach for your data layer.
