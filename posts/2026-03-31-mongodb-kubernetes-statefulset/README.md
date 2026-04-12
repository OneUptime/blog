# How to Deploy MongoDB on Kubernetes with a StatefulSet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Kubernetes, StatefulSet, Operation, Infrastructure

Description: Learn how to deploy MongoDB on Kubernetes using a StatefulSet, including persistent volumes, headless services, replica set initialization, and secret management.

---

## Why MongoDB Needs a StatefulSet

Unlike stateless applications, MongoDB requires stable network identities and persistent storage. Kubernetes StatefulSets provide:

- Stable, unique pod names (`mongodb-0`, `mongodb-1`, `mongodb-2`)
- Stable DNS hostnames per pod via a headless service
- Ordered startup and graceful termination
- Persistent volume claims that survive pod restarts and reschedules

```mermaid
flowchart TD
    SVC[Headless Service: mongodb-svc] --> P0[Pod: mongodb-0]
    SVC --> P1[Pod: mongodb-1]
    SVC --> P2[Pod: mongodb-2]
    P0 --> PVC0[PVC: mongodb-data-mongodb-0]
    P1 --> PVC1[PVC: mongodb-data-mongodb-1]
    P2 --> PVC2[PVC: mongodb-data-mongodb-2]
    P0 -->|Primary| RS[Replica Set rs0]
    P1 -->|Secondary| RS
    P2 -->|Secondary| RS
```

## Namespace and Secret

Create a dedicated namespace and a secret for MongoDB credentials.

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mongodb
```

```bash
kubectl apply -f namespace.yaml
```

Create the secret with a strong password:

```bash
kubectl create secret generic mongodb-secret \
  --namespace mongodb \
  --from-literal=MONGO_INITDB_ROOT_USERNAME=admin \
  --from-literal=MONGO_INITDB_ROOT_PASSWORD=SuperSecretPassword123
```

## Headless Service

A headless Service (clusterIP: None) gives each pod a stable DNS entry.

```yaml
# headless-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb-svc
  namespace: mongodb
  labels:
    app: mongodb
spec:
  clusterIP: None
  selector:
    app: mongodb
  ports:
    - port: 27017
      targetPort: 27017
      name: mongodb
```

A second Service exposes the primary for reads and writes from the application:

```yaml
# client-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb-client
  namespace: mongodb
spec:
  selector:
    app: mongodb
  ports:
    - port: 27017
      targetPort: 27017
  type: ClusterIP
```

## StorageClass

Ensure a StorageClass is available. On most cloud providers the default StorageClass uses SSDs. Check:

```bash
kubectl get storageclass
```

## StatefulSet Manifest

```yaml
# statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: mongodb
spec:
  serviceName: mongodb-svc
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
          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              valueFrom:
                secretKeyRef:
                  name: mongodb-secret
                  key: MONGO_INITDB_ROOT_USERNAME
            - name: MONGO_INITDB_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mongodb-secret
                  key: MONGO_INITDB_ROOT_PASSWORD
          args:
            - "--replSet"
            - "rs0"
            - "--bind_ip_all"
          volumeMounts:
            - name: mongodb-data
              mountPath: /data/db
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2"
              memory: "4Gi"
          readinessProbe:
            exec:
              command:
                - mongosh
                - "--eval"
                - "db.adminCommand('ping')"
            initialDelaySeconds: 15
            periodSeconds: 10
          livenessProbe:
            exec:
              command:
                - mongosh
                - "--eval"
                - "db.adminCommand('ping')"
            initialDelaySeconds: 30
            periodSeconds: 20
  volumeClaimTemplates:
    - metadata:
        name: mongodb-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: "standard"
        resources:
          requests:
            storage: 20Gi
```

Apply the manifests:

```bash
kubectl apply -f headless-service.yaml
kubectl apply -f client-service.yaml
kubectl apply -f statefulset.yaml
```

## Initializing the Replica Set

After all three pods are running, initialize the replica set from `mongodb-0`:

```bash
kubectl exec -it mongodb-0 -n mongodb -- mongosh \
  -u admin -p SuperSecretPassword123 --authenticationDatabase admin
```

Inside mongosh:

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongodb-0.mongodb-svc.mongodb.svc.cluster.local:27017" },
    { _id: 1, host: "mongodb-1.mongodb-svc.mongodb.svc.cluster.local:27017" },
    { _id: 2, host: "mongodb-2.mongodb-svc.mongodb.svc.cluster.local:27017" }
  ]
})
```

Check replica set status:

```javascript
rs.status()
```

## Connecting from an Application Pod

Use a replica set connection string from within the cluster:

```text
mongodb://admin:SuperSecretPassword123@mongodb-0.mongodb-svc.mongodb.svc.cluster.local:27017,mongodb-1.mongodb-svc.mongodb.svc.cluster.local:27017,mongodb-2.mongodb-svc.mongodb.svc.cluster.local:27017/?replicaSet=rs0&authSource=admin
```

Or use the client service for simple access (driver handles primary selection):

```text
mongodb://admin:SuperSecretPassword123@mongodb-client.mongodb.svc.cluster.local:27017/?authSource=admin
```

## Scaling the StatefulSet

Add a fourth replica:

```bash
kubectl scale statefulset mongodb -n mongodb --replicas=4
```

New pod `mongodb-3` starts and joins the replica set. You still need to add it manually:

```javascript
rs.add("mongodb-3.mongodb-svc.mongodb.svc.cluster.local:27017")
```

## Checking Pod Status

```bash
kubectl get pods -n mongodb -w
kubectl describe pod mongodb-0 -n mongodb
kubectl logs mongodb-0 -n mongodb -f
```

## Best Practices

- Use a dedicated namespace for MongoDB to isolate it from other workloads.
- Set resource `requests` and `limits` to prevent MongoDB from starving other pods.
- Use a fast StorageClass (SSD-backed) for MongoDB PVCs - avoid spinning disk in production.
- Set `terminationGracePeriodSeconds` to at least 30 seconds so MongoDB can flush writes on shutdown.
- Use readiness and liveness probes to prevent traffic from reaching a pod that is not ready.
- Back up MongoDB regularly with a CronJob that runs `mongodump`.
- Consider the MongoDB Community Kubernetes Operator for production deployments that require automated failover configuration and backup management.

## Summary

Deploying MongoDB on Kubernetes with a StatefulSet requires a headless Service for stable DNS, a StatefulSet with `volumeClaimTemplates` for persistent storage, and manual replica set initialization. Each pod gets a stable identity (`mongodb-0`, `mongodb-1`, `mongodb-2`) that is used in the replica set member addresses. For production workloads, the MongoDB Community Kubernetes Operator simplifies lifecycle management significantly.
