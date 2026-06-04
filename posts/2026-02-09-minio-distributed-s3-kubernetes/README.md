# Deploy MinIO Distributed Mode on Kubernetes for S3-Compatible Object Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MinIO, Kubernetes, Storage

Description: Learn how to deploy MinIO in distributed mode on Kubernetes for high-performance, S3-compatible object storage with erasure coding, high availability, and multi-tenancy support.

---

MinIO provides S3-compatible object storage that runs anywhere, making it ideal for Kubernetes environments requiring object storage without cloud provider dependencies. Distributed mode delivers high availability and horizontal scalability through erasure coding across multiple nodes. This guide demonstrates deploying production-ready MinIO clusters on Kubernetes with proper performance tuning and security configuration.

## Understanding MinIO Distributed Architecture

MinIO distributed mode shards objects across multiple servers using erasure coding. Each object splits into data and parity blocks distributed across nodes, providing redundancy without full replication overhead. The system tolerates up to N/2 disk failures (where N is the total number of disks) while maintaining data availability.

The distributed architecture enables horizontal scaling by adding more nodes, and erasure coding provides better storage efficiency than replication. MinIO's high-performance design achieves throughput measured in gigabytes per second, making it suitable for analytics, backups, and data lakes.

## Deploying MinIO with the Operator

Install the MinIO operator for declarative cluster management:

```bash
# Install MinIO operator

kubectl kustomize "github.com/minio/operator?ref=v7.1.1" | kubectl apply -f -

# Create namespace
kubectl create namespace minio

# Verify operator installation
kubectl get pods -n minio-operator
```

Deploy a distributed MinIO cluster:

```yaml
# minio-cluster.yaml
apiVersion: minio.min.io/v2
kind: Tenant
metadata:
  name: minio
  namespace: minio
spec:
  # Distributed configuration: 4 servers, 4 drives each (16 total drives)
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
          storageClassName: fast-ssd

      # Resource allocation per server
      resources:
        requests:
          cpu: 2000m
          memory: 4Gi
        limits:
          cpu: 4000m
          memory: 8Gi

      # Security context
      securityContext:
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        runAsNonRoot: true

      # External URL configuration
      env:
        - name: MINIO_SERVER_URL
          value: "https://minio.example.com"
        - name: MINIO_BROWSER_REDIRECT_URL
          value: "https://console.minio.example.com"

  # Authentication
  users:
    - name: admin-user

  # TLS configuration
  requestAutoCert: true

  # Service account
  serviceAccountName: minio-sa

  # Prometheus Operator integration
  prometheusOperator: true

  # Service labels
  serviceMetadata:
    minioServiceLabels:
      app: minio
    consoleServiceLabels:
      app: minio-console
```

Create the service account and user secret referenced by the Tenant:

```bash
kubectl create serviceaccount minio-sa -n minio

kubectl create secret generic admin-user -n minio \
  --from-literal=CONSOLE_ACCESS_KEY=minioadmin \
  --from-literal=CONSOLE_SECRET_KEY=minioadmin123
```

Deploy the cluster:

```bash
kubectl apply -f minio-cluster.yaml

# Watch cluster initialization
kubectl get pods -n minio -w

# Get admin credentials
kubectl get secret admin-user -n minio \
  -o jsonpath='{.data.CONSOLE_ACCESS_KEY}' | base64 -d

kubectl get secret admin-user -n minio \
  -o jsonpath='{.data.CONSOLE_SECRET_KEY}' | base64 -d
```

## Accessing MinIO S3 API

Connect to MinIO using S3-compatible clients:

```bash
# Port-forward for local access
kubectl port-forward -n minio svc/minio-hl 9000:9000

# Configure AWS CLI
aws configure set aws_access_key_id $(kubectl get secret admin-user -n minio -o jsonpath='{.data.CONSOLE_ACCESS_KEY}' | base64 -d)
aws configure set aws_secret_access_key $(kubectl get secret admin-user -n minio -o jsonpath='{.data.CONSOLE_SECRET_KEY}' | base64 -d)

# Create bucket
aws s3 mb s3://my-bucket --endpoint-url https://localhost:9000 --no-verify-ssl

# Upload file
aws s3 cp myfile.txt s3://my-bucket/ --endpoint-url https://localhost:9000 --no-verify-ssl

# List objects
aws s3 ls s3://my-bucket/ --endpoint-url https://localhost:9000 --no-verify-ssl
```

Use MinIO client (mc):

```bash
# Install mc
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# Configure alias
mc alias set myminio https://localhost:9000 \
  $(kubectl get secret admin-user -n minio -o jsonpath='{.data.CONSOLE_ACCESS_KEY}' | base64 -d) \
  $(kubectl get secret admin-user -n minio -o jsonpath='{.data.CONSOLE_SECRET_KEY}' | base64 -d) \
  --insecure

# Create bucket
mc mb myminio/my-bucket --insecure

# Copy files
mc cp myfile.txt myminio/my-bucket/ --insecure

# Mirror directory
mc mirror ./data/ myminio/my-bucket/data/ --insecure
```

## Configuring Erasure Coding and Data Protection

MinIO automatically configures erasure coding based on node/drive count:

```bash
# Check erasure coding configuration
mc admin info myminio --insecure

# Example output:
# Pools:
#   1st, Erasure sets: 1, Drives per erasure set: 16
# 16 drives online, 0 drives offline, EC:8
# Can tolerate up to 8 drive failures

# Create a versioned bucket for critical data
mc mb myminio/critical-data --with-versioning --insecure

# Enable object locking for immutability
mc mb myminio/audit-logs --with-lock --insecure
```

## Implementing Multi-Tenancy

Create separate users and policies for different applications:

```bash
# Create policy for read-only access
cat > readonly-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ]
    }
  ]
}
EOF

mc admin policy create myminio readonly-policy readonly-policy.json --insecure

# Create user
mc admin user add myminio app-reader password123 --insecure

# Assign policy to user
mc admin policy attach myminio readonly-policy --user app-reader --insecure

# Create Kubernetes secret for application
kubectl create secret generic minio-app-credentials \
  -n default \
  --from-literal=accesskey=app-reader \
  --from-literal=secretkey=password123
```

Use in applications:

```python
# Python example
import boto3

s3_client = boto3.client(
    's3',
    endpoint_url='https://minio-hl.minio.svc.cluster.local:9000',
    aws_access_key_id='app-reader',
    aws_secret_access_key='password123',
    verify=False
)

# List objects
response = s3_client.list_objects_v2(Bucket='my-bucket')
for obj in response.get('Contents', []):
    print(obj['Key'])
```

## Enabling Server-Side Encryption

Configure automatic encryption at rest:

```bash
# Enable server-side encryption with the deployment default KMS key
mc encrypt set sse-s3 myminio/my-bucket --insecure

# Or use KMS for key management
mc encrypt set sse-kms my-key-id myminio/my-bucket --insecure

# Verify encryption
mc encrypt info myminio/my-bucket --insecure
```

## Configuring Bucket Replication

Set up cross-region replication for disaster recovery:

```bash
# Configure remote MinIO cluster
mc alias set minio-backup https://backup.minio.example.com \
  backup-access-key backup-secret-key \
  --insecure

# Enable versioning (required for replication)
mc version enable myminio/my-bucket --insecure
mc version enable minio-backup/my-bucket-backup --insecure

# Configure replication
mc replicate add myminio/my-bucket \
  --remote-bucket https://backup-access-key:backup-secret-key@backup.minio.example.com/my-bucket-backup \
  --priority 1 \
  --replicate "delete,delete-marker" \
  --insecure

# Check replication status
mc replicate status myminio/my-bucket --insecure
```

## Monitoring MinIO Performance

Deploy Prometheus monitoring:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: minio-monitor
  namespace: minio
spec:
  selector:
    matchLabels:
      app: minio
  endpoints:
    - port: https-minio
      path: /minio/metrics/v3/cluster/health
      scheme: https
      tlsConfig:
        insecureSkipVerify: true
      interval: 30s
    - port: https-minio
      path: /minio/metrics/v3/api/requests
      scheme: https
      tlsConfig:
        insecureSkipVerify: true
      interval: 30s
    - port: https-minio
      path: /minio/metrics/v3/cluster/usage/objects
      scheme: https
      tlsConfig:
        insecureSkipVerify: true
      interval: 30s
```

Key metrics to monitor:

```promql
# API request rate
rate(minio_api_requests_total[5m])

# Error rate
rate(minio_api_requests_errors_total[5m]) / rate(minio_api_requests_total[5m])

# Disk usage
minio_cluster_health_capacity_raw_total_bytes - minio_cluster_health_capacity_raw_free_bytes

# Object count
minio_cluster_usage_objects_count

# Network throughput
rate(minio_api_requests_traffic_sent_bytes[5m])
```

## Scaling the Cluster

Add more server pools for capacity:

```yaml
spec:
  pools:
    - servers: 4
      name: pool-0
      # ... existing configuration ...

    # Add new pool
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
              storage: 100Gi
```

MinIO automatically distributes new objects across all pools.

## Implementing Lifecycle Policies

Configure automatic object transitions and expiration:

```bash
# Transition logs after 30 days and expire them after 90 days
# Assumes a remote tier named MINIOTIER-1 already exists
mc ilm rule add myminio/my-bucket \
  --prefix "logs/" \
  --transition-days "30" \
  --transition-tier "MINIOTIER-1" \
  --expire-days "90" \
  --insecure

# Check lifecycle rules
mc ilm rule ls myminio/my-bucket --insecure
```

## Backup and Disaster Recovery

Implement automated backups:

```bash
# Export cluster IAM configuration
mc admin cluster iam export myminio --insecure

# Bucket-level backup
mc mirror --watch myminio/my-bucket /backup/my-bucket/ --insecure

# Or replicate to another MinIO cluster
mc replicate add myminio/my-bucket \
  --remote-bucket minio-backup/my-bucket-copy \
  --priority 1 \
  --insecure
```

## Performance Tuning

Optimize for high-throughput workloads:

```yaml
spec:
  pools:
    - env:
        # Increase API workers
        - name: MINIO_API_REQUESTS_MAX
          value: "10000"

        # Tune erasure coding
        - name: MINIO_STORAGE_CLASS_STANDARD
          value: "EC:4"

        # Connection pooling
        - name: MINIO_API_REQUESTS_DEADLINE
          value: "10s"

      # Allocate more resources
      resources:
        requests:
          cpu: 4000m
          memory: 8Gi
        limits:
          cpu: 8000m
          memory: 16Gi
```

## Conclusion

MinIO distributed mode on Kubernetes provides enterprise-grade object storage with S3 compatibility, eliminating cloud vendor lock-in while maintaining API compatibility. The erasure coding architecture delivers both high availability and storage efficiency, making it cost-effective for large-scale deployments.

The operator-based deployment simplifies cluster management, while native Kubernetes integration provides proper scheduling, scaling, and monitoring. For teams requiring object storage in air-gapped environments, hybrid clouds, or multi-cloud architectures, MinIO offers a compelling alternative to managed cloud storage services with complete control over data and infrastructure.
