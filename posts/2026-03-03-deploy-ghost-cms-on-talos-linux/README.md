# How to Deploy Ghost CMS on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Ghost CMS, Kubernetes, Blogging Platform, Node.js, DevOps

Description: Deploy Ghost CMS blogging platform on Talos Linux with MySQL storage, content persistence, and production-ready email and theme configuration.

---

Ghost is a modern, open-source publishing platform built on Node.js. It focuses on professional publishing with a clean editor, built-in SEO, memberships, and newsletters. Unlike WordPress, Ghost is purpose-built for content creation rather than being a general-purpose CMS. Running Ghost on Talos Linux gives you a professional publishing platform on a secure, immutable infrastructure that requires minimal maintenance.

This guide covers deploying Ghost on Talos Linux with a MySQL database, persistent content storage, and production configuration including email delivery and custom themes.

## Why Ghost on Talos Linux

Ghost is a Node.js application that is straightforward to containerize. On Talos Linux, it runs as a Kubernetes workload with all the benefits of container orchestration: automatic restarts, health checks, rolling updates, and horizontal scaling. The immutable OS means your publishing platform's infrastructure is tamper-proof, which is important for any public-facing application.

## Prerequisites

- Talos Linux cluster with at least one worker node
- `kubectl` configured
- A StorageClass for persistent volumes
- A domain name for your Ghost blog
- SMTP credentials for email delivery (optional but recommended)

## Step 1: Deploy MySQL for Ghost

Ghost supports MySQL as its production database:

```yaml
# ghost-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ghost
---
# ghost-db-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: ghost-db-credentials
  namespace: ghost
type: Opaque
stringData:
  MYSQL_ROOT_PASSWORD: "root-password-here"
  MYSQL_DATABASE: "ghost_prod"
  MYSQL_USER: "ghost"
  MYSQL_PASSWORD: "ghost-db-password"
---
# ghost-mysql.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ghost-mysql
  namespace: ghost
spec:
  serviceName: ghost-mysql
  replicas: 1
  selector:
    matchLabels:
      app: ghost-mysql
  template:
    metadata:
      labels:
        app: ghost-mysql
    spec:
      containers:
        - name: mysql
          image: mysql:8.0
          ports:
            - containerPort: 3306
          envFrom:
            - secretRef:
                name: ghost-db-credentials
          volumeMounts:
            - name: mysql-data
              mountPath: /var/lib/mysql
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
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
            storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: ghost-mysql
  namespace: ghost
spec:
  selector:
    app: ghost-mysql
  ports:
    - port: 3306
  clusterIP: None
```

```bash
kubectl apply -f ghost-namespace.yaml
```

## Step 2: Create Ghost Configuration

```yaml
# ghost-config-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: ghost-config
  namespace: ghost
type: Opaque
stringData:
  # Email configuration (using Mailgun as an example)
  MAIL_TRANSPORT: "SMTP"
  MAIL_HOST: "smtp.mailgun.org"
  MAIL_PORT: "587"
  MAIL_USER: "postmaster@mg.yourdomain.com"
  MAIL_PASSWORD: "your-mailgun-password"
  MAIL_FROM: "noreply@yourdomain.com"
```

## Step 3: Deploy Ghost

```yaml
# ghost-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ghost
  namespace: ghost
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ghost
  template:
    metadata:
      labels:
        app: ghost
    spec:
      containers:
        - name: ghost
          image: ghost:5-alpine
          ports:
            - containerPort: 2368
          env:
            # URL configuration
            - name: url
              value: "https://blog.yourdomain.com"
            # Database configuration
            - name: database__client
              value: "mysql"
            - name: database__connection__host
              value: "ghost-mysql.ghost.svc.cluster.local"
            - name: database__connection__port
              value: "3306"
            - name: database__connection__user
              value: "ghost"
            - name: database__connection__password
              valueFrom:
                secretKeyRef:
                  name: ghost-db-credentials
                  key: MYSQL_PASSWORD
            - name: database__connection__database
              value: "ghost_prod"
            # Mail configuration
            - name: mail__transport
              valueFrom:
                secretKeyRef:
                  name: ghost-config
                  key: MAIL_TRANSPORT
            - name: mail__options__host
              valueFrom:
                secretKeyRef:
                  name: ghost-config
                  key: MAIL_HOST
            - name: mail__options__port
              valueFrom:
                secretKeyRef:
                  name: ghost-config
                  key: MAIL_PORT
            - name: mail__options__auth__user
              valueFrom:
                secretKeyRef:
                  name: ghost-config
                  key: MAIL_USER
            - name: mail__options__auth__pass
              valueFrom:
                secretKeyRef:
                  name: ghost-config
                  key: MAIL_PASSWORD
            - name: mail__from
              valueFrom:
                secretKeyRef:
                  name: ghost-config
                  key: MAIL_FROM
            # Node environment
            - name: NODE_ENV
              value: "production"
          volumeMounts:
            - name: ghost-content
              mountPath: /var/lib/ghost/content
          resources:
            requests:
              memory: "256Mi"
              cpu: "200m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          readinessProbe:
            httpGet:
              path: /ghost/api/v4/admin/site/
              port: 2368
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /ghost/api/v4/admin/site/
              port: 2368
            initialDelaySeconds: 60
            periodSeconds: 30
      volumes:
        - name: ghost-content
          persistentVolumeClaim:
            claimName: ghost-content
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ghost-content
  namespace: ghost
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
  name: ghost
  namespace: ghost
spec:
  selector:
    app: ghost
  ports:
    - port: 80
      targetPort: 2368
  type: ClusterIP
```

```bash
kubectl apply -f ghost-config-secret.yaml
kubectl apply -f ghost-deployment.yaml
```

## Step 4: Configure Ingress with TLS

```yaml
# ghost-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ghost-ingress
  namespace: ghost
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - blog.yourdomain.com
      secretName: ghost-tls
  rules:
    - host: blog.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ghost
                port:
                  number: 80
```

```bash
kubectl apply -f ghost-ingress.yaml
```

## Step 5: Initial Setup

Once Ghost is running, access the admin panel:

```bash
# Port-forward for initial setup
kubectl port-forward svc/ghost -n ghost 2368:80

# Open http://localhost:2368/ghost in your browser
# Follow the setup wizard to create your admin account
```

## Step 6: Custom Themes

Upload custom Ghost themes through a volume or the admin panel:

```yaml
# ghost-theme-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: install-theme
  namespace: ghost
spec:
  template:
    spec:
      containers:
        - name: theme-installer
          image: alpine:3.19
          command:
            - /bin/sh
            - -c
            - |
              apk add --no-cache curl unzip
              cd /ghost-content/themes
              curl -L -o theme.zip https://github.com/your-theme/releases/download/v1.0/theme.zip
              unzip -o theme.zip
              rm theme.zip
          volumeMounts:
            - name: ghost-content
              mountPath: /ghost-content
      restartPolicy: OnFailure
      volumes:
        - name: ghost-content
          persistentVolumeClaim:
            claimName: ghost-content
```

## Backup Strategy

```yaml
# ghost-backup.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ghost-backup
  namespace: ghost
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            # Database backup
            - name: db-backup
              image: mysql:8.0
              command:
                - /bin/sh
                - -c
                - |
                  mysqldump -h ghost-mysql -u ghost -p$DB_PASSWORD ghost_prod \
                    --single-transaction > /backups/ghost-db-$(date +%Y%m%d).sql
              env:
                - name: DB_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: ghost-db-credentials
                      key: MYSQL_PASSWORD
              volumeMounts:
                - name: backup-vol
                  mountPath: /backups
            # Content backup
            - name: content-backup
              image: alpine:3.19
              command:
                - /bin/sh
                - -c
                - tar czf /backups/ghost-content-$(date +%Y%m%d).tar.gz /ghost-content/
              volumeMounts:
                - name: ghost-content
                  mountPath: /ghost-content
                  readOnly: true
                - name: backup-vol
                  mountPath: /backups
          restartPolicy: OnFailure
          volumes:
            - name: ghost-content
              persistentVolumeClaim:
                claimName: ghost-content
            - name: backup-vol
              persistentVolumeClaim:
                claimName: ghost-backup-pvc
```

## Performance Optimization

For better Ghost performance on Talos Linux:

- Use a CDN like Cloudflare in front of Ghost for static asset caching
- Configure Nginx ingress to cache static files at the edge
- Set appropriate Node.js memory limits through the `NODE_OPTIONS` environment variable
- Use MySQL connection pooling to reduce database overhead

```yaml
# Add these environment variables to the Ghost deployment
env:
  - name: NODE_OPTIONS
    value: "--max-old-space-size=256"
```

## Monitoring Ghost

Monitor Ghost health through Kubernetes metrics and application logs:

```bash
# View Ghost logs
kubectl logs -f deploy/ghost -n ghost

# Check Ghost pod resource usage
kubectl top pods -n ghost
```

## Conclusion

Ghost CMS on Talos Linux provides a professional publishing platform on a secure, modern infrastructure. The deployment is straightforward with MySQL for the database, persistent storage for content, and Kubernetes handling health checks and restarts. For production use, make sure to configure email delivery for member management, set up TLS through the ingress controller, back up both the database and content directory, and use a CDN for performance. Ghost's clean architecture makes it easy to operate on Kubernetes, and Talos Linux's immutability ensures the underlying infrastructure stays secure without constant attention.
