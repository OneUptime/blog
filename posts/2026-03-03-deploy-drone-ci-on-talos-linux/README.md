# How to Deploy Drone CI on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Drone CI, CI/CD, Kubernetes, DevOps

Description: A practical guide to deploying Drone CI on Talos Linux with Kubernetes runners for automated build pipelines and continuous integration workflows.

---

Drone CI is a lightweight, container-native CI/CD platform that uses a simple YAML configuration file to define pipelines. Each step in a Drone pipeline runs in its own container, making builds isolated and reproducible. When deployed on Talos Linux, Drone benefits from the immutable, secure operating system while leveraging Kubernetes for dynamic scaling of build workloads.

This guide covers deploying Drone CI on Talos Linux, configuring the Kubernetes runner, connecting it to your Git provider, and setting up your first pipeline.

## Why Drone CI on Talos Linux

Drone CI is designed to be simple. The configuration lives in a single .drone.yml file in your repository, and each pipeline step is a container. There is no plugin system to maintain, no complex web interface to configure, and no state beyond what is in Git. This simplicity aligns well with the Talos Linux philosophy of reducing moving parts and operational complexity.

Drone's Kubernetes runner creates pods for each build, using the cluster's resources efficiently. Builds scale up when there is work to do and consume nothing when idle.

## Prerequisites

Before deploying Drone, you need:

- A Talos Linux cluster with kubectl configured
- Helm v3 installed
- A Git provider account (GitHub, GitLab, Gitea, or Bitbucket)
- An OAuth application configured on your Git provider
- A domain name for the Drone server
- A StorageClass for persistent volumes

## Creating an OAuth Application

For GitHub, create an OAuth application at Settings > Developer settings > OAuth Apps.

Set the authorization callback URL to: `https://drone.example.com/login`

Note the Client ID and Client Secret - you will need them for the deployment.

## Deploying Drone Server

Create the necessary secrets first.

```bash
# Create the namespace
kubectl create namespace drone

# Generate a shared secret for communication between server and runners
DRONE_RPC_SECRET=$(openssl rand -hex 16)

# Create the secrets
kubectl create secret generic drone-secrets \
  --namespace drone \
  --from-literal=DRONE_GITHUB_CLIENT_ID="your-github-client-id" \
  --from-literal=DRONE_GITHUB_CLIENT_SECRET="your-github-client-secret" \
  --from-literal=DRONE_RPC_SECRET="${DRONE_RPC_SECRET}" \
  --from-literal=DRONE_DATABASE_SECRET=$(openssl rand -hex 16)
```

Deploy the Drone server.

```yaml
# drone-server.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: drone-server
  namespace: drone
spec:
  replicas: 1
  selector:
    matchLabels:
      app: drone-server
  template:
    metadata:
      labels:
        app: drone-server
    spec:
      containers:
        - name: drone
          image: drone/drone:2
          ports:
            - containerPort: 80
              name: http
            - containerPort: 443
              name: https
          env:
            # Server configuration
            - name: DRONE_SERVER_HOST
              value: "drone.example.com"
            - name: DRONE_SERVER_PROTO
              value: "https"

            # GitHub integration
            - name: DRONE_GITHUB_CLIENT_ID
              valueFrom:
                secretKeyRef:
                  name: drone-secrets
                  key: DRONE_GITHUB_CLIENT_ID
            - name: DRONE_GITHUB_CLIENT_SECRET
              valueFrom:
                secretKeyRef:
                  name: drone-secrets
                  key: DRONE_GITHUB_CLIENT_SECRET

            # RPC secret for runner communication
            - name: DRONE_RPC_SECRET
              valueFrom:
                secretKeyRef:
                  name: drone-secrets
                  key: DRONE_RPC_SECRET

            # Database configuration (SQLite by default)
            - name: DRONE_DATABASE_DRIVER
              value: "sqlite3"
            - name: DRONE_DATABASE_DATASOURCE
              value: "/data/database.sqlite"

            # User administration
            - name: DRONE_USER_CREATE
              value: "username:yourgithubusername,admin:true"

          volumeMounts:
            - name: data
              mountPath: /data
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 1
              memory: 512Mi
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: drone-data

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: drone-data
  namespace: drone
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: local-path

---
apiVersion: v1
kind: Service
metadata:
  name: drone-server
  namespace: drone
spec:
  selector:
    app: drone-server
  ports:
    - name: http
      port: 80
      targetPort: 80
```

```bash
# Deploy the server
kubectl apply -f drone-server.yaml

# Verify the server is running
kubectl get pods -n drone
```

## Deploying the Kubernetes Runner

The Kubernetes runner creates pods in your cluster to execute pipeline steps.

```yaml
# drone-runner.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: drone-runner-kube
  namespace: drone
spec:
  replicas: 1
  selector:
    matchLabels:
      app: drone-runner-kube
  template:
    metadata:
      labels:
        app: drone-runner-kube
    spec:
      serviceAccountName: drone-runner
      containers:
        - name: runner
          image: drone/drone-runner-kube:latest
          env:
            - name: DRONE_RPC_HOST
              value: "drone-server.drone.svc:80"
            - name: DRONE_RPC_PROTO
              value: "http"
            - name: DRONE_RPC_SECRET
              valueFrom:
                secretKeyRef:
                  name: drone-secrets
                  key: DRONE_RPC_SECRET
            - name: DRONE_NAMESPACE_DEFAULT
              value: "drone"
            # Maximum concurrent builds
            - name: DRONE_RUNNER_CAPACITY
              value: "10"
            - name: DRONE_RUNNER_NAME
              value: "kube-runner"
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
```

Create the RBAC resources for the runner.

```yaml
# drone-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: drone-runner
  namespace: drone

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: drone-runner
  namespace: drone
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["create", "delete"]
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "create", "delete", "list", "watch", "update"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: drone-runner
  namespace: drone
subjects:
  - kind: ServiceAccount
    name: drone-runner
    namespace: drone
roleRef:
  kind: Role
  name: drone-runner
  apiGroup: rbac.authorization.k8s.io
```

```bash
# Deploy the RBAC resources and runner
kubectl apply -f drone-rbac.yaml
kubectl apply -f drone-runner.yaml

# Verify the runner is connected
kubectl logs -n drone -l app=drone-runner-kube
```

## Setting Up Ingress

Expose Drone through an ingress controller.

```yaml
# drone-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: drone
  namespace: drone
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - drone.example.com
      secretName: drone-tls
  rules:
    - host: drone.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: drone-server
                port:
                  number: 80
```

## Writing Drone Pipelines

Create a `.drone.yml` file in your repository root.

```yaml
# .drone.yml
kind: pipeline
type: kubernetes
name: build-and-test

steps:
  # Step 1: Run tests
  - name: test
    image: golang:1.22
    commands:
      - go mod download
      - go test -v -race ./...

  # Step 2: Build the binary
  - name: build
    image: golang:1.22
    commands:
      - go build -o app ./cmd/server
    depends_on:
      - test

  # Step 3: Build and push Docker image
  - name: publish
    image: plugins/docker
    settings:
      repo: registry.example.com/myapp
      tags:
        - latest
        - ${DRONE_COMMIT_SHA:0:8}
      username:
        from_secret: docker_username
      password:
        from_secret: docker_password
    depends_on:
      - build
    when:
      branch:
        - main

  # Step 4: Deploy to Kubernetes
  - name: deploy
    image: bitnami/kubectl:latest
    commands:
      - kubectl set image deployment/myapp app=registry.example.com/myapp:${DRONE_COMMIT_SHA:0:8} -n production
    depends_on:
      - publish
    when:
      branch:
        - main

---
# Separate pipeline for pull requests
kind: pipeline
type: kubernetes
name: pull-request

steps:
  - name: test
    image: golang:1.22
    commands:
      - go mod download
      - go test -v -race ./...

  - name: lint
    image: golangci/golangci-lint:latest
    commands:
      - golangci-lint run ./...

trigger:
  event:
    - pull_request
```

## Managing Secrets in Drone

Add secrets through the Drone UI or CLI.

```bash
# Install the Drone CLI
# On macOS
brew install drone-cli

# Configure the CLI
export DRONE_SERVER=https://drone.example.com
export DRONE_TOKEN=your-personal-token

# Add a secret to a repository
drone secret add \
  --repository myorg/myapp \
  --name docker_username \
  --data your-docker-username

drone secret add \
  --repository myorg/myapp \
  --name docker_password \
  --data your-docker-password
```

## Resource Limits for Build Pods

Control the resources allocated to build containers.

```yaml
# .drone.yml with resource limits
kind: pipeline
type: kubernetes
name: build

steps:
  - name: build
    image: golang:1.22
    commands:
      - go build ./...
    resources:
      requests:
        cpu: 500
        memory: 512MiB
      limits:
        cpu: 2000
        memory: 2GiB
```

## Wrapping Up

Drone CI on Talos Linux provides a lightweight, container-native CI/CD experience. The simplicity of Drone's configuration model, where everything is defined in a single YAML file, makes it easy to understand and maintain. The Kubernetes runner integrates naturally with your Talos cluster, creating build pods on demand and cleaning them up automatically. With proper secrets management, resource limits, and ingress configuration, Drone becomes a reliable CI/CD platform that stays out of your way while keeping your builds fast and secure.
