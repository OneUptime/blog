# How to Deploy WordPress on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, WordPress, Kubernetes, Helm, MySQL, Content Management

Description: Deploy WordPress on Rancher with persistent storage, MySQL database, autoscaling, and Ingress for a production-ready CMS on Kubernetes.

## Introduction

WordPress is the world's most popular CMS. While it wasn't designed for containerization, modern Helm charts make it practical to run on Rancher with proper persistent storage for uploads and a dedicated MySQL database.

## Step 1: Deploy WordPress with Helm

```yaml
# wordpress-values.yaml

wordpressUsername: admin
wordpressPassword: "securepassword"
wordpressEmail: admin@example.com
wordpressBlogName: "My WordPress Site"

ingress:
  enabled: true
  ingressClassName: nginx
  hostname: blog.example.com
  tls: true
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod

persistence:
  enabled: true
  storageClass: longhorn
  accessModes:
    - ReadWriteMany
  size: 20Gi    # For media uploads

mariadb:
  enabled: true
  auth:
    database: wordpress
    username: wordpress
    password: "dbpassword"
    rootPassword: "rootpassword"
  primary:
    persistence:
      enabled: true
      storageClass: longhorn
      size: 20Gi

resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "1Gi"
    cpu: "500m"

replicaCount: 2    # Requires shared ReadWriteMany storage
```

```bash
kubectl create namespace wordpress

helm install wordpress oci://registry-1.docker.io/bitnamicharts/wordpress \
  --namespace wordpress \
  --values wordpress-values.yaml
```

## Step 2: Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n wordpress

# Check PVCs are bound
kubectl get pvc -n wordpress

# Verify Ingress
kubectl get ingress -n wordpress
```

## Step 3: Configure Shared Storage for Media

For multi-replica deployments, `wp-content/uploads` needs shared storage. With the Bitnami chart, that means using a `ReadWriteMany` volume for `wp-content/uploads` or offloading media to S3-compatible object storage with a plugin configured in WordPress.

## Step 4: Configure WordPress for Kubernetes

```yaml
# Add to wordpress-values.yaml
wordpressTablePrefix: wp_
wordpressScheme: https
wordpressExtraConfigContent: |
  define('FORCE_SSL_ADMIN', true);

extraEnvVars:
  # Required when TLS terminates at the Ingress
  - name: WORDPRESS_ENABLE_REVERSE_PROXY
    value: "yes"
```

## Step 5: Set Up Backups

```bash
# Create a PVC and CronJob for WordPress database backups
kubectl apply -f - << 'EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: wordpress-backups
  namespace: wordpress
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 20Gi
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: wordpress-backup
  namespace: wordpress
spec:
  schedule: "0 2 * * *"    # Daily at 2am
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: bitnami/mariadb:12.0.2-debian-12-r0
              command:
                - /bin/bash
                - -ec
                - >
                  mysqldump -h wordpress-mariadb -u wordpress
                  -pdbpassword wordpress >
                  /backups/wordpress-$(date +%Y%m%d).sql
              volumeMounts:
                - name: backups
                  mountPath: /backups
          restartPolicy: OnFailure
          volumes:
            - name: backups
              persistentVolumeClaim:
                claimName: wordpress-backups
EOF
```

## Conclusion

WordPress on Rancher is production-ready with the Bitnami Helm chart handling most configuration. The key challenge for scaled deployments is shared media storage-use a `ReadWriteMany` volume or S3-compatible offloading for any deployment with more than one WordPress replica, as the local filesystem cannot be shared between pods.
