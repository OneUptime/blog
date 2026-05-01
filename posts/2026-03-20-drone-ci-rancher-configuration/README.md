# How to Configure Drone CI with Rancher - Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone CI, Rancher, Kubernetes, CI/CD, DevOps, Pipeline, Container

Description: Learn how to deploy Drone CI on a Rancher-managed Kubernetes cluster and configure pipelines to build, test, and deploy containerized applications automatically.

---

Drone CI is a lightweight, container-native CI system that can run entirely on Kubernetes. This guide shows how to install Drone on Rancher and configure it for automated container deployments.

---

## Step 1: Create a GitHub OAuth Application

In GitHub, navigate to **Settings > Developer settings > OAuth Apps > New OAuth App**:

- **Homepage URL**: `https://drone.example.com`
- **Authorization callback URL**: `https://drone.example.com/login`

Note the **Client ID** and **Client Secret**.

---

## Step 2: Deploy Drone Server via Helm

```bash
helm repo add drone https://charts.drone.io
helm repo update

# Create a namespace for Drone

kubectl create namespace drone

# Create a secret with Drone credentials
kubectl create secret generic drone-secrets \
  --namespace drone \
  --from-literal=DRONE_GITHUB_CLIENT_ID=<your-client-id> \
  --from-literal=DRONE_GITHUB_CLIENT_SECRET=<your-client-secret> \
  --from-literal=DRONE_RPC_SECRET=$(openssl rand -hex 16)
```

Install the Drone server Helm chart with values that point to the secrets:

```yaml
# drone-values.yaml
env:
  DRONE_SERVER_HOST: drone.example.com
  DRONE_SERVER_PROTO: https
  DRONE_GITHUB_SERVER: https://github.com

# Reference credentials from the Kubernetes secret
extraSecretNamesForEnvFrom:
  - drone-secrets

persistentVolume:
  enabled: true
  size: 10Gi
```

```bash
helm install drone drone/drone \
  --namespace drone \
  --values drone-values.yaml
```

---

## Step 3: Deploy Drone Kubernetes Runner

The Kubernetes runner executes each pipeline step as a pod. Install it with Kubernetes manifests and keep the runner and pipeline pods in the `drone` namespace:

```bash
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: ServiceAccount
metadata:
  name: drone-runner-kube
  namespace: drone
---
kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: drone-runner-kube
  namespace: drone
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["create", "delete"]
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "create", "delete", "list", "watch", "update"]
---
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: drone-runner-kube
  namespace: drone
subjects:
  - kind: ServiceAccount
    name: drone-runner-kube
    namespace: drone
roleRef:
  kind: Role
  name: drone-runner-kube
  apiGroup: rbac.authorization.k8s.io
---
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
      serviceAccountName: drone-runner-kube
      containers:
        - name: runner
          image: drone/drone-runner-kube:latest
          env:
            - name: DRONE_RPC_HOST
              value: drone.drone.svc.cluster.local:8080
            - name: DRONE_RPC_PROTO
              value: http
            - name: DRONE_RPC_SECRET
              valueFrom:
                secretKeyRef:
                  name: drone-secrets
                  key: DRONE_RPC_SECRET
            - name: DRONE_NAMESPACE_DEFAULT
              value: drone
EOF
```

---

## Step 4: Write a Drone Pipeline

Drone pipelines are defined in `.drone.yml` at the root of your repository. Each step runs in its own container:

```yaml
# .drone.yml
kind: pipeline
type: kubernetes
name: default

# Runs on every push to main
trigger:
  branch:
    - main
  event:
    - push

steps:
  - name: test
    image: golang:1.22
    commands:
      # Run unit tests
      - go test ./...

  - name: build-image
    image: plugins/docker
    settings:
      # Push to Docker Hub using Drone secrets
      username:
        from_secret: docker_username
      password:
        from_secret: docker_password
      repo: my-org/my-app
      tags:
        - latest
        - ${DRONE_COMMIT_SHA:0:8}

  - name: deploy
    image: bitnami/kubectl:latest
    environment:
      KUBE_TOKEN:
        from_secret: kube_token
      KUBE_SERVER:
        from_secret: kube_server
    commands:
      # Configure kubectl and roll out new image
      - kubectl config set-cluster rancher --server=$KUBE_SERVER --insecure-skip-tls-verify=true
      - kubectl config set-credentials drone --token=$KUBE_TOKEN
      - kubectl config set-context rancher --cluster=rancher --user=drone
      - kubectl config use-context rancher
      - kubectl set image deployment/my-app app=my-org/my-app:${DRONE_COMMIT_SHA:0:8} -n my-app
      - kubectl rollout status deployment/my-app -n my-app
```

---

## Step 5: Add Secrets in Drone UI

In the Drone UI, go to your repository settings and add repository secrets. If you want shared secrets across repositories, create organization secrets separately with the Drone CLI or API:

- `docker_username` / `docker_password`
- `kube_token` - a Kubernetes API bearer token with permission to update the target deployment
- `kube_server` - Kubernetes API URL for the Rancher-managed cluster

---

## Best Practices

- Use **per-repo secrets** for application credentials and **org-level secrets** for shared infrastructure tokens.
- Set resource limits on the Kubernetes runner so pipeline pods don't starve production workloads.
- Keep secrets unavailable to pull requests from forks; Drone repository secrets are not exposed to pull requests by default.
