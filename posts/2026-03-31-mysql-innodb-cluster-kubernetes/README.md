# How to Set Up MySQL InnoDB Cluster on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Kubernetes, InnoDB, Cluster, HighAvailability

Description: Set up a MySQL InnoDB Cluster on Kubernetes using StatefulSets and MySQL Router to achieve high availability with automatic failover and read scaling.

---

MySQL InnoDB Cluster combines Group Replication, MySQL Shell, and MySQL Router into a single high-availability solution. Running it on Kubernetes provides automatic pod scheduling, self-healing, and storage management alongside InnoDB Cluster's built-in failover.

## Architecture Overview

A typical InnoDB Cluster on Kubernetes consists of:
- A StatefulSet with three MySQL pods (one primary, two secondaries)
- A headless Service for stable pod DNS names
- A ClusterIP Service for write traffic routed through MySQL Router
- A Secret for credentials

## Setting Up the Namespace and Secret

```bash
kubectl create namespace mysql-cluster
kubectl create secret generic mysql-credentials \
  --namespace mysql-cluster \
  --from-literal=rootPassword=RootPass123! \
  --from-literal=clusterAdminPassword=ClusterPass123!
```

## Deploying MySQL Pods with StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: mysql-cluster
spec:
  serviceName: mysql-headless
  replicas: 3
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      initContainers:
      - name: init-mysql
        image: mysql:8.0
        command:
        - bash
        - "-c"
        - |
          set -ex
          # Assign server-id based on pod ordinal
          [[ $HOSTNAME =~ -([0-9]+)$ ]] || exit 1
          ordinal=${BASH_REMATCH[1]}
          echo "[mysqld]" > /etc/mysql/conf.d/server-id.cnf
          echo "server-id=$((100 + $ordinal))" >> /etc/mysql/conf.d/server-id.cnf
        volumeMounts:
        - name: conf
          mountPath: /etc/mysql/conf.d
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-credentials
              key: rootPassword
        ports:
        - containerPort: 3306
        - containerPort: 33060
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
        - name: conf
          mountPath: /etc/mysql/conf.d
      volumes:
      - name: conf
        emptyDir: {}
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 20Gi
```

## Headless Service for Pod DNS

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql-headless
  namespace: mysql-cluster
spec:
  clusterIP: None
  selector:
    app: mysql
  ports:
  - name: mysql
    port: 3306
  - name: mysqlx
    port: 33060
```

## Bootstrapping the InnoDB Cluster

After pods are running, install MySQL Shell and use it to create the cluster from the primary pod. The `mysql:8.0` image does not include MySQL Shell by default, so install it first:

```bash
kubectl exec -it mysql-0 -n mysql-cluster -- bash -c "microdnf install -y mysql-shell"
```

Then connect with MySQL Shell:

```bash
kubectl exec -it mysql-0 -n mysql-cluster -- mysqlsh --uri root@localhost --password=RootPass123!
```

Inside MySQL Shell:

```javascript
var cluster = dba.createCluster('myCluster', {
  multiPrimary: false,
  force: true
});

cluster.addInstance('root@mysql-1.mysql-headless.mysql-cluster.svc.cluster.local:3306', {
  password: 'RootPass123!',
  recoveryMethod: 'clone'
});

cluster.addInstance('root@mysql-2.mysql-headless.mysql-cluster.svc.cluster.local:3306', {
  password: 'RootPass123!',
  recoveryMethod: 'clone'
});

cluster.status();
```

## Deploying MySQL Router

MySQL Router handles connection routing to the primary or secondary members:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql-router
  namespace: mysql-cluster
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mysql-router
  template:
    metadata:
      labels:
        app: mysql-router
    spec:
      containers:
      - name: router
        image: mysql/mysql-router:8.0
        env:
        - name: MYSQL_HOST
          value: mysql-0.mysql-headless.mysql-cluster.svc.cluster.local
        - name: MYSQL_PORT
          value: "3306"
        - name: MYSQL_USER
          value: root
        - name: MYSQL_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-credentials
              key: rootPassword
        - name: MYSQL_INNODB_CLUSTER_MEMBERS
          value: "3"
        ports:
        - containerPort: 6446
        - containerPort: 6447
```

## Summary

Setting up MySQL InnoDB Cluster on Kubernetes requires StatefulSets for stable pod identity, a headless service for pod DNS resolution, and MySQL Shell for cluster bootstrapping. MySQL Router provides transparent connection routing to the primary for writes and secondaries for reads. Once configured, the cluster provides automatic failover with no application changes required, as MySQL Router handles rerouting connections when a new primary is elected.
