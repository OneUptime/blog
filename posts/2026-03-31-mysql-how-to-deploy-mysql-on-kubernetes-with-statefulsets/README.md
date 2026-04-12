# How to Deploy MySQL on Kubernetes with StatefulSets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Kubernetes, StatefulSet, Database, DevOps

Description: Learn how to deploy MySQL on Kubernetes using StatefulSets to ensure stable network identities, persistent storage, and ordered pod management.

---

## Why StatefulSets for MySQL

Running MySQL in Kubernetes requires stable pod identities and persistent storage across restarts. StatefulSets provide exactly that - ordered, unique pod names, stable DNS entries, and persistent volume claims that survive pod rescheduling. Unlike Deployments, StatefulSets guarantee that each MySQL pod always mounts the same storage, which is critical for database correctness.

## Prerequisites

- A running Kubernetes cluster (v1.21+)
- `kubectl` configured with cluster access
- A default StorageClass that supports dynamic provisioning

## Create a Namespace and ConfigMap

Start by creating a dedicated namespace and a ConfigMap for MySQL configuration:

```bash
kubectl create namespace mysql
```

```yaml
# mysql-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-config
  namespace: mysql
data:
  my.cnf: |
    [mysqld]
    innodb_buffer_pool_size = 512M
    max_connections = 200
    slow_query_log = 1
    slow_query_log_file = /var/log/mysql/slow.log
    long_query_time = 2
```

```bash
kubectl apply -f mysql-configmap.yaml
```

## Create a Secret for MySQL Credentials

```yaml
# mysql-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysql-secret
  namespace: mysql
type: Opaque
stringData:
  MYSQL_ROOT_PASSWORD: "S3cur3P@ssw0rd"
  MYSQL_DATABASE: "appdb"
  MYSQL_USER: "appuser"
  MYSQL_PASSWORD: "AppP@ssw0rd"
```

```bash
kubectl apply -f mysql-secret.yaml
```

## Create a Headless Service

StatefulSets require a headless service to manage the DNS entries for each pod:

```yaml
# mysql-headless-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: mysql
  labels:
    app: mysql
spec:
  clusterIP: None
  selector:
    app: mysql
  ports:
    - port: 3306
      targetPort: 3306
```

```bash
kubectl apply -f mysql-headless-service.yaml
```

## Deploy the StatefulSet

```yaml
# mysql-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: mysql
spec:
  serviceName: mysql
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
        - name: mysql
          image: mysql:8.0
          ports:
            - containerPort: 3306
          envFrom:
            - secretRef:
                name: mysql-secret
          volumeMounts:
            - name: mysql-data
              mountPath: /var/lib/mysql
            - name: mysql-config
              mountPath: /etc/mysql/conf.d
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1"
          livenessProbe:
            exec:
              command:
                - mysqladmin
                - ping
                - -h
                - localhost
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - /bin/sh
                - -c
                - mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "SELECT 1"
            initialDelaySeconds: 30
            periodSeconds: 5
      volumes:
        - name: mysql-config
          configMap:
            name: mysql-config
  volumeClaimTemplates:
    - metadata:
        name: mysql-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: standard
        resources:
          requests:
            storage: 20Gi
```

```bash
kubectl apply -f mysql-statefulset.yaml
```

## Create a Client-Facing Service

For application access, create a ClusterIP service:

```yaml
# mysql-client-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql-client
  namespace: mysql
spec:
  selector:
    app: mysql
  ports:
    - port: 3306
      targetPort: 3306
  type: ClusterIP
```

```bash
kubectl apply -f mysql-client-service.yaml
```

## Verify the Deployment

```bash
# Check the StatefulSet
kubectl get statefulset -n mysql

# Check pods
kubectl get pods -n mysql

# Check persistent volumes
kubectl get pvc -n mysql

# Connect to MySQL
kubectl exec -it mysql-0 -n mysql -- mysql -u root -p
```

Expected output:

```text
NAME    READY   AGE
mysql   1/1     2m

NAME      READY   STATUS    RESTARTS   AGE
mysql-0   1/1     Running   0          2m
```

## Pod DNS and Addressing

Each StatefulSet pod gets a stable DNS entry in the format `<pod-name>.<service-name>.<namespace>.svc.cluster.local`. For the setup above:

```text
mysql-0.mysql.mysql.svc.cluster.local
```

This means even if a pod restarts and gets a new IP, applications can still connect using the DNS name - a major advantage over Deployments.

## Summary

Deploying MySQL on Kubernetes with StatefulSets gives you stable pod identities, persistent storage, and ordered lifecycle management. The combination of a headless service for DNS, a client service for application access, and volumeClaimTemplates for persistent storage makes for a production-ready single-instance MySQL deployment on Kubernetes.
