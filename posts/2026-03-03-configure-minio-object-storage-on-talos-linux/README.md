# How to Configure MinIO Object Storage on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, MinIO, Object Storage, S3, Kubernetes, Storage

Description: Deploy and configure MinIO S3-compatible object storage on your Talos Linux cluster for scalable file and blob storage.

---

MinIO is a high-performance, S3-compatible object storage system that runs natively on Kubernetes. It is one of the most popular choices for self-hosted object storage because of its simplicity, performance, and full compatibility with the S3 API. On a Talos Linux cluster, MinIO provides a practical way to store files, backups, logs, and any other unstructured data without depending on cloud provider services.

This guide covers deploying MinIO on Talos Linux, from a simple single-node setup to a production-ready distributed configuration.

## Prerequisites

- A Talos Linux cluster with at least 4 worker nodes (for distributed mode)
- A StorageClass available for persistent storage (local-path, Longhorn, or Ceph)
- Helm and kubectl configured for your cluster
- At least 10GB of available storage per node for MinIO data

## Installing the MinIO Operator

The recommended way to deploy MinIO on Kubernetes is through the MinIO Operator:

```bash
# Add the MinIO Helm repository
helm repo add minio-operator https://operator.min.io
helm repo update

# Install the MinIO Operator
helm install minio-operator minio-operator/operator \
  --namespace minio-operator \
  --create-namespace

# Verify the operator is running
kubectl -n minio-operator get pods
```

## Deploying a MinIO Tenant

A MinIO Tenant is the actual MinIO cluster. Create one with the following configuration:

```yaml
# minio-tenant.yaml
apiVersion: minio.min.io/v2
kind: Tenant
metadata:
  name: my-minio
  namespace: minio-tenant
spec:
  image: quay.io/minio/minio:latest
  imagePullPolicy: IfNotPresent
  pools:
    - servers: 4
      name: pool-0
      volumesPerServer: 2
      volumeClaimTemplate:
        metadata:
          name: data
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 50Gi
          storageClassName: longhorn
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: "2"
          memory: 4Gi
      securityContext:
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        runAsNonRoot: true
  mountPath: /export
  requestAutoCert: true
  users:
    - name: minio-user-secret
  configuration:
    name: minio-env-configuration
```

Create the namespace and secrets:

```bash
# Create the namespace
kubectl create namespace minio-tenant

# Create the root credentials secret
kubectl -n minio-tenant create secret generic minio-env-configuration \
  --from-literal=config.env="
export MINIO_ROOT_USER=admin
export MINIO_ROOT_PASSWORD=minio-admin-password-change-me
"

# Create a user secret
kubectl -n minio-tenant create secret generic minio-user-secret \
  --from-literal=CONSOLE_ACCESS_KEY=console-user \
  --from-literal=CONSOLE_SECRET_KEY=console-secret-key
```

```bash
# Deploy the tenant
kubectl apply -f minio-tenant.yaml

# Watch the pods come up
kubectl -n minio-tenant get pods -w
```

## Simple Single-Node Deployment

For development or testing, you can deploy MinIO as a simple standalone instance:

```yaml
# minio-standalone.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: minio-data
  namespace: minio
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: longhorn
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minio
  namespace: minio
spec:
  replicas: 1
  selector:
    matchLabels:
      app: minio
  template:
    metadata:
      labels:
        app: minio
    spec:
      securityContext:
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
      containers:
        - name: minio
          image: quay.io/minio/minio:latest
          command:
            - /bin/sh
            - -c
            - minio server /data --console-address ":9001"
          ports:
            - containerPort: 9000
              name: api
            - containerPort: 9001
              name: console
          env:
            - name: MINIO_ROOT_USER
              valueFrom:
                secretKeyRef:
                  name: minio-credentials
                  key: root-user
            - name: MINIO_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: minio-credentials
                  key: root-password
          volumeMounts:
            - name: data
              mountPath: /data
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 2Gi
          livenessProbe:
            httpGet:
              path: /minio/health/live
              port: api
            initialDelaySeconds: 30
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /minio/health/ready
              port: api
            initialDelaySeconds: 10
            periodSeconds: 10
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: minio-data
---
apiVersion: v1
kind: Service
metadata:
  name: minio
  namespace: minio
spec:
  selector:
    app: minio
  ports:
    - port: 9000
      targetPort: api
      name: api
    - port: 9001
      targetPort: console
      name: console
  type: ClusterIP
```

```bash
# Create the namespace and credentials
kubectl create namespace minio
kubectl -n minio create secret generic minio-credentials \
  --from-literal=root-user=admin \
  --from-literal=root-password=changeme123456

# Deploy MinIO
kubectl apply -f minio-standalone.yaml

# Check it is running
kubectl -n minio get pods
```

## Accessing the MinIO Console

```bash
# Port forward to the console
kubectl -n minio port-forward svc/minio 9001:9001

# Open http://localhost:9001 in your browser
# Login with the credentials you set
```

For permanent access, create an ingress:

```yaml
# minio-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: minio-console
  namespace: minio
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  rules:
    - host: minio-console.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: minio
                port:
                  number: 9001
    - host: s3.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: minio
                port:
                  number: 9000
  tls:
    - secretName: minio-tls
      hosts:
        - minio-console.example.com
        - s3.example.com
```

## Using MinIO from Applications

Connect your applications to MinIO using the S3 API:

```yaml
# app-using-minio.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: myorg/my-app:1.0.0
          env:
            - name: S3_ENDPOINT
              value: "http://minio.minio.svc.cluster.local:9000"
            - name: S3_BUCKET
              value: "my-app-uploads"
            - name: S3_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: minio-app-credentials
                  key: access-key
            - name: S3_SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: minio-app-credentials
                  key: secret-key
            - name: S3_REGION
              value: "us-east-1"
            - name: S3_FORCE_PATH_STYLE
              value: "true"
```

## Creating Buckets and Policies with mc

The MinIO client (mc) is a command-line tool for managing MinIO:

```bash
# Install mc
brew install minio/stable/mc  # macOS
# Or download from https://min.io/download

# Port forward to the API port
kubectl -n minio port-forward svc/minio 9000:9000 &

# Configure mc with your MinIO instance
mc alias set local http://localhost:9000 admin changeme123456

# Create buckets
mc mb local/app-uploads
mc mb local/backups
mc mb local/logs

# List buckets
mc ls local/

# Set bucket policy to allow public read
mc anonymous set download local/app-uploads

# Create an application-specific access key
mc admin user add local app-user app-user-password
mc admin policy attach local readwrite --user=app-user
```

## Configuring Bucket Notifications

MinIO can send notifications when objects are created or deleted:

```bash
# Configure webhook notification
mc admin config set local notify_webhook:mywebhook \
  endpoint="http://my-app.my-app.svc.cluster.local:8080/webhook" \
  queue_dir="/tmp/events" \
  queue_limit="10000"

# Restart MinIO to apply
mc admin service restart local

# Set up bucket event notification
mc event add local/app-uploads arn:minio:sqs::mywebhook:webhook \
  --event put,delete
```

## Monitoring MinIO

```bash
# Check MinIO server info
mc admin info local

# View real-time server metrics
mc admin prometheus generate local

# Check disk usage
mc du local/app-uploads

# View server logs
mc admin logs local
```

## Summary

MinIO on Talos Linux gives you a fast, reliable S3-compatible object storage system running entirely within your Kubernetes cluster. Whether you deploy a simple standalone instance for development or a distributed multi-node tenant for production, MinIO integrates naturally with the Kubernetes ecosystem through standard services and ingress resources. The full S3 API compatibility means your applications can switch between MinIO and cloud S3 without code changes, making it a flexible choice for any Talos Linux deployment.
