# How to Deploy SeaweedFS for Distributed Object and File Storage on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, SeaweedFS

Description: Deploy SeaweedFS on Kubernetes for S3-compatible object storage and distributed file system capabilities, providing scalable storage for applications with minimal resource overhead.

---

SeaweedFS delivers both object storage through an S3-compatible API and distributed file storage through FUSE mounts, all with lower memory footprint than alternatives like MinIO or Ceph. Its architecture separates metadata management from data storage, enabling efficient handling of billions of files without the memory overhead typical of traditional distributed filesystems.

This guide covers deploying SeaweedFS on Kubernetes with master servers for metadata, volume servers for data storage, filer for file system semantics, and S3 gateway for object storage access. You'll learn topology configuration, replication strategies, and integration patterns for application workloads.

## Understanding SeaweedFS Architecture

SeaweedFS uses a simple yet powerful architecture with three main components: the master server maintains volume metadata and assigns file IDs, volume servers store actual file data in append-only volumes, and the filer provides POSIX file system semantics on top of the key-value storage.

When you write a file, the client asks the master for a file ID and volume location, then writes directly to the assigned volume server. The master tracks which volume servers hold which volumes but never handles data transfers, eliminating the metadata bottleneck common in traditional distributed filesystems.

For object storage, the S3 gateway translates S3 API calls into SeaweedFS operations, storing objects as regular files that the filer manages. This approach provides S3 compatibility without requiring separate object storage infrastructure.

## Deploying Master Servers

Master servers should run with at least three replicas for high availability using Raft consensus.

```yaml
# seaweedfs-master-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: seaweedfs-master
  labels:
    app: seaweedfs-master
spec:
  ports:
  - port: 9333
    name: master-http
  - port: 19333
    name: master-grpc
  clusterIP: None
  selector:
    app: seaweedfs-master
---
# seaweedfs-master-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: seaweedfs-master
spec:
  serviceName: seaweedfs-master
  replicas: 3
  selector:
    matchLabels:
      app: seaweedfs-master
  template:
    metadata:
      labels:
        app: seaweedfs-master
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: seaweedfs-master
            topologyKey: kubernetes.io/hostname
      containers:
      - name: master
        image: chrislusf/seaweedfs:3.60
        command:
        - /bin/sh
        - -c
        - |
          PEERS=""
          for i in 0 1 2; do
            if [ $i -ne ${HOSTNAME##*-} ]; then
              PEERS="${PEERS}seaweedfs-master-${i}.seaweedfs-master:9333,"
            fi
          done
          PEERS=${PEERS%,}

          exec /usr/bin/weed master \
            -ip=$(POD_IP) \
            -port=9333 \
            -peers=${PEERS} \
            -mdir=/data \
            -defaultReplication=001 \
            -volumeSizeLimitMB=1000 \
            -garbageThreshold=0.1
        ports:
        - containerPort: 9333
          name: master-http
        - containerPort: 19333
          name: master-grpc
        env:
        - name: POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        volumeMounts:
        - name: data
          mountPath: /data
        livenessProbe:
          httpGet:
            path: /cluster/status
            port: 9333
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /cluster/status
            port: 9333
          initialDelaySeconds: 10
          periodSeconds: 10
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: standard
      resources:
        requests:
          storage: 10Gi
```

Deploy the master servers and verify cluster formation.

```bash
kubectl apply -f seaweedfs-master-service.yaml
kubectl apply -f seaweedfs-master-statefulset.yaml

# Wait for all masters to be ready
kubectl wait --for=condition=ready pod -l app=seaweedfs-master --timeout=300s

# Check cluster status
kubectl exec seaweedfs-master-0 -- weed shell <<< "cluster.check"
```

## Deploying Volume Servers

Volume servers store actual data and should be deployed on nodes with available disk capacity.

```yaml
# seaweedfs-volume-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: seaweedfs-volume
  labels:
    app: seaweedfs-volume
spec:
  ports:
  - port: 8080
    name: volume-http
  - port: 18080
    name: volume-grpc
  clusterIP: None
  selector:
    app: seaweedfs-volume
---
# seaweedfs-volume-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: seaweedfs-volume
spec:
  serviceName: seaweedfs-volume
  replicas: 3
  selector:
    matchLabels:
      app: seaweedfs-volume
  template:
    metadata:
      labels:
        app: seaweedfs-volume
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: seaweedfs-volume
              topologyKey: kubernetes.io/hostname
      containers:
      - name: volume
        image: chrislusf/seaweedfs:3.60
        command:
        - /bin/sh
        - -c
        - |
          exec /usr/bin/weed volume \
            -ip=$(POD_IP) \
            -port=8080 \
            -metricsPort=9327 \
            -dir=/data \
            -max=100 \
            -mserver=seaweedfs-master-0.seaweedfs-master:9333,seaweedfs-master-1.seaweedfs-master:9333,seaweedfs-master-2.seaweedfs-master:9333 \
            -dataCenter=dc1 \
            -rack=$(RACK) \
            -compactionMBps=50 \
            -readMode=proxy
        ports:
        - containerPort: 8080
          name: volume-http
        - containerPort: 18080
          name: volume-grpc
        - containerPort: 9327
          name: metrics
        env:
        - name: POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        - name: RACK
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        volumeMounts:
        - name: data
          mountPath: /data
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: standard
      resources:
        requests:
          storage: 100Gi
```

Deploy volume servers and verify registration with masters.

```bash
kubectl apply -f seaweedfs-volume-service.yaml
kubectl apply -f seaweedfs-volume-statefulset.yaml

kubectl wait --for=condition=ready pod -l app=seaweedfs-volume --timeout=300s

# Check volume server registration
kubectl exec seaweedfs-master-0 -- weed shell <<< "volume.list"
```

## Deploying Filer for File System Access

The filer provides file system semantics and can use various backends for metadata storage.

```yaml
# seaweedfs-filer-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: seaweedfs-filer
  labels:
    app: seaweedfs-filer
spec:
  ports:
  - port: 8888
    name: filer-http
  - port: 18888
    name: filer-grpc
  selector:
    app: seaweedfs-filer
---
# seaweedfs-filer-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: seaweedfs-filer
spec:
  replicas: 2
  selector:
    matchLabels:
      app: seaweedfs-filer
  template:
    metadata:
      labels:
        app: seaweedfs-filer
    spec:
      containers:
      - name: filer
        image: chrislusf/seaweedfs:3.60
        command:
        - /bin/sh
        - -c
        - |
          exec /usr/bin/weed filer \
            -ip=$(POD_IP) \
            -port=8888 \
            -master=seaweedfs-master-0.seaweedfs-master:9333,seaweedfs-master-1.seaweedfs-master:9333,seaweedfs-master-2.seaweedfs-master:9333 \
            -dataCenter=dc1 \
            -defaultReplicaPlacement=001 \
            -encryptVolumeData=false \
            -metricsPort=9326
        ports:
        - containerPort: 8888
          name: filer-http
        - containerPort: 18888
          name: filer-grpc
        - containerPort: 9326
          name: metrics
        env:
        - name: POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        volumeMounts:
        - name: filer-config
          mountPath: /etc/seaweedfs
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
      volumes:
      - name: filer-config
        configMap:
          name: seaweedfs-filer-config
---
# filer-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: seaweedfs-filer-config
data:
  filer.toml: |
    [leveldb2]
    enabled = true
    dir = "/data/filerldb2"
```

Deploy the filer service.

```bash
kubectl apply -f seaweedfs-filer-service.yaml
kubectl wait --for=condition=ready pod -l app=seaweedfs-filer --timeout=120s

# Test filer access
kubectl exec seaweedfs-filer-$(kubectl get pod -l app=seaweedfs-filer -o jsonpath='{.items[0].metadata.name}' | cut -d'-' -f3) -- curl -s http://localhost:8888/
```

## Deploying S3 Gateway

Enable S3-compatible object storage access through the S3 gateway.

```yaml
# seaweedfs-s3-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: seaweedfs-s3
  labels:
    app: seaweedfs-s3
spec:
  type: LoadBalancer
  ports:
  - port: 8333
    name: s3-http
  selector:
    app: seaweedfs-s3
---
# seaweedfs-s3-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: seaweedfs-s3
spec:
  replicas: 2
  selector:
    matchLabels:
      app: seaweedfs-s3
  template:
    metadata:
      labels:
        app: seaweedfs-s3
    spec:
      containers:
      - name: s3
        image: chrislusf/seaweedfs:3.60
        command:
        - /bin/sh
        - -c
        - |
          exec /usr/bin/weed s3 \
            -port=8333 \
            -filer=seaweedfs-filer:8888 \
            -config=/etc/seaweedfs/s3.json \
            -domainName=s3.example.com \
            -metricsPort=9325
        ports:
        - containerPort: 8333
          name: s3-http
        - containerPort: 9325
          name: metrics
        volumeMounts:
        - name: s3-config
          mountPath: /etc/seaweedfs
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: s3-config
        secret:
          secretName: seaweedfs-s3-secret
```

Create S3 credentials secret.

```yaml
# s3-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: seaweedfs-s3-secret
type: Opaque
stringData:
  s3.json: |
    {
      "identities": [
        {
          "name": "admin",
          "credentials": [
            {
              "accessKey": "admin_access_key",
              "secretKey": "admin_secret_key"
            }
          ],
          "actions": [
            "Admin",
            "Read",
            "Write"
          ]
        }
      ]
    }
```

Deploy the S3 gateway.

```bash
kubectl apply -f s3-secret.yaml
kubectl apply -f seaweedfs-s3-service.yaml
kubectl wait --for=condition=ready pod -l app=seaweedfs-s3 --timeout=120s

# Get S3 endpoint
S3_ENDPOINT=$(kubectl get svc seaweedfs-s3 -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "S3 endpoint: http://${S3_ENDPOINT}:8333"
```

## Testing S3 API Access

Use the AWS CLI to test S3 compatibility.

```bash
# Install AWS CLI
sudo apt-get install -y awscli

# Configure credentials
aws configure set aws_access_key_id admin_access_key
aws configure set aws_secret_access_key admin_secret_key

# Create bucket
aws s3 mb s3://test-bucket --endpoint-url=http://${S3_ENDPOINT}:8333

# Upload file
echo "Hello SeaweedFS" > test.txt
aws s3 cp test.txt s3://test-bucket/ --endpoint-url=http://${S3_ENDPOINT}:8333

# List objects
aws s3 ls s3://test-bucket/ --endpoint-url=http://${S3_ENDPOINT}:8333

# Download file
aws s3 cp s3://test-bucket/test.txt downloaded.txt --endpoint-url=http://${S3_ENDPOINT}:8333
cat downloaded.txt
```

## Mounting SeaweedFS with FUSE

Applications can mount SeaweedFS as a POSIX filesystem using the mount command.

```yaml
# fuse-mount-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: seaweedfs-mount-test
spec:
  containers:
  - name: mount
    image: chrislusf/seaweedfs:3.60
    command: ['sh', '-c']
    args:
    - |
      mkdir -p /mnt/seaweedfs
      weed mount \
        -filer=seaweedfs-filer:8888 \
        -dir=/mnt/seaweedfs \
        -dirAutoCreate
      tail -f /dev/null
    securityContext:
      privileged: true
      capabilities:
        add: ["SYS_ADMIN"]
    volumeMounts:
    - name: fuse
      mountPath: /dev/fuse
  volumes:
  - name: fuse
    hostPath:
      path: /dev/fuse
```

Test FUSE mount functionality.

```bash
kubectl apply -f fuse-mount-pod.yaml
kubectl wait --for=condition=ready pod/seaweedfs-mount-test

# Write files through FUSE mount
kubectl exec seaweedfs-mount-test -- sh -c "echo 'test data' > /mnt/seaweedfs/testfile.txt"

# Read back through FUSE
kubectl exec seaweedfs-mount-test -- cat /mnt/seaweedfs/testfile.txt

# Verify file is accessible via S3
aws s3 ls s3://testfile.txt --endpoint-url=http://${S3_ENDPOINT}:8333
```

## Configuring Replication

SeaweedFS uses replication notation: XYZ where X is datacenter copies, Y is rack copies, and Z is server copies.

```bash
# Common replication strategies:
# 000 - No replication (default for testing)
# 001 - 1 copy on different server in same rack
# 010 - 1 copy on different rack in same datacenter
# 100 - 1 copy in different datacenter
# 200 - 2 copies in different datacenters

# Set default replication when creating volumes
kubectl exec seaweedfs-master-0 -- weed shell <<< "volume.configure.replication -replication=001"

# Check replication status
kubectl exec seaweedfs-master-0 -- weed shell <<< "volume.list"
```

## Monitoring SeaweedFS

SeaweedFS exposes Prometheus metrics on dedicated ports.

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: seaweedfs-master
spec:
  selector:
    matchLabels:
      app: seaweedfs-master
  endpoints:
  - port: metrics
    interval: 30s
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: seaweedfs-volume
spec:
  selector:
    matchLabels:
      app: seaweedfs-volume
  endpoints:
  - port: metrics
    interval: 30s
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: seaweedfs-filer
spec:
  selector:
    matchLabels:
      app: seaweedfs-filer
  endpoints:
  - port: metrics
    interval: 30s
```

Key metrics to monitor include `weed_master_volume_count`, `weed_volume_disk_free_bytes`, and `weed_filer_request_total`.

SeaweedFS provides a lightweight yet powerful storage solution that scales from single-server deployments to multi-datacenter clusters. Its dual nature as both object storage and distributed filesystem makes it versatile for various workload types. By deploying SeaweedFS on Kubernetes with proper replication and monitoring, you gain S3-compatible storage without the operational complexity of alternatives like Ceph or the resource requirements of MinIO.
