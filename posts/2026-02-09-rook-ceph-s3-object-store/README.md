# How to Implement Rook-Ceph Object Store for S3-Compatible Storage on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, S3, Object Storage

Description: Deploy Ceph Object Gateway with Rook for S3-compatible object storage on Kubernetes with bucket provisioning, access management, and integration with applications.

---

Ceph Object Gateway (RGW) provides an S3-compatible object storage interface built on Ceph's distributed storage cluster. Through Rook, deploying and managing object storage becomes straightforward with Kubernetes-native custom resources. This enables applications to use industry-standard S3 APIs for storing unstructured data like images, videos, backups, and logs without depending on cloud providers.

## Understanding Ceph Object Storage

The Ceph Object Gateway implements Amazon S3 and OpenStack Swift APIs, making it compatible with existing S3 clients and libraries. RGW daemons serve as HTTP endpoints that translate S3 requests into RADOS operations on the underlying Ceph cluster. Multiple RGW instances provide load balancing and high availability.

Unlike block (RBD) or filesystem (CephFS) storage, object storage is accessed via HTTP APIs rather than filesystem mounts. This architectural difference makes it ideal for application-level integration, backup storage, and content delivery scenarios.

## Deploying Object Store

Create a CephObjectStore resource to provision RGW daemons and storage pools.

```yaml
# object-store.yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  metadataPool:
    failureDomain: host
    replicated:
      size: 3
  dataPool:
    failureDomain: host
    replicated:
      size: 3
  preservePoolsOnDelete: false
  gateway:
    port: 80
    instances: 2
    resources:
      requests:
        cpu: "500m"
        memory: "1Gi"
      limits:
        cpu: "1000m"
        memory: "2Gi"
    priorityClassName: ""
```

Deploy the object store:

```bash
kubectl apply -f object-store.yaml

# Watch RGW pods start
watch kubectl get pods -n rook-ceph -l app=rook-ceph-rgw

# Verify object store creation
kubectl get cephobjectstore -n rook-ceph
```

## Exposing Object Store Service

Create a Service to access the object store.

```yaml
# object-store-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: rook-ceph-rgw-my-store
  namespace: rook-ceph
  labels:
    app: rook-ceph-rgw
spec:
  ports:
  - name: http
    port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: rook-ceph-rgw
    rook_object_store: my-store
  type: LoadBalancer  # Or ClusterIP/NodePort based on needs
```

For production with SSL:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rook-ceph-rgw-ingress
  namespace: rook-ceph
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - s3.example.com
    secretName: rgw-tls-cert
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

## Creating S3 Users

Create a CephObjectStoreUser for S3 access credentials.

```yaml
# object-store-user.yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStoreUser
metadata:
  name: app-user
  namespace: rook-ceph
spec:
  store: my-store
  displayName: "Application User"
```

Apply and retrieve credentials:

```bash
kubectl apply -f object-store-user.yaml

# Get access keys
kubectl get secret -n rook-ceph rook-ceph-object-user-my-store-app-user -o jsonpath='{.data.AccessKey}' | base64 --decode && echo
kubectl get secret -n rook-ceph rook-ceph-object-user-my-store-app-user -o jsonpath='{.data.SecretKey}' | base64 --decode && echo
```

## Testing with AWS CLI

Install and configure AWS CLI to test S3 access.

```bash
# Install AWS CLI
pip install awscli

# Configure credentials
export AWS_ACCESS_KEY_ID=$(kubectl get secret -n rook-ceph rook-ceph-object-user-my-store-app-user -o jsonpath='{.data.AccessKey}' | base64 --decode)
export AWS_SECRET_ACCESS_KEY=$(kubectl get secret -n rook-ceph rook-ceph-object-user-my-store-app-user -o jsonpath='{.data.SecretKey}' | base64 --decode)
export AWS_ENDPOINT_URL=http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local

# Create bucket
aws s3 mb s3://test-bucket --endpoint-url=$AWS_ENDPOINT_URL

# List buckets
aws s3 ls --endpoint-url=$AWS_ENDPOINT_URL

# Upload file
echo "Hello from Ceph" > test.txt
aws s3 cp test.txt s3://test-bucket/ --endpoint-url=$AWS_ENDPOINT_URL

# Download file
aws s3 cp s3://test-bucket/test.txt downloaded.txt --endpoint-url=$AWS_ENDPOINT_URL
```

## Bucket Provisioning for Applications

Use ObjectBucketClaim for automated bucket provisioning.

```yaml
# bucket-claim.yaml
apiVersion: objectbucket.io/v1alpha1
kind: ObjectBucketClaim
metadata:
  name: app-bucket
  namespace: default
spec:
  generateBucketName: app-bucket
  storageClassName: rook-ceph-bucket
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-bucket
provisioner: rook-ceph.ceph.rook.io/bucket
parameters:
  objectStoreName: my-store
  objectStoreNamespace: rook-ceph
reclaimPolicy: Delete
```

The claim creates a bucket and generates credentials automatically:

```bash
kubectl apply -f bucket-claim.yaml

# Get generated bucket name
kubectl get obc app-bucket -o jsonpath='{.spec.bucketName}'

# Access credentials are stored in ConfigMap and Secret
kubectl get configmap app-bucket -o yaml
kubectl get secret app-bucket -o yaml
```

## Application Integration

Use the provisioned bucket in applications.

```yaml
# app-with-s3.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backup-app
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backup-app
  template:
    metadata:
      labels:
        app: backup-app
    spec:
      containers:
      - name: app
        image: amazon/aws-cli:latest
        command:
        - sh
        - -c
        - |
          while true; do
            echo "$(date)" > backup-$(date +%s).txt
            aws s3 cp backup-*.txt s3://$BUCKET_NAME/ --endpoint-url=$AWS_ENDPOINT_URL
            sleep 300
          done
        env:
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: app-bucket
              key: AWS_ACCESS_KEY_ID
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: app-bucket
              key: AWS_SECRET_ACCESS_KEY
        - name: BUCKET_NAME
          valueFrom:
            configMapKeyRef:
              name: app-bucket
              key: BUCKET_NAME
        - name: AWS_ENDPOINT_URL
          valueFrom:
            configMapKeyRef:
              name: app-bucket
              key: BUCKET_HOST
```

## Bucket Policies and Access Control

Set bucket policies for fine-grained access control.

```python
# set-bucket-policy.py
import boto3
import json

s3 = boto3.client('s3',
    endpoint_url='http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local',
    aws_access_key_id='ACCESS_KEY',
    aws_secret_access_key='SECRET_KEY'
)

policy = {
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Principal": {"AWS": ["*"]},
        "Action": ["s3:GetObject"],
        "Resource": ["arn:aws:s3:::public-bucket/*"]
    }]
}

s3.put_bucket_policy(
    Bucket='public-bucket',
    Policy=json.dumps(policy)
)
```

## Monitoring Object Storage

Monitor RGW performance and usage.

```bash
# Check RGW daemon status
kubectl get pods -n rook-ceph -l app=rook-ceph-rgw

# View bucket statistics
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin bucket stats --bucket=test-bucket

# List all buckets
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin bucket list

# User statistics
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin user stats --uid=app-user
```

Prometheus metrics:

```promql
# Request rate
rate(ceph_rgw_req[5m])

# Bandwidth
rate(ceph_rgw_sent[5m])
rate(ceph_rgw_received[5m])

# Error rate
rate(ceph_rgw_failed_req[5m])
```

## Multi-Site Replication

Configure replication between object stores for disaster recovery.

```yaml
# Configure realm, zonegroup, and zone for multi-site
apiVersion: ceph.rook.io/v1
kind: CephObjectRealm
metadata:
  name: my-realm
  namespace: rook-ceph
---
apiVersion: ceph.rook.io/v1
kind: CephObjectZoneGroup
metadata:
  name: my-zonegroup
  namespace: rook-ceph
spec:
  realm: my-realm
---
apiVersion: ceph.rook.io/v1
kind: CephObjectZone
metadata:
  name: zone-a
  namespace: rook-ceph
spec:
  zoneGroup: my-zonegroup
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
```

## Performance Tuning

Optimize RGW for high throughput.

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: fast-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 2
    parameters:
      pg_num: "32"
  dataPool:
    replicated:
      size: 2
    parameters:
      pg_num: "128"
      compression_mode: none
  gateway:
    port: 80
    instances: 4
    resources:
      requests:
        cpu: "2000m"
        memory: "4Gi"
      limits:
        cpu: "4000m"
        memory: "8Gi"
```

## Lifecycle Policies

Implement object lifecycle management.

```python
import boto3

s3 = boto3.client('s3', endpoint_url='http://...')

lifecycle_config = {
    'Rules': [{
        'Id': 'Delete old backups',
        'Status': 'Enabled',
        'Prefix': 'backups/',
        'Expiration': {'Days': 30}
    }]
}

s3.put_bucket_lifecycle_configuration(
    Bucket='backup-bucket',
    LifecycleConfiguration=lifecycle_config
)
```

## Conclusion

Rook-Ceph Object Gateway provides S3-compatible object storage that integrates seamlessly with Kubernetes workloads. With automatic bucket provisioning through ObjectBucketClaims, built-in multi-site replication, and comprehensive S3 API compatibility, it enables self-hosted object storage without cloud provider dependencies. Monitor RGW performance, implement appropriate access controls, and tune configuration based on your workload characteristics for optimal operation.
