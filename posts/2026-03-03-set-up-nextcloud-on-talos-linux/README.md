# How to Set Up Nextcloud on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Nextcloud, Kubernetes, Self-Hosted Cloud, File Storage, DevOps

Description: Deploy Nextcloud self-hosted cloud platform on Talos Linux with persistent storage, database backend, and collaborative features for teams.

---

Nextcloud is a self-hosted cloud platform that provides file storage, calendar, contacts, video calls, and collaborative document editing. It is a privacy-focused alternative to services like Google Drive and Dropbox. Running Nextcloud on Talos Linux gives you full control over your data on an infrastructure where the OS itself cannot be compromised. This is particularly valuable for organizations with strict data sovereignty requirements.

This guide covers deploying Nextcloud on Talos Linux with a PostgreSQL database, Redis caching, and persistent storage for user files.

## Why Nextcloud on Talos Linux

Data privacy is the primary reason organizations choose Nextcloud. By hosting it on Talos Linux, you add an extra layer of security. The immutable OS prevents unauthorized access at the system level, and all management happens through the Kubernetes API. No one can SSH into a node and access Nextcloud files directly on disk. Combined with Kubernetes RBAC and network policies, this creates a defense-in-depth approach for your self-hosted cloud.

## Prerequisites

- Talos Linux cluster with at least two worker nodes
- `kubectl` and `helm` configured
- A StorageClass that supports ReadWriteMany (for multi-replica deployments) or ReadWriteOnce (for single replica)
- A domain name for Nextcloud
- At least 4GB RAM on worker nodes

## Step 1: Deploy PostgreSQL

While Nextcloud supports SQLite and MySQL, PostgreSQL is recommended for production:

```yaml
# nextcloud-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: nextcloud
---
# nextcloud-db-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: nextcloud-db-credentials
  namespace: nextcloud
type: Opaque
stringData:
  POSTGRES_DB: "nextcloud"
  POSTGRES_USER: "nextcloud"
  POSTGRES_PASSWORD: "nextcloud-db-password"
---
# postgres-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: nextcloud-postgres
  namespace: nextcloud
spec:
  serviceName: nextcloud-postgres
  replicas: 1
  selector:
    matchLabels:
      app: nextcloud-postgres
  template:
    metadata:
      labels:
        app: nextcloud-postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          ports:
            - containerPort: 5432
          envFrom:
            - secretRef:
                name: nextcloud-db-credentials
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
              subPath: pgdata
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
          livenessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - nextcloud
            initialDelaySeconds: 30
            periodSeconds: 10
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: local-path
        resources:
          requests:
            storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: nextcloud-postgres
  namespace: nextcloud
spec:
  selector:
    app: nextcloud-postgres
  ports:
    - port: 5432
  clusterIP: None
```

## Step 2: Deploy Redis for Caching

```yaml
# nextcloud-redis.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nextcloud-redis
  namespace: nextcloud
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nextcloud-redis
  template:
    metadata:
      labels:
        app: nextcloud-redis
    spec:
      containers:
        - name: redis
          image: redis:7.2-alpine
          ports:
            - containerPort: 6379
          command:
            - redis-server
            - --maxmemory
            - "256mb"
            - --maxmemory-policy
            - allkeys-lru
            - --requirepass
            - "redis-cache-password"
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: nextcloud-redis
  namespace: nextcloud
spec:
  selector:
    app: nextcloud-redis
  ports:
    - port: 6379
```

## Step 3: Deploy Nextcloud

```yaml
# nextcloud-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nextcloud
  namespace: nextcloud
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nextcloud
  template:
    metadata:
      labels:
        app: nextcloud
    spec:
      containers:
        - name: nextcloud
          image: nextcloud:28-apache
          ports:
            - containerPort: 80
          env:
            # Database configuration
            - name: POSTGRES_HOST
              value: "nextcloud-postgres.nextcloud.svc.cluster.local"
            - name: POSTGRES_DB
              value: "nextcloud"
            - name: POSTGRES_USER
              value: "nextcloud"
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: nextcloud-db-credentials
                  key: POSTGRES_PASSWORD
            # Redis configuration
            - name: REDIS_HOST
              value: "nextcloud-redis.nextcloud.svc.cluster.local"
            - name: REDIS_HOST_PORT
              value: "6379"
            - name: REDIS_HOST_PASSWORD
              value: "redis-cache-password"
            # Admin account
            - name: NEXTCLOUD_ADMIN_USER
              value: "admin"
            - name: NEXTCLOUD_ADMIN_PASSWORD
              value: "admin-secure-password"
            # Domain configuration
            - name: NEXTCLOUD_TRUSTED_DOMAINS
              value: "cloud.yourdomain.com"
            - name: OVERWRITEPROTOCOL
              value: "https"
            - name: OVERWRITECLIURL
              value: "https://cloud.yourdomain.com"
            # PHP configuration
            - name: PHP_MEMORY_LIMIT
              value: "512M"
            - name: PHP_UPLOAD_LIMIT
              value: "10G"
          volumeMounts:
            - name: nextcloud-data
              mountPath: /var/www/html
            - name: nextcloud-files
              mountPath: /var/www/html/data
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          readinessProbe:
            httpGet:
              path: /status.php
              port: 80
              httpHeaders:
                - name: Host
                  value: "cloud.yourdomain.com"
            initialDelaySeconds: 30
            periodSeconds: 15
          livenessProbe:
            httpGet:
              path: /status.php
              port: 80
              httpHeaders:
                - name: Host
                  value: "cloud.yourdomain.com"
            initialDelaySeconds: 60
            periodSeconds: 30
      volumes:
        - name: nextcloud-data
          persistentVolumeClaim:
            claimName: nextcloud-app
        - name: nextcloud-files
          persistentVolumeClaim:
            claimName: nextcloud-files
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nextcloud-app
  namespace: nextcloud
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nextcloud-files
  namespace: nextcloud
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 500Gi
---
apiVersion: v1
kind: Service
metadata:
  name: nextcloud
  namespace: nextcloud
spec:
  selector:
    app: nextcloud
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
```

```bash
kubectl apply -f nextcloud-namespace.yaml
kubectl apply -f nextcloud-redis.yaml
kubectl apply -f nextcloud-deployment.yaml
```

## Step 4: Configure Ingress

```yaml
# nextcloud-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nextcloud-ingress
  namespace: nextcloud
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "10G"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-buffering: "off"
    nginx.ingress.kubernetes.io/proxy-request-buffering: "off"
    nginx.ingress.kubernetes.io/server-snippet: |
      location = /.well-known/carddav {
        return 301 $scheme://$host:$server_port/remote.php/dav;
      }
      location = /.well-known/caldav {
        return 301 $scheme://$host:$server_port/remote.php/dav;
      }
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - cloud.yourdomain.com
      secretName: nextcloud-tls
  rules:
    - host: cloud.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: nextcloud
                port:
                  number: 80
```

## Step 5: Nextcloud Cron Job

Nextcloud needs regular background job execution:

```yaml
# nextcloud-cron.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nextcloud-cron
  namespace: nextcloud
spec:
  schedule: "*/5 * * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: cron
              image: nextcloud:28-apache
              command:
                - /bin/sh
                - -c
                - php -f /var/www/html/cron.php
              volumeMounts:
                - name: nextcloud-data
                  mountPath: /var/www/html
                - name: nextcloud-files
                  mountPath: /var/www/html/data
          restartPolicy: OnFailure
          volumes:
            - name: nextcloud-data
              persistentVolumeClaim:
                claimName: nextcloud-app
            - name: nextcloud-files
              persistentVolumeClaim:
                claimName: nextcloud-files
```

## Step 6: Using the Nextcloud Helm Chart

For a simplified deployment, use the official Helm chart:

```bash
helm repo add nextcloud https://nextcloud.github.io/helm/
helm repo update
```

```yaml
# nextcloud-helm-values.yaml
nextcloud:
  host: cloud.yourdomain.com
  username: admin
  password: admin-password

ingress:
  enabled: true
  className: nginx
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "10G"
  tls:
    - secretName: nextcloud-tls
      hosts:
        - cloud.yourdomain.com

internalDatabase:
  enabled: false

externalDatabase:
  enabled: true
  type: postgresql
  host: nextcloud-postgres
  database: nextcloud
  user: nextcloud
  password: nextcloud-db-password

redis:
  enabled: true

persistence:
  enabled: true
  storageClass: local-path
  size: 500Gi

cronjob:
  enabled: true
```

```bash
helm install nextcloud nextcloud/nextcloud \
  --namespace nextcloud \
  --values nextcloud-helm-values.yaml
```

## Backup Strategy

Back up Nextcloud data, database, and configuration:

```bash
# Manual database backup
kubectl exec -it nextcloud-postgres-0 -n nextcloud -- \
  pg_dump -U nextcloud nextcloud > nextcloud-backup.sql

# Put Nextcloud in maintenance mode before backup
kubectl exec -it deploy/nextcloud -n nextcloud -- \
  php occ maintenance:mode --on

# After backup is complete
kubectl exec -it deploy/nextcloud -n nextcloud -- \
  php occ maintenance:mode --off
```

## Conclusion

Nextcloud on Talos Linux gives you a self-hosted cloud platform with strong security guarantees. The immutable OS prevents unauthorized access at the infrastructure level, while Nextcloud provides encrypted storage and granular access controls at the application level. The key deployment considerations are adequate storage for user files, PostgreSQL for the database, Redis for caching, and proper ingress configuration with high upload limits. With regular backups and the Nextcloud background job running on schedule, this setup provides a reliable, private alternative to commercial cloud storage services.
