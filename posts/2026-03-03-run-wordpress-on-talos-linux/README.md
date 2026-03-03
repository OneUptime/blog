# How to Run WordPress on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, WordPress, Kubernetes, CMS, MySQL, DevOps

Description: Deploy WordPress on Talos Linux with MySQL backend, persistent storage, and production configurations for running a content management system on Kubernetes.

---

WordPress powers over 40% of all websites on the internet. While it was originally designed to run on traditional LAMP stacks, WordPress works well on Kubernetes when configured properly. Running WordPress on Talos Linux gives you the familiar content management system on a modern, secure infrastructure. The immutable OS eliminates many of the security concerns that plague WordPress installations on traditional servers.

This guide covers deploying WordPress on Talos Linux with a MySQL database, persistent storage for media uploads, and production-ready configurations.

## Why WordPress on Talos Linux

Traditional WordPress deployments face constant security challenges. The host OS needs regular patching, PHP needs updating, and the server configuration can be modified by anyone with access. On Talos Linux, the OS is immutable and API-driven. There is no SSH access, no package manager, and no way to modify the underlying system. WordPress runs as a Kubernetes workload, fully isolated from the host. This dramatically reduces the attack surface.

## Prerequisites

- Talos Linux cluster with at least two worker nodes
- `kubectl` configured
- A StorageClass for persistent volumes
- A domain name (optional but recommended)

## Step 1: Deploy MySQL Database

WordPress needs a MySQL or MariaDB database:

```yaml
# wordpress-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: wordpress
---
# mysql-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysql-credentials
  namespace: wordpress
type: Opaque
stringData:
  MYSQL_ROOT_PASSWORD: "root-secure-password"
  MYSQL_DATABASE: "wordpress"
  MYSQL_USER: "wordpress"
  MYSQL_PASSWORD: "wordpress-db-password"
---
# mysql-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: wordpress
spec:
  serviceName: mysql
  replicas: 1
  selector:
    matchLabels:
      app: wordpress-mysql
  template:
    metadata:
      labels:
        app: wordpress-mysql
    spec:
      containers:
        - name: mysql
          image: mysql:8.0
          ports:
            - containerPort: 3306
          envFrom:
            - secretRef:
                name: mysql-credentials
          volumeMounts:
            - name: mysql-data
              mountPath: /var/lib/mysql
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
          livenessProbe:
            exec:
              command:
                - mysqladmin
                - ping
                - -h
                - localhost
            initialDelaySeconds: 30
            periodSeconds: 10
  volumeClaimTemplates:
    - metadata:
        name: mysql-data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: local-path
        resources:
          requests:
            storage: 20Gi
---
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: wordpress
spec:
  selector:
    app: wordpress-mysql
  ports:
    - port: 3306
      targetPort: 3306
  clusterIP: None
```

```bash
kubectl apply -f wordpress-namespace.yaml
```

## Step 2: Configure WordPress

```yaml
# wordpress-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: wordpress-config
  namespace: wordpress
data:
  # Custom PHP configuration
  uploads.ini: |
    file_uploads = On
    memory_limit = 256M
    upload_max_filesize = 64M
    post_max_size = 64M
    max_execution_time = 300
    max_input_time = 300
  # Custom wp-config additions
  wp-extra-config.php: |
    <?php
    // Performance settings
    define('WP_MEMORY_LIMIT', '256M');
    define('WP_MAX_MEMORY_LIMIT', '512M');

    // Security settings
    define('DISALLOW_FILE_EDIT', true);
    define('FORCE_SSL_ADMIN', true);

    // Caching
    define('WP_CACHE', true);

    // Cron settings - use Kubernetes CronJob instead
    define('DISABLE_WP_CRON', true);
```

## Step 3: Deploy WordPress

```yaml
# wordpress-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wordpress
  namespace: wordpress
spec:
  replicas: 2
  selector:
    matchLabels:
      app: wordpress
  template:
    metadata:
      labels:
        app: wordpress
    spec:
      containers:
        - name: wordpress
          image: wordpress:6.4-php8.2-apache
          ports:
            - containerPort: 80
          env:
            - name: WORDPRESS_DB_HOST
              value: "mysql.wordpress.svc.cluster.local"
            - name: WORDPRESS_DB_NAME
              value: "wordpress"
            - name: WORDPRESS_DB_USER
              value: "wordpress"
            - name: WORDPRESS_DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-credentials
                  key: MYSQL_PASSWORD
            - name: WORDPRESS_TABLE_PREFIX
              value: "wp_"
            - name: WORDPRESS_CONFIG_EXTRA
              value: |
                define('WP_MEMORY_LIMIT', '256M');
                define('DISALLOW_FILE_EDIT', true);
                define('DISABLE_WP_CRON', true);
          volumeMounts:
            - name: wordpress-content
              mountPath: /var/www/html/wp-content
            - name: php-config
              mountPath: /usr/local/etc/php/conf.d/uploads.ini
              subPath: uploads.ini
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          readinessProbe:
            httpGet:
              path: /wp-login.php
              port: 80
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /wp-login.php
              port: 80
            initialDelaySeconds: 60
            periodSeconds: 20
      volumes:
        - name: php-config
          configMap:
            name: wordpress-config
        - name: wordpress-content
          persistentVolumeClaim:
            claimName: wordpress-content
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: wordpress-content
  namespace: wordpress
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: local-path
  resources:
    requests:
      storage: 20Gi
---
apiVersion: v1
kind: Service
metadata:
  name: wordpress
  namespace: wordpress
spec:
  selector:
    app: wordpress
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
```

```bash
kubectl apply -f wordpress-config.yaml
kubectl apply -f wordpress-deployment.yaml
```

## Step 4: Set Up Ingress

```yaml
# wordpress-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: wordpress-ingress
  namespace: wordpress
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "64m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - blog.yourdomain.com
      secretName: wordpress-tls
  rules:
    - host: blog.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: wordpress
                port:
                  number: 80
```

## Step 5: WordPress Cron Job

Since we disabled wp-cron (to avoid it running on every page load), set up a Kubernetes CronJob:

```yaml
# wordpress-cron.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: wordpress-cron
  namespace: wordpress
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: wp-cron
              image: curlimages/curl:latest
              command:
                - /bin/sh
                - -c
                - curl -s http://wordpress.wordpress.svc.cluster.local/wp-cron.php?doing_wp_cron > /dev/null 2>&1
          restartPolicy: OnFailure
```

## Step 6: Add Redis Object Cache

Speed up WordPress with Redis caching:

```yaml
# redis-cache.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-cache
  namespace: wordpress
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-cache
  template:
    metadata:
      labels:
        app: redis-cache
    spec:
      containers:
        - name: redis
          image: redis:7.2-alpine
          ports:
            - containerPort: 6379
          resources:
            requests:
              memory: "128Mi"
            limits:
              memory: "256Mi"
          command:
            - redis-server
            - --maxmemory
            - "200mb"
            - --maxmemory-policy
            - allkeys-lru
---
apiVersion: v1
kind: Service
metadata:
  name: redis-cache
  namespace: wordpress
spec:
  selector:
    app: redis-cache
  ports:
    - port: 6379
      targetPort: 6379
```

After deploying Redis, install the Redis Object Cache plugin in WordPress and configure it to connect to `redis-cache.wordpress.svc.cluster.local:6379`.

## Backup Strategy

```yaml
# wordpress-backup.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: wordpress-backup
  namespace: wordpress
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: db-backup
              image: mysql:8.0
              command:
                - /bin/sh
                - -c
                - |
                  mysqldump -h mysql.wordpress.svc.cluster.local \
                    -u wordpress -p$MYSQL_PASSWORD wordpress \
                    > /backups/wordpress-db-$(date +%Y%m%d).sql
              env:
                - name: MYSQL_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: mysql-credentials
                      key: MYSQL_PASSWORD
              volumeMounts:
                - name: backup-volume
                  mountPath: /backups
          restartPolicy: OnFailure
          volumes:
            - name: backup-volume
              persistentVolumeClaim:
                claimName: wordpress-backup-pvc
```

## Security Considerations

When running WordPress on Talos Linux:

- Set `DISALLOW_FILE_EDIT` to prevent code editing through the admin panel
- Use strong, unique passwords for all accounts
- Keep the WordPress image updated to the latest version
- Use a WAF (Web Application Firewall) in front of WordPress
- Limit login attempts with a security plugin
- Run regular backups of both the database and wp-content directory

## Conclusion

WordPress on Talos Linux is a modern approach to running the world's most popular CMS. The immutable OS protects the infrastructure layer, while Kubernetes handles scaling, health checks, and self-healing. Key points to remember include using a dedicated MySQL or MariaDB instance, enabling persistent storage for wp-content, replacing wp-cron with a Kubernetes CronJob, adding Redis caching for performance, and backing up both the database and uploaded content regularly. This setup gives you a WordPress installation that is more secure and easier to manage than traditional hosting approaches.
