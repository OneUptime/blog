# How to Deploy YugabyteDB with Multi-Zone Placement on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, YugabyteDB, Database, Multi-Zone, High Availability

Description: Deploy YugabyteDB across multiple availability zones on Kubernetes for high availability and fault tolerance, including zone-aware placement policies, replication configuration, and disaster recovery strategies.

---

YugabyteDB provides distributed SQL with automatic sharding and replication across multiple availability zones. Multi-zone deployment ensures database availability even when an entire zone fails, making it ideal for mission-critical applications on Kubernetes.

## Understanding YugabyteDB Architecture

YugabyteDB consists of two layers. The YQL layer handles query processing and provides PostgreSQL-compatible SQL. The DocDB layer manages distributed storage with automatic replication and sharding.

Each YugabyteDB cluster has master servers that handle metadata and tablet servers that store actual data. Masters form a Raft consensus group for fault tolerance. Tablet servers host tablets, which are shards of your tables replicated across zones.

The replication factor determines how many copies of each tablet exist. A replication factor of 3 with zone placement ensures one copy in each zone. If a zone fails, the remaining zones continue serving requests without data loss.

## Preparing Multi-Zone Kubernetes Cluster

Your Kubernetes cluster needs nodes in at least three availability zones. Verify zone distribution:

```bash
kubectl get nodes -o custom-columns=NAME:.metadata.name,ZONE:.metadata.labels.topology\\.kubernetes\\.io/zone
```

Ensure nodes are labeled correctly with zone information. These labels enable zone-aware pod scheduling.

Label nodes for YugabyteDB workloads if needed:

```bash
kubectl label nodes node-1 node-2 node-3 workload=database
```

## Creating YugabyteDB Namespace and Storage Classes

Create a dedicated namespace:

```bash
kubectl create namespace yugabyte
```

Define zone-specific storage classes for optimal performance:

```yaml
# yugabyte-storage-classes.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: yugabyte-ssd
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
  name: yugabyte-high-iops
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
kubectl apply -f yugabyte-storage-classes.yaml
```

## Deploying YugabyteDB Masters with Zone Awareness

Create the master StatefulSet with zone anti-affinity:

```yaml
# yugabyte-master.yaml
apiVersion: v1
kind: Service
metadata:
  name: yb-masters
  namespace: yugabyte
  labels:
    app: yb-master
spec:
  clusterIP: None
  ports:
    - name: ui
      port: 7000
    - name: rpc-port
      port: 7100
  selector:
    app: yb-master
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: yb-master
  namespace: yugabyte
  labels:
    app: yb-master
spec:
  serviceName: yb-masters
  replicas: 3
  podManagementPolicy: Parallel
  selector:
    matchLabels:
      app: yb-master
  template:
    metadata:
      labels:
        app: yb-master
    spec:
      affinity:
        # Spread masters across zones
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - yb-master
              topologyKey: topology.kubernetes.io/zone
        # Prefer nodes labeled for database workload
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: workload
                    operator: In
                    values:
                      - database
      containers:
        - name: yb-master
          image: yugabytedb/yugabyte:2.19.3.0-b140
          imagePullPolicy: IfNotPresent
          env:
            - name: POD_IP
              valueFrom:
                fieldRef:
                  fieldPath: status.podIP
            - name: HOSTNAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
          command:
            - /home/yugabyte/bin/yb-master
            - --fs_data_dirs=/mnt/data0
            - --rpc_bind_addresses=$(POD_IP)
            - --master_addresses=yb-master-0.yb-masters.$(NAMESPACE).svc.cluster.local:7100,yb-master-1.yb-masters.$(NAMESPACE).svc.cluster.local:7100,yb-master-2.yb-masters.$(NAMESPACE).svc.cluster.local:7100
            - --replication_factor=3
            - --enable_ysql=true
            - --master_webserver_port=7000
          ports:
            - containerPort: 7000
              name: ui
            - containerPort: 7100
              name: rpc-port
          volumeMounts:
            - name: datadir
              mountPath: /mnt/data0
          resources:
            requests:
              memory: "2Gi"
              cpu: "500m"
            limits:
              memory: "4Gi"
              cpu: "2000m"
          livenessProbe:
            httpGet:
              path: /api/v1/health
              port: 7000
            initialDelaySeconds: 60
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /api/v1/is-leader
              port: 7000
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3
  volumeClaimTemplates:
    - metadata:
        name: datadir
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: yugabyte-ssd
        resources:
          requests:
            storage: 50Gi
```

Deploy the masters:

```bash
kubectl apply -f yugabyte-master.yaml
```

Wait for all masters to be ready:

```bash
kubectl wait --for=condition=ready pod -l app=yb-master -n yugabyte --timeout=300s
```

## Deploying YugabyteDB Tablet Servers with Zone Distribution

Create the tablet server StatefulSet:

```yaml
# yugabyte-tserver.yaml
apiVersion: v1
kind: Service
metadata:
  name: yb-tservers
  namespace: yugabyte
  labels:
    app: yb-tserver
spec:
  clusterIP: None
  ports:
    - name: ui
      port: 9000
    - name: rpc-port
      port: 9100
    - name: cassandra
      port: 9042
    - name: redis
      port: 6379
    - name: postgres
      port: 5433
  selector:
    app: yb-tserver
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: yb-tserver
  namespace: yugabyte
  labels:
    app: yb-tserver
spec:
  serviceName: yb-tservers
  replicas: 3
  podManagementPolicy: Parallel
  selector:
    matchLabels:
      app: yb-tserver
  template:
    metadata:
      labels:
        app: yb-tserver
    spec:
      affinity:
        # Spread tservers across zones
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - yb-tserver
              topologyKey: topology.kubernetes.io/zone
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: workload
                    operator: In
                    values:
                      - database
      containers:
        - name: yb-tserver
          image: yugabytedb/yugabyte:2.19.3.0-b140
          imagePullPolicy: IfNotPresent
          env:
            - name: POD_IP
              valueFrom:
                fieldRef:
                  fieldPath: status.podIP
            - name: HOSTNAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
          command:
            - /home/yugabyte/bin/yb-tserver
            - --fs_data_dirs=/mnt/data0
            - --rpc_bind_addresses=$(POD_IP)
            - --tserver_master_addrs=yb-master-0.yb-masters.$(NAMESPACE).svc.cluster.local:7100,yb-master-1.yb-masters.$(NAMESPACE).svc.cluster.local:7100,yb-master-2.yb-masters.$(NAMESPACE).svc.cluster.local:7100
            - --start_pgsql_proxy
            - --pgsql_proxy_bind_address=$(POD_IP):5433
            - --tserver_webserver_port=9000
            - --webserver_interface=$(POD_IP)
            - --use_cassandra_authentication=false
          ports:
            - containerPort: 9000
              name: ui
            - containerPort: 9100
              name: rpc-port
            - containerPort: 9042
              name: cassandra
            - containerPort: 6379
              name: redis
            - containerPort: 5433
              name: postgres
          volumeMounts:
            - name: datadir
              mountPath: /mnt/data0
          resources:
            requests:
              memory: "4Gi"
              cpu: "1000m"
            limits:
              memory: "8Gi"
              cpu: "4000m"
          livenessProbe:
            httpGet:
              path: /api/v1/health
              port: 9000
            initialDelaySeconds: 60
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /api/v1/is-server-ready
              port: 9000
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3
  volumeClaimTemplates:
    - metadata:
        name: datadir
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: yugabyte-ssd
        resources:
          requests:
            storage: 200Gi
```

Deploy the tablet servers:

```bash
kubectl apply -f yugabyte-tserver.yaml
```

## Configuring Zone-Aware Placement Policies

Access the YugabyteDB admin interface to configure placement:

```bash
kubectl port-forward -n yugabyte svc/yb-masters 7000:7000
```

Visit http://localhost:7000 in your browser to access the UI.

Configure placement policy via command line:

```bash
# Get a shell in a master pod
kubectl exec -it yb-master-0 -n yugabyte -- bash

# Configure preferred zones
/home/yugabyte/bin/yb-admin \
  --master_addresses yb-master-0.yb-masters.yugabyte.svc.cluster.local:7100 \
  modify_placement_info \
  aws.us-east-1a,aws.us-east-1b,aws.us-east-1c 3
```

This ensures YugabyteDB maintains one replica in each zone.

## Creating Service for Client Access

Expose YugabyteDB to applications:

```yaml
# yugabyte-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: yb-tserver-service
  namespace: yugabyte
  labels:
    app: yb-tserver
spec:
  type: ClusterIP
  ports:
    - name: postgres
      port: 5433
      targetPort: 5433
    - name: cassandra
      port: 9042
      targetPort: 9042
  selector:
    app: yb-tserver
```

Apply the service:

```bash
kubectl apply -f yugabyte-service.yaml
```

Applications connect to `yb-tserver-service.yugabyte.svc.cluster.local:5433` for SQL access.

## Testing Zone Failure Scenarios

Verify multi-zone resilience by simulating a zone failure:

```bash
# Identify which zone a pod is in
kubectl get pod yb-tserver-0 -n yugabyte \
  -o jsonpath='{.spec.nodeName}' | \
  xargs kubectl get node -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}'

# Cordon all nodes in one zone
kubectl cordon $(kubectl get nodes -l topology.kubernetes.io/zone=us-east-1a -o name)

# Delete pods in that zone
kubectl delete pod -l app=yb-tserver -n yugabyte \
  --field-selector spec.nodeName=$(kubectl get nodes -l topology.kubernetes.io/zone=us-east-1a -o name | head -1)

# Verify cluster health
kubectl exec -it yb-tserver-1 -n yugabyte -- \
  /home/yugabyte/bin/yb-admin --master_addresses yb-master-0.yb-masters.yugabyte.svc.cluster.local:7100 \
  get_universe_config
```

The cluster should continue operating with reduced capacity but no data loss.

## Monitoring Multi-Zone Performance

Check replication lag across zones:

```bash
kubectl exec -it yb-master-0 -n yugabyte -- \
  curl -s http://localhost:7000/api/v1/health-check | jq .
```

Monitor tablet distribution:

```bash
kubectl exec -it yb-master-0 -n yugabyte -- \
  /home/yugabyte/bin/yb-admin --master_addresses yb-master-0.yb-masters.yugabyte.svc.cluster.local:7100 \
  list_all_tablet_servers
```

## Implementing Backup Strategy

Create a CronJob for regular backups:

```yaml
# yugabyte-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: yugabyte-backup
  namespace: yugabyte
spec:
  schedule: "0 1 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: yugabytedb/yugabyte:2.19.3.0-b140
              command:
                - sh
                - -c
                - |
                  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
                  /home/yugabyte/bin/ysqlsh -h yb-tserver-service -p 5433 \
                    -c "\l" -U yugabyte | \
                    grep -v template | grep -v "^-" | grep -v "^(" | \
                    awk '{print $1}' | \
                    grep -v "^$" | \
                    while read db; do
                      echo "Backing up $db"
                      /home/yugabyte/bin/ysql_dump -h yb-tserver-service -p 5433 \
                        -U yugabyte -d $db | \
                        gzip > /backups/$db-$TIMESTAMP.sql.gz
                    done
              volumeMounts:
                - name: backup-storage
                  mountPath: /backups
          volumes:
            - name: backup-storage
              persistentVolumeClaim:
                claimName: backup-pvc
```

Multi-zone YugabyteDB deployment on Kubernetes provides true high availability with automatic failover and no single point of failure. The combination of zone-aware placement and StatefulSet affinity rules ensures your database survives infrastructure failures while maintaining consistent performance.
