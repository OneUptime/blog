# How to Configure Init Containers in Kubernetes via Portainer - K8s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Init Container, Configuration, DevOps

Description: Use Kubernetes init containers to perform setup tasks before main application containers start in Portainer-managed clusters.

## Introduction

Init containers are specialized containers that run to completion before app containers start. They perform one-time setup tasks like database migrations, configuration generation, dependency checks, and secret fetching. Portainer's web editor supports deploying manifests with init containers.

## Common Init Container Use Cases

- Database schema migrations
- Waiting for dependent services to be ready
- Downloading configuration files
- Setting file permissions
- Fetching secrets from external stores

## Init Container Examples

```yaml
# init-containers-demo.yml - deploy via Portainer

apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      initContainers:
      # Init 1: Wait for database to be ready
      - name: wait-for-db
        image: busybox:1.36
        command:
        - sh
        - -c
        - |
          until nc -z postgres.production.svc.cluster.local 5432; do
            echo "Waiting for PostgreSQL...";
            sleep 2;
          done;
          echo "PostgreSQL is ready!"
        
      # Init 2: Run database migrations
      - name: db-migrate
        image: myapp:latest
        command: ["python", "manage.py", "migrate"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        
      # Init 3: Download configuration from S3
      - name: fetch-config
        image: amazon/aws-cli:latest
        command:
        - sh
        - -c
        - |
          aws s3 cp s3://my-configs/app-config.json /shared-config/
          echo "Config downloaded"
        volumeMounts:
        - name: config-volume
          mountPath: /shared-config
        env:
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: access-key
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: secret-key
      
      containers:
      # Main application container
      - name: web-app
        image: myapp:latest
        ports:
        - containerPort: 8080
        volumeMounts:
        - name: config-volume
          mountPath: /app/config
          readOnly: true
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
      
      volumes:
      - name: config-volume
        emptyDir: {}
```

## Init Container for Permission Setup

```yaml
initContainers:
- name: fix-permissions
  image: busybox
  command:
  - sh
  - -c
  - "chown -R 1000:1000 /data && chmod -R 755 /data"
  volumeMounts:
  - name: data
    mountPath: /data
  securityContext:
    runAsUser: 0  # Run as root to change permissions
```

## Waiting for Multiple Services

```yaml
initContainers:
- name: wait-for-postgres
  image: busybox:1.36
  command:
  - sh
  - -c
  - |
    until nc -z postgres 5432; do
      echo "Waiting for postgres...";
      sleep 2;
    done;
- name: wait-for-redis
  image: busybox:1.36
  command:
  - sh
  - -c
  - |
    until nc -z redis 6379; do
      echo "Waiting for redis...";
      sleep 2;
    done;
- name: wait-for-kafka
  image: busybox:1.36
  command:
  - sh
  - -c
  - |
    until nc -z kafka 9092; do
      echo "Waiting for kafka...";
      sleep 2;
    done;
```

## Init Containers with Vault Secrets

```yaml
initContainers:
- name: vault-init
  image: hashicorp/vault:latest
  command:
  - sh
  - -c
  - |
    vault agent -config=/vault/config/agent.hcl -exit-after-auth
    cp /vault/secrets/* /app-secrets/
  volumeMounts:
  - name: vault-config
    mountPath: /vault/config
  - name: app-secrets
    mountPath: /app-secrets
```

## Monitoring Init Containers in Portainer

In Portainer: open **Applications**, select your deployment, then use the pod logs from the **Application containers** section.

Select the init container from the container dropdown to view its logs.

```bash
# View init container logs
kubectl logs web-app-pod-xyz -c wait-for-db
kubectl logs web-app-pod-xyz -c db-migrate

# Check init container status
kubectl describe pod web-app-pod-xyz | grep -A5 "Init Containers"
```

## Conclusion

Init containers deployed via Portainer provide a clean pattern for application dependencies and setup. They run sequentially, each must succeed before the next starts, and all must complete before app containers begin. This guarantees proper initialization order-migrations run before the app, configs are available before startup, and dependencies are ready before the application connects.
