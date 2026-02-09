# How to Configure Rook-Ceph Object Store for S3-Compatible Storage in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Ceph

Description: Learn how to set up a Rook-Ceph object store in Kubernetes to provide S3-compatible storage for applications requiring object storage APIs.

---

Object storage provides a scalable alternative to traditional block and file storage. With Rook-Ceph, you can deploy S3-compatible object storage directly in your Kubernetes cluster, giving applications access to bucket-based storage without external dependencies on cloud providers.

## Understanding Rook-Ceph Object Storage

Rook automates Ceph deployment and management in Kubernetes. The Ceph Object Gateway (RGW) implements S3 and Swift APIs on top of Ceph's distributed object storage. This combination gives you self-hosted object storage that works with any S3-compatible application.

Applications interact with the object store using standard S3 SDKs and tools. Behind the scenes, RGW translates S3 API calls into Ceph RADOS operations, storing object data across the cluster's OSDs. This architecture provides high availability, data redundancy, and horizontal scalability.

## Prerequisites

You need a Kubernetes cluster with Rook operator already deployed and a functional Ceph cluster managed by Rook. Verify your setup:

```bash
# Check Rook operator
kubectl get pods -n rook-ceph -l app=rook-ceph-operator

# Verify Ceph cluster status
kubectl get cephcluster -n rook-ceph

# Check Ceph health
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph status
```

## Creating an Object Store

Define a CephObjectStore resource to deploy RGW:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  # Number of RGW instances
  gateway:
    type: s3
    port: 80
    instances: 2
    placement:
      podAntiAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - rook-ceph-rgw
            topologyKey: kubernetes.io/hostname
    resources:
      requests:
        cpu: "500m"
        memory: "1Gi"
      limits:
        cpu: "1000m"
        memory: "2Gi"

  # Metadata pool configuration
  metadataPool:
    failureDomain: host
    replicated:
      size: 3
    parameters:
      compression_mode: aggressive

  # Data pool configuration
  dataPool:
    failureDomain: host
    replicated:
      size: 3
    parameters:
      compression_mode: aggressive

  # Enable deletion lifecycle policies
  preservePoolsOnDelete: false
```

Apply the configuration:

```bash
kubectl apply -f object-store.yaml

# Watch RGW pods come up
kubectl get pods -n rook-ceph -l app=rook-ceph-rgw -w
```

The gateway section creates RGW pods that serve S3 API requests. The metadataPool stores bucket metadata and indexes. The dataPool stores actual object data.

## Exposing the Object Store

Create a Service and Ingress to access the object store:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rook-ceph-rgw-my-store
  namespace: rook-ceph
  labels:
    app: rook-ceph-rgw
    rook_object_store: my-store
spec:
  ports:
  - name: http
    port: 80
    targetPort: 80
  selector:
    app: rook-ceph-rgw
    rook_object_store: my-store
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rook-ceph-rgw-my-store
  namespace: rook-ceph
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "0"
    nginx.ingress.kubernetes.io/proxy-request-buffering: "off"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - s3.example.com
    secretName: s3-tls
  rules:
  - host: s3.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rook-ceph-rgw-my-store
            port:
              number: 80
```

## Creating Object Store Users

Create a user with S3 credentials:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStoreUser
metadata:
  name: app-user
  namespace: rook-ceph
spec:
  store: my-store
  displayName: "Application User"
  capabilities:
    user: "*"
    bucket: "*"
```

Apply and retrieve credentials:

```bash
kubectl apply -f object-store-user.yaml

# Get access key and secret key
kubectl get secret -n rook-ceph rook-ceph-object-user-my-store-app-user -o jsonpath='{.data.AccessKey}' | base64 -d
kubectl get secret -n rook-ceph rook-ceph-object-user-my-store-app-user -o jsonpath='{.data.SecretKey}' | base64 -d
```

These credentials work with any S3 client or SDK.

## Using the Object Store with AWS CLI

Configure the AWS CLI to use your Rook-Ceph object store:

```bash
# Install AWS CLI
pip install awscli

# Configure credentials
aws configure set aws_access_key_id YOUR_ACCESS_KEY
aws configure set aws_secret_access_key YOUR_SECRET_KEY
aws configure set region us-east-1

# Set the endpoint
export S3_ENDPOINT=https://s3.example.com

# Create a bucket
aws s3 mb s3://my-bucket --endpoint-url $S3_ENDPOINT

# List buckets
aws s3 ls --endpoint-url $S3_ENDPOINT

# Upload a file
echo "Hello from Rook-Ceph" > test.txt
aws s3 cp test.txt s3://my-bucket/test.txt --endpoint-url $S3_ENDPOINT

# Download a file
aws s3 cp s3://my-bucket/test.txt downloaded.txt --endpoint-url $S3_ENDPOINT

# Delete a file
aws s3 rm s3://my-bucket/test.txt --endpoint-url $S3_ENDPOINT
```

## Integrating with Applications

Here's a Python application using boto3 to interact with the object store:

```python
import boto3
from botocore.client import Config

# Configure S3 client
s3_client = boto3.client(
    's3',
    endpoint_url='https://s3.example.com',
    aws_access_key_id='YOUR_ACCESS_KEY',
    aws_secret_access_key='YOUR_SECRET_KEY',
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)

# Create bucket
try:
    s3_client.create_bucket(Bucket='app-data')
    print("Bucket created successfully")
except Exception as e:
    print(f"Bucket creation failed: {e}")

# Upload object
with open('data.json', 'rb') as data:
    s3_client.upload_fileobj(data, 'app-data', 'data.json')
    print("Object uploaded")

# List objects
response = s3_client.list_objects_v2(Bucket='app-data')
for obj in response.get('Contents', []):
    print(f"Object: {obj['Key']}, Size: {obj['Size']} bytes")

# Download object
with open('downloaded-data.json', 'wb') as data:
    s3_client.download_fileobj('app-data', 'data.json', data)
    print("Object downloaded")

# Delete object
s3_client.delete_object(Bucket='app-data', Key='data.json')
print("Object deleted")
```

## Kubernetes Application Example

Deploy an application that uses the object store:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: s3-credentials
  namespace: default
stringData:
  access-key: YOUR_ACCESS_KEY
  secret-key: YOUR_SECRET_KEY
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backup-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backup-service
  template:
    metadata:
      labels:
        app: backup-service
    spec:
      containers:
      - name: backup
        image: python:3.9
        env:
        - name: S3_ENDPOINT
          value: "http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local"
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: s3-credentials
              key: access-key
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: s3-credentials
              key: secret-key
        - name: AWS_DEFAULT_REGION
          value: "us-east-1"
        command:
        - python
        - -c
        - |
          import boto3
          import time
          from datetime import datetime

          s3 = boto3.client('s3', endpoint_url=os.environ['S3_ENDPOINT'])

          # Ensure backup bucket exists
          try:
              s3.create_bucket(Bucket='backups')
          except:
              pass

          # Continuous backup loop
          while True:
              timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
              backup_data = f"Backup at {timestamp}"

              s3.put_object(
                  Bucket='backups',
                  Key=f'backup-{timestamp}.txt',
                  Body=backup_data.encode()
              )

              print(f"Backup created: backup-{timestamp}.txt")
              time.sleep(3600)  # Backup every hour
```

## Bucket Lifecycle Policies

Configure lifecycle policies to automatically manage objects:

```bash
# Create lifecycle policy
cat > lifecycle.json <<EOF
{
  "Rules": [
    {
      "ID": "DeleteOldBackups",
      "Status": "Enabled",
      "Prefix": "backups/",
      "Expiration": {
        "Days": 30
      }
    },
    {
      "ID": "TransitionToArchive",
      "Status": "Enabled",
      "Prefix": "archive/",
      "Transitions": [
        {
          "Days": 7,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
EOF

# Apply lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-bucket \
  --lifecycle-configuration file://lifecycle.json \
  --endpoint-url $S3_ENDPOINT
```

## Monitoring Object Store Health

Check object store status:

```bash
# Get object store status
kubectl get cephobjectstore -n rook-ceph

# Check RGW pod logs
kubectl logs -n rook-ceph -l app=rook-ceph-rgw --tail=50

# Check Ceph RGW status
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- radosgw-admin metadata list bucket

# Get bucket statistics
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- radosgw-admin bucket stats --bucket=my-bucket
```

Monitor performance metrics:

```bash
# Check pool usage
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph df

# Monitor RGW operations
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph daemonperf client.rgw.my-store
```

## Performance Tuning

Optimize RGW performance with these configurations:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: high-performance-store
  namespace: rook-ceph
spec:
  gateway:
    type: s3
    port: 80
    instances: 4
    resources:
      requests:
        cpu: "2000m"
        memory: "4Gi"
      limits:
        cpu: "4000m"
        memory: "8Gi"
    # RGW configuration
    annotations:
      rgw_frontends: "beast port=80 num_threads=8"
      rgw_thread_pool_size: "512"
      rgw_max_chunk_size: "4194304"

  metadataPool:
    failureDomain: host
    replicated:
      size: 3
    parameters:
      compression_mode: none  # Disable compression for metadata
      pg_num: "128"

  dataPool:
    failureDomain: host
    erasureCoded:
      dataChunks: 4
      codingChunks: 2
    parameters:
      compression_mode: aggressive
      pg_num: "256"
```

Using erasure coding for the data pool reduces storage overhead while maintaining redundancy.

## Bucket Policies and Access Control

Set bucket policies for fine-grained access control:

```bash
# Create bucket policy
cat > bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["arn:aws:iam:::user/app-user"]},
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": ["arn:aws:s3:::my-bucket/*"]
    },
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["arn:aws:iam:::user/app-user"]},
      "Action": ["s3:ListBucket"],
      "Resource": ["arn:aws:s3:::my-bucket"]
    }
  ]
}
EOF

# Apply bucket policy
aws s3api put-bucket-policy \
  --bucket my-bucket \
  --policy file://bucket-policy.json \
  --endpoint-url $S3_ENDPOINT
```

## Multi-Site Object Store Replication

Configure multi-site replication for disaster recovery:

```yaml
# Primary site object store
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: primary-store
  namespace: rook-ceph
spec:
  gateway:
    instances: 2
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  zone:
    name: primary-zone
---
# Configure realm and zone group for multi-site
apiVersion: ceph.rook.io/v1
kind: CephObjectRealm
metadata:
  name: my-realm
  namespace: rook-ceph
spec:
  pull:
    endpoint: https://primary-s3.example.com
---
apiVersion: ceph.rook.io/v1
kind: CephObjectZoneGroup
metadata:
  name: my-zonegroup
  namespace: rook-ceph
spec:
  realm: my-realm
```

## Backup and Disaster Recovery

Back up object store metadata:

```bash
# Export RGW metadata
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- radosgw-admin metadata list bucket > buckets.json

# Export user data
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- radosgw-admin metadata list user > users.json

# Backup pools
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph df detail > pool-usage.txt
```

## Best Practices

Deploy multiple RGW instances for high availability and load distribution. Use pod anti-affinity to spread instances across nodes.

Enable compression on the data pool to reduce storage consumption. Object storage workloads often contain compressible data like logs and backups.

Use erasure coding for large-scale deployments where storage efficiency matters more than write performance.

Monitor pool capacity and set alerts when usage exceeds 75%. Plan capacity expansion before hitting limits.

Implement bucket lifecycle policies to automatically clean up old data and control costs.

## Conclusion

Rook-Ceph object storage brings S3-compatible storage directly into your Kubernetes cluster. By running your own object store, you gain independence from cloud provider lock-in while maintaining compatibility with the vast ecosystem of S3-compatible tools and applications. Proper configuration, monitoring, and capacity planning ensure reliable operation at scale.
