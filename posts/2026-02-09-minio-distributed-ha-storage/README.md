# How to Deploy MinIO in Distributed Mode for High-Availability Object Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MinIO, Object Storage, High Availability

Description: Deploy MinIO object storage in distributed mode on Kubernetes with erasure coding, high availability configuration, multi-tenant access, and S3-compatible API integration.

---

MinIO is a high-performance, S3-compatible object storage system designed for cloud-native applications. Distributed mode provides high availability and data protection through erasure coding, distributing data across multiple drives and nodes. MinIO's simplicity, performance, and complete S3 compatibility make it an excellent choice for self-hosted object storage in Kubernetes environments.

## Distributed Mode Architecture

MinIO distributed mode requires at least 4 drives to enable erasure coding. The system divides objects into data and parity blocks distributed across drives, allowing recovery from drive failures. With 16 drives, MinIO tolerates up to 8 drive failures while maintaining data availability.

For production deployments, use the distributed mode with multiple nodes, each contributing multiple drives. This configuration provides both drive-level and node-level fault tolerance. MinIO automatically handles data distribution, rebalancing, and healing without manual intervention.

## Deploying MinIO with Operator

The MinIO Operator simplifies deployment and management with Kubernetes custom resources.

```bash
# Install MinIO Operator
kubectl apply -f https://github.com/minio/operator/releases/latest/download/operator.yaml

# Verify operator installation
kubectl get pods -n minio-operator
```

Create a MinIO tenant (cluster):

```yaml
# minio-tenant.yaml
apiVersion: minio.min.io/v2
kind: Tenant
metadata:
  name: minio
  namespace: minio-tenant
spec:
  image: quay.io/minio/minio:RELEASE.2024-01-31T20-20-33Z
  pools:
  - servers: 4
    name: pool-0
    volumesPerServer: 4
    volumeClaimTemplate:
      metadata:
        name: data
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 100Gi
        storageClassName: standard
    resources:
      requests:
        memory: 2Gi
        cpu: 1000m
      limits:
        memory: 4Gi
        cpu: 2000m
  mountPath: /export
  requestAutoCert: false
  console:
    image: quay.io/minio/console:v0.31.0
    replicas: 2
    consoleSecret:
      name: console-secret
  env:
  - name: MINIO_BROWSER
    value: "on"
  - name: MINIO_PROMETHEUS_AUTH_TYPE
    value: "public"
```

Create namespace and deploy:

```bash
kubectl create namespace minio-tenant

# Create console credentials secret
kubectl create secret generic console-secret \
  --from-literal=CONSOLE_ACCESS_KEY=admin \
  --from-literal=CONSOLE_SECRET_KEY=admin123 \
  -n minio-tenant

# Deploy tenant
kubectl apply -f minio-tenant.yaml

# Watch pods start (takes a few minutes)
kubectl get pods -n minio-tenant -w
```

## Manual StatefulSet Deployment

For environments without the operator, deploy using StatefulSets.

```yaml
# minio-statefulset.yaml
apiVersion: v1
kind: Service
metadata:
  name: minio
  namespace: minio
spec:
  clusterIP: None
  ports:
  - port: 9000
    name: api
  - port: 9001
    name: console
  selector:
    app: minio
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: minio
  namespace: minio
spec:
  serviceName: minio
  replicas: 4
  selector:
    matchLabels:
      app: minio
  template:
    metadata:
      labels:
        app: minio
    spec:
      containers:
      - name: minio
        image: quay.io/minio/minio:RELEASE.2024-01-31T20-20-33Z
        args:
        - server
        - http://minio-{0...3}.minio.minio.svc.cluster.local/data{1...4}
        - --console-address
        - ":9001"
        env:
        - name: MINIO_ROOT_USER
          value: minioadmin
        - name: MINIO_ROOT_PASSWORD
          value: minioadmin123
        ports:
        - containerPort: 9000
          name: api
        - containerPort: 9001
          name: console
        volumeMounts:
        - name: data-0
          mountPath: /data1
        - name: data-1
          mountPath: /data2
        - name: data-2
          mountPath: /data3
        - name: data-3
          mountPath: /data4
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
  volumeClaimTemplates:
  - metadata:
      name: data-0
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: standard
      resources:
        requests:
          storage: 100Gi
  - metadata:
      name: data-1
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: standard
      resources:
        requests:
          storage: 100Gi
  - metadata:
      name: data-2
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: standard
      resources:
        requests:
          storage: 100Gi
  - metadata:
      name: data-3
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: standard
      resources:
        requests:
          storage: 100Gi
```

This creates 4 MinIO instances, each with 4 drives, totaling 16 drives for distributed erasure coding.

## Accessing MinIO

Expose MinIO services for external access.

```yaml
# minio-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: minio-api
  namespace: minio-tenant
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "0"
spec:
  tls:
  - hosts:
    - minio.example.com
    secretName: minio-tls
  rules:
  - host: minio.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: minio
            port:
              number: 9000
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: minio-console
  namespace: minio-tenant
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - console.minio.example.com
    secretName: minio-console-tls
  rules:
  - host: console.minio.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: minio-tenant-console
            port:
              number: 9090
```

## Creating Buckets and Users

Use MinIO Client (mc) to manage buckets and users.

```bash
# Install mc client
kubectl run mc --image=minio/mc --command -- sleep infinity

# Configure alias
kubectl exec mc -- mc alias set myminio \
  https://minio.example.com \
  minioadmin \
  minioadmin123

# Create bucket
kubectl exec mc -- mc mb myminio/app-data

# Create user
kubectl exec mc -- mc admin user add myminio newuser secretpassword123

# Create policy
cat > app-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject"],
    "Resource": ["arn:aws:s3:::app-data/*"]
  }]
}
EOF

kubectl cp app-policy.json mc:/tmp/app-policy.json
kubectl exec mc -- mc admin policy create myminio app-policy /tmp/app-policy.json
kubectl exec mc -- mc admin policy attach myminio app-policy --user newuser
```

## Application Integration

Integrate MinIO with applications using S3 SDKs.

```python
# Python application example
from minio import Minio
from minio.error import S3Error

client = Minio(
    "minio.example.com",
    access_key="newuser",
    secret_key="secretpassword123",
    secure=True
)

# Upload file
try:
    client.fput_object(
        "app-data",
        "uploads/image.jpg",
        "/local/path/image.jpg"
    )
    print("File uploaded successfully")
except S3Error as err:
    print(f"Error: {err}")

# Download file
try:
    client.fget_object(
        "app-data",
        "uploads/image.jpg",
        "/local/path/downloaded.jpg"
    )
    print("File downloaded successfully")
except S3Error as err:
    print(f"Error: {err}")
```

## Monitoring MinIO

MinIO exposes Prometheus metrics for monitoring.

```yaml
# ServiceMonitor for Prometheus
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: minio
  namespace: minio-tenant
spec:
  selector:
    matchLabels:
      app: minio
  endpoints:
  - port: api
    path: /minio/v2/metrics/cluster
    interval: 30s
```

Key metrics to monitor:

```promql
# Total storage used
minio_cluster_capacity_usable_total_bytes - minio_cluster_capacity_usable_free_bytes

# Request rate
rate(minio_s3_requests_total[5m])

# Error rate
rate(minio_s3_errors_total[5m])

# Drive health
minio_cluster_drive_online_total
minio_cluster_drive_offline_total
```

## Backup and Disaster Recovery

Configure bucket replication for disaster recovery.

```bash
# Configure remote alias for second cluster
kubectl exec mc -- mc alias set remote \
  https://minio-dr.example.com \
  minioadmin \
  remoteminiopassword

# Enable versioning
kubectl exec mc -- mc version enable myminio/app-data
kubectl exec mc -- mc version enable remote/app-data

# Configure replication
kubectl exec mc -- mc replicate add myminio/app-data \
  --remote-bucket remote/app-data \
  --replicate "delete,delete-marker,existing-objects"
```

## Scaling the Cluster

Add more storage pools to expand capacity.

```yaml
apiVersion: minio.min.io/v2
kind: Tenant
metadata:
  name: minio
  namespace: minio-tenant
spec:
  pools:
  - servers: 4
    name: pool-0
    volumesPerServer: 4
    # ... existing config ...
  - servers: 4
    name: pool-1
    volumesPerServer: 4
    volumeClaimTemplate:
      metadata:
        name: data
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 200Gi
        storageClassName: fast-ssd
```

MinIO automatically balances data across pools.

## Performance Tuning

Optimize MinIO for high throughput.

```yaml
env:
- name: MINIO_API_REQUESTS_MAX
  value: "10000"
- name: MINIO_API_REQUESTS_DEADLINE
  value: "10s"
resources:
  requests:
    memory: "8Gi"
    cpu: "4000m"
  limits:
    memory: "16Gi"
    cpu: "8000m"
```

## Conclusion

MinIO distributed mode provides enterprise-grade object storage with high availability, data protection through erasure coding, and complete S3 compatibility. The MinIO Operator simplifies deployment and management on Kubernetes, while the distributed architecture ensures fault tolerance at both drive and node levels. With built-in monitoring, replication capabilities, and excellent performance, MinIO serves as a robust self-hosted alternative to cloud object storage services.
