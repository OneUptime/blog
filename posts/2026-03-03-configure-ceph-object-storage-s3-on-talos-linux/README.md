# How to Configure Ceph Object Storage (S3) on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Ceph, Object Storage, S3, Rook-Ceph, Kubernetes

Description: Deploy and configure S3-compatible Ceph object storage on your Talos Linux cluster using Rook for scalable blob storage.

---

Ceph Object Storage provides an S3-compatible API for storing unstructured data like files, images, backups, and logs. When you already have a Rook-Ceph cluster running on Talos Linux, adding object storage is a natural extension that gives your applications access to an S3 endpoint without relying on external cloud services.

This guide covers setting up the Ceph Object Store, creating users and buckets, and integrating it with applications running on your Talos Linux cluster.

## Prerequisites

Before starting:

- A healthy Rook-Ceph cluster running on Talos Linux
- At least 3 OSDs for proper data replication
- Helm and kubectl configured for your cluster

Verify your cluster is ready:

```bash
# Check Ceph health
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph status

# Make sure you have enough capacity
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph df
```

## Creating the Object Store

The CephObjectStore resource tells Rook to deploy the Ceph RADOS Gateway (RGW), which provides the S3 API:

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
    erasureCoded:
      dataChunks: 2
      codingChunks: 1
  preservePoolsOnDelete: true
  gateway:
    sslCertificateRef:
    port: 80
    securePort:
    instances: 2
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        memory: 2Gi
    placement:
      tolerations:
        - key: storage-node
          operator: Exists
  healthCheck:
    bucket:
      interval: 60s
```

```bash
# Create the object store
kubectl apply -f object-store.yaml

# Watch the RGW pods come up
kubectl -n rook-ceph get pods -l app=rook-ceph-rgw -w

# Verify the object store is ready
kubectl -n rook-ceph get cephobjectstore my-store
```

## Exposing the S3 Endpoint

The RGW creates a service inside the rook-ceph namespace. You can expose it through an ingress or use it directly within the cluster:

```bash
# Check the RGW service
kubectl -n rook-ceph get svc rook-ceph-rgw-my-store
```

For external access, create an ingress:

```yaml
# rgw-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rgw-ingress
  namespace: rook-ceph
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "0"
    nginx.ingress.kubernetes.io/proxy-buffering: "off"
spec:
  ingressClassName: nginx
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
  tls:
    - secretName: rgw-tls
      hosts:
        - s3.example.com
```

For internal-only access, applications can reach the RGW at:
`http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local:80`

## Creating Object Store Users

Create a CephObjectStoreUser to get S3 credentials:

```yaml
# s3-user.yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStoreUser
metadata:
  name: my-app-user
  namespace: rook-ceph
spec:
  store: my-store
  displayName: "My Application User"
  quotas:
    maxBuckets: 10
    maxSize: "100G"
    maxObjects: 1000000
```

```bash
# Create the user
kubectl apply -f s3-user.yaml

# Retrieve the access credentials
kubectl -n rook-ceph get secret rook-ceph-object-user-my-store-my-app-user -o yaml

# Decode the access key
kubectl -n rook-ceph get secret rook-ceph-object-user-my-store-my-app-user \
  -o jsonpath='{.data.AccessKey}' | base64 -d

# Decode the secret key
kubectl -n rook-ceph get secret rook-ceph-object-user-my-store-my-app-user \
  -o jsonpath='{.data.SecretKey}' | base64 -d
```

## Creating Buckets

You can create buckets using the Kubernetes ObjectBucketClaim resource or using standard S3 tools.

### Using ObjectBucketClaim

First, create a StorageClass for object buckets:

```yaml
# object-bucket-sc.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-bucket
provisioner: rook-ceph.ceph.rook.io/bucket
reclaimPolicy: Delete
parameters:
  objectStoreName: my-store
  objectStoreNamespace: rook-ceph
```

Then create a bucket claim:

```yaml
# bucket-claim.yaml
apiVersion: objectbucket.io/v1alpha1
kind: ObjectBucketClaim
metadata:
  name: app-bucket
  namespace: my-app
spec:
  generateBucketName: my-app-data
  storageClassName: ceph-bucket
  additionalConfig:
    maxObjects: "100000"
    maxSize: "10G"
```

```bash
kubectl apply -f object-bucket-sc.yaml
kubectl apply -f bucket-claim.yaml

# The claim creates a ConfigMap and Secret with connection info
kubectl get configmap app-bucket -n my-app -o yaml
kubectl get secret app-bucket -n my-app -o yaml
```

### Using the AWS CLI

You can also use the AWS CLI to manage buckets:

```bash
# Configure the AWS CLI with Ceph credentials
export AWS_ACCESS_KEY_ID=$(kubectl -n rook-ceph get secret rook-ceph-object-user-my-store-my-app-user -o jsonpath='{.data.AccessKey}' | base64 -d)
export AWS_SECRET_ACCESS_KEY=$(kubectl -n rook-ceph get secret rook-ceph-object-user-my-store-my-app-user -o jsonpath='{.data.SecretKey}' | base64 -d)

# Port forward to the RGW service
kubectl -n rook-ceph port-forward svc/rook-ceph-rgw-my-store 8080:80 &

# Create a bucket
aws s3 mb s3://my-bucket --endpoint-url http://localhost:8080

# Upload a file
aws s3 cp myfile.txt s3://my-bucket/ --endpoint-url http://localhost:8080

# List bucket contents
aws s3 ls s3://my-bucket/ --endpoint-url http://localhost:8080
```

## Using S3 Storage in Applications

Here is how to connect an application to the Ceph S3 endpoint:

```yaml
# app-with-s3.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: file-service
  namespace: my-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: file-service
  template:
    metadata:
      labels:
        app: file-service
    spec:
      containers:
        - name: file-service
          image: myorg/file-service:1.0.0
          env:
            - name: S3_ENDPOINT
              value: "http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local:80"
            - name: S3_BUCKET
              valueFrom:
                configMapKeyRef:
                  name: app-bucket
                  key: BUCKET_NAME
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
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
```

## Configuring Bucket Lifecycle Policies

Manage object lifecycle using the S3 API:

```bash
# Create a lifecycle policy JSON file
cat > lifecycle.json << 'POLICY'
{
  "Rules": [
    {
      "ID": "expire-old-logs",
      "Filter": {
        "Prefix": "logs/"
      },
      "Status": "Enabled",
      "Expiration": {
        "Days": 30
      }
    },
    {
      "ID": "transition-to-cold",
      "Filter": {
        "Prefix": "archives/"
      },
      "Status": "Enabled",
      "Transition": {
        "Days": 90,
        "StorageClass": "COLD"
      }
    }
  ]
}
POLICY

# Apply the lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-bucket \
  --lifecycle-configuration file://lifecycle.json \
  --endpoint-url http://localhost:8080
```

## Enabling Bucket Notifications

Ceph supports bucket notifications for event-driven architectures:

```bash
# Create a notification topic
aws sns create-topic \
  --name bucket-events \
  --endpoint-url http://localhost:8080 \
  --attributes '{"push-endpoint":"http://webhook.my-app.svc.cluster.local:8080/events"}'

# Configure bucket notifications
aws s3api put-bucket-notification-configuration \
  --bucket my-bucket \
  --notification-configuration '{
    "TopicConfigurations": [{
      "TopicArn": "arn:aws:sns:default::bucket-events",
      "Events": ["s3:ObjectCreated:*"]
    }]
  }' \
  --endpoint-url http://localhost:8080
```

## Monitoring and Health Checks

Monitor your object store:

```bash
# Check RGW status
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- radosgw-admin bucket stats --bucket=my-bucket

# List all buckets
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- radosgw-admin bucket list

# Check user quota usage
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- radosgw-admin user info --uid=my-app-user

# Check RGW performance
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- radosgw-admin usage show
```

## Summary

Ceph Object Storage on Talos Linux gives you a self-hosted S3-compatible endpoint without depending on cloud providers. With Rook managing the deployment, the RADOS Gateway runs as regular Kubernetes pods that can be scaled and monitored like any other workload. The integration with Kubernetes through ObjectBucketClaims makes it easy for applications to request storage, while the standard S3 API means your code works the same whether you are talking to Ceph or AWS S3. For Talos Linux clusters that need blob storage, this is a practical and cost-effective solution.
