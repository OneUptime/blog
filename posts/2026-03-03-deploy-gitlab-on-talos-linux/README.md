# How to Deploy GitLab on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GitLab, Kubernetes, CI/CD, DevOps, Source Control

Description: Deploy GitLab on Talos Linux using the GitLab Helm chart for self-hosted source control, CI/CD pipelines, and DevOps platform management.

---

GitLab is a comprehensive DevOps platform that provides source control, CI/CD pipelines, issue tracking, container registry, and more in a single application. Self-hosting GitLab gives you full control over your code and development workflows. Running GitLab on Talos Linux adds the security benefits of an immutable OS to your development infrastructure, ensuring that the platform hosting your source code is as secure as possible.

This guide covers deploying GitLab on Talos Linux using the official GitLab Helm chart, which is the recommended approach for Kubernetes environments.

## Why GitLab on Talos Linux

Your source code is one of your most valuable assets. Running GitLab on an immutable, API-driven OS like Talos Linux reduces the risk of infrastructure-level compromise. There is no SSH access to the host, no way to install unauthorized software, and no configuration drift. Combined with GitLab's built-in security scanning and access controls, you get a development platform with security built into every layer.

## Prerequisites

- Talos Linux cluster with at least four worker nodes (GitLab is resource-intensive)
- Worker nodes with at least 8GB RAM each
- `kubectl`, `talosctl`, and `helm` installed
- A domain name with wildcard DNS configured
- At least 100GB of storage available
- A TLS certificate (cert-manager recommended)

## Step 1: Prepare Talos Linux

GitLab has several components that benefit from tuned kernel parameters:

```yaml
# talos-gitlab-patch.yaml
machine:
  sysctls:
    vm.max_map_count: "262144"
    net.core.somaxconn: "4096"
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/lib/gitlab-data
```

```bash
talosctl apply-config --nodes 10.0.0.2,10.0.0.3,10.0.0.4,10.0.0.5 \
  --file talos-gitlab-patch.yaml
```

## Step 2: Install Prerequisites

GitLab needs an Ingress controller and cert-manager:

```bash
# Install Nginx Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.replicaCount=2

# Install cert-manager for automatic TLS
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml
```

## Step 3: Configure GitLab Helm Values

```yaml
# gitlab-values.yaml
global:
  hosts:
    domain: yourdomain.com
    https: true
  ingress:
    configureCertmanager: false
    class: nginx
    tls:
      enabled: true
  # Use external PostgreSQL for production
  psql:
    host: gitlab-postgres.gitlab.svc.cluster.local
    port: 5432
    database: gitlabhq_production
    username: gitlab
    password:
      secret: gitlab-postgres-secret
      key: password
  # Use external Redis for production
  redis:
    host: gitlab-redis.gitlab.svc.cluster.local
    port: 6379
    password:
      enabled: true
      secret: gitlab-redis-secret
      key: password
  # MinIO for object storage
  minio:
    enabled: true
  time_zone: UTC
  email:
    from: "gitlab@yourdomain.com"
    reply_to: "noreply@yourdomain.com"

# GitLab component configurations
gitlab:
  webservice:
    replicas: 2
    resources:
      requests:
        memory: 2Gi
        cpu: 500m
      limits:
        memory: 4Gi
    workerProcesses: 2
  sidekiq:
    replicas: 1
    resources:
      requests:
        memory: 1Gi
        cpu: 500m
      limits:
        memory: 2Gi
  gitaly:
    persistence:
      size: 100Gi
      storageClass: local-path
    resources:
      requests:
        memory: 512Mi
        cpu: 300m
  toolbox:
    backups:
      cron:
        enabled: true
        schedule: "0 2 * * *"
        persistence:
          enabled: true
          storageClass: local-path
          size: 50Gi
  kas:
    enabled: true
  gitlab-shell:
    minReplicas: 1

# Registry configuration
registry:
  enabled: true
  storage:
    secret: registry-storage
    key: config

# GitLab Runner for CI/CD
gitlab-runner:
  install: true
  runners:
    privileged: false
    config: |
      [[runners]]
        [runners.kubernetes]
          image = "ubuntu:22.04"
          privileged = false
          namespace = "gitlab"
          cpu_limit = "2"
          memory_limit = "4Gi"
          service_cpu_limit = "1"
          service_memory_limit = "2Gi"

# Prometheus monitoring
prometheus:
  install: false

# Disable built-in PostgreSQL and Redis (we use external)
postgresql:
  install: false
redis:
  install: false

# Nginx ingress (we use external)
nginx-ingress:
  enabled: false
certmanager:
  install: false
```

## Step 4: Deploy External PostgreSQL

```yaml
# gitlab-postgres.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: gitlab
---
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-postgres-secret
  namespace: gitlab
type: Opaque
stringData:
  password: "gitlab-db-secure-password"
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: gitlab-postgres
  namespace: gitlab
spec:
  serviceName: gitlab-postgres
  replicas: 1
  selector:
    matchLabels:
      app: gitlab-postgres
  template:
    metadata:
      labels:
        app: gitlab-postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: "gitlabhq_production"
            - name: POSTGRES_USER
              value: "gitlab"
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: gitlab-postgres-secret
                  key: password
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
              subPath: pgdata
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: local-path
        resources:
          requests:
            storage: 50Gi
---
apiVersion: v1
kind: Service
metadata:
  name: gitlab-postgres
  namespace: gitlab
spec:
  selector:
    app: gitlab-postgres
  ports:
    - port: 5432
  clusterIP: None
```

## Step 5: Deploy External Redis

```yaml
# gitlab-redis.yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-redis-secret
  namespace: gitlab
type: Opaque
stringData:
  password: "gitlab-redis-password"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gitlab-redis
  namespace: gitlab
spec:
  replicas: 1
  selector:
    matchLabels:
      app: gitlab-redis
  template:
    metadata:
      labels:
        app: gitlab-redis
    spec:
      containers:
        - name: redis
          image: redis:7.2-alpine
          ports:
            - containerPort: 6379
          command:
            - redis-server
            - --requirepass
            - "gitlab-redis-password"
            - --maxmemory
            - "1gb"
            - --maxmemory-policy
            - allkeys-lru
          resources:
            requests:
              memory: "1Gi"
              cpu: "250m"
            limits:
              memory: "1Gi"
---
apiVersion: v1
kind: Service
metadata:
  name: gitlab-redis
  namespace: gitlab
spec:
  selector:
    app: gitlab-redis
  ports:
    - port: 6379
```

## Step 6: Install GitLab

```bash
# Add the GitLab Helm repository
helm repo add gitlab https://charts.gitlab.io/
helm repo update

# Deploy the external dependencies first
kubectl apply -f gitlab-postgres.yaml
kubectl apply -f gitlab-redis.yaml

# Wait for dependencies to be ready
kubectl rollout status statefulset/gitlab-postgres -n gitlab
kubectl rollout status deployment/gitlab-redis -n gitlab

# Install GitLab
helm install gitlab gitlab/gitlab \
  --namespace gitlab \
  --values gitlab-values.yaml \
  --timeout 600s
```

## Step 7: Access GitLab

```bash
# Get the initial root password
kubectl get secret gitlab-gitlab-initial-root-password -n gitlab \
  -o jsonpath='{.data.password}' | base64 --decode

# Check that all pods are running
kubectl get pods -n gitlab

# Access GitLab at https://gitlab.yourdomain.com
```

## Step 8: Configure GitLab Runner

The GitLab Runner handles CI/CD job execution:

```yaml
# runner-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: gitlab-runner-config
  namespace: gitlab
data:
  config.toml: |
    concurrent = 10
    check_interval = 3

    [[runners]]
      name = "talos-runner"
      url = "https://gitlab.yourdomain.com"
      executor = "kubernetes"
      [runners.kubernetes]
        namespace = "gitlab"
        image = "alpine:3.19"
        privileged = false
        cpu_limit = "2"
        memory_limit = "4Gi"
        service_cpu_limit = "1"
        service_memory_limit = "2Gi"
        poll_timeout = 600
        [runners.kubernetes.pod_security_context]
          run_as_non_root = true
          run_as_user = 1000
```

## Monitoring GitLab

Monitor GitLab health through its built-in endpoints:

```bash
# Check GitLab health
kubectl exec -it deploy/gitlab-webservice -n gitlab -- \
  curl -s http://localhost:8080/-/health

# Check readiness
kubectl exec -it deploy/gitlab-webservice -n gitlab -- \
  curl -s http://localhost:8080/-/readiness

# View Sidekiq queues
kubectl exec -it deploy/gitlab-sidekiq -n gitlab -- \
  bundle exec rails runner "puts Sidekiq::Stats.new.inspect"
```

## Backup and Restore

GitLab backups are configured in the Helm values. Verify they run:

```bash
# Trigger a manual backup
kubectl exec -it deploy/gitlab-toolbox -n gitlab -- \
  backup-utility --skip registry

# List backups
kubectl exec -it deploy/gitlab-toolbox -n gitlab -- \
  ls -la /srv/gitlab/tmp/backups/
```

## Resource Planning

GitLab is resource-intensive. Here is a rough guide:

- Up to 100 users: 4 nodes with 8GB RAM each
- Up to 500 users: 6 nodes with 16GB RAM each
- Up to 2000 users: 8+ nodes with 32GB RAM each

The main resource consumers are Gitaly (Git storage), Sidekiq (background jobs), and the web service (Rails application).

## Conclusion

GitLab on Talos Linux provides a self-hosted DevOps platform on the most secure Kubernetes OS available. The deployment is complex due to GitLab's many components, but the Helm chart handles orchestration effectively. Key considerations for production include external PostgreSQL and Redis for reliability, adequate storage for Git repositories and CI artifacts, regular automated backups, and proper resource allocation based on your team size. With GitLab running on Talos Linux, your development infrastructure benefits from both GitLab's comprehensive DevOps features and Talos Linux's immutable security model.
