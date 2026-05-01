# How to Configure Drone CI with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone CI, Rancher, Kubernetes, CI/CD, Pipeline, GitOps, SUSE Rancher

Description: Learn how to deploy Drone CI on a Rancher-managed Kubernetes cluster using Helm, connect it to a Git provider, and configure Kubernetes-native pipeline runners.

---

Drone CI is a container-native continuous integration platform that runs pipeline steps in containers. Deployed on Rancher, Drone can use the Kubernetes runner to execute pipeline steps as containers inside Kubernetes Pods.

---

## Step 1: Create an OAuth Application

Before deploying Drone, create an OAuth app on your Git provider. For GitHub:

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Set Authorization callback URL to: `https://drone.example.com/login`
3. Copy the Client ID and Client Secret

---

## Step 2: Add the Drone Helm Repository

```bash
helm repo add drone https://charts.drone.io
helm repo update
```

---

## Step 3: Create the Values File

```yaml
# drone-values.yaml

image:
  tag: "2.20.0"

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: drone.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: drone-tls
      hosts:
        - drone.example.com

env:
  DRONE_GITHUB_CLIENT_ID: "your-github-client-id"
  DRONE_GITHUB_CLIENT_SECRET: "your-github-client-secret"
  DRONE_RPC_SECRET: "your-shared-rpc-secret"   # Generate: openssl rand -hex 16
  DRONE_SERVER_HOST: "drone.example.com"
  DRONE_SERVER_PROTO: "https"

persistentVolume:
  enabled: true
  storageClass: longhorn
  size: 10Gi
```

---

## Step 4: Deploy Drone Server

```bash
kubectl create namespace drone

helm install drone drone/drone \
  --namespace drone \
  --values drone-values.yaml \
  --wait

kubectl get pods -n drone
```

---

## Step 5: Deploy the Kubernetes Runner

The published `drone-runner-kube` Helm chart is deprecated, but chart version `0.1.10` is still available in `charts.drone.io`; pin the version explicitly if you use Helm.

```yaml
# drone-runner-values.yaml
image:
  repository: drone/drone-runner-kube
  tag: "1.0.0-rc.5"

rbac:
  buildNamespaces:
    - drone

env:
  DRONE_RPC_HOST: "drone.drone.svc.cluster.local:8080"
  DRONE_RPC_PROTO: "http"
  DRONE_RPC_SECRET: "your-shared-rpc-secret"    # Must match server RPC secret
  DRONE_NAMESPACE_DEFAULT: "drone"
  DRONE_RUNNER_CAPACITY: "10"                   # Max concurrent pipeline runs
```

```bash
helm install drone-runner-kube drone/drone-runner-kube \
  --namespace drone \
  --version 0.1.10 \
  --values drone-runner-values.yaml \
  --wait
```

---

## Step 6: Create a Drone Pipeline

Add a `.drone.yml` file to your repository. If you keep the deploy step, bind a service account that can update the target Deployment:

```yaml
# .drone.yml
kind: pipeline
type: kubernetes
name: default
service_account_name: drone-deployer

steps:
  - name: test
    image: golang:1.21
    commands:
      - go test ./...

  - name: build
    image: plugins/kaniko
    settings:
      registry: ghcr.io
      repo: my-org/my-app
      tags:
        - latest
        - ${DRONE_COMMIT_SHA:0:8}
      username:
        from_secret: github_username
      password:
        from_secret: github_token
    when:
      branch:
        - main

  - name: deploy
    image: bitnami/kubectl:latest
    commands:
      - kubectl set image deployment/my-app app=ghcr.io/my-org/my-app:${DRONE_COMMIT_SHA:0:8}
    when:
      branch:
        - main
```

---

## Step 7: Add Repository Secrets

```bash
# Install drone CLI
curl -L https://github.com/harness/drone-cli/releases/latest/download/drone_linux_amd64.tar.gz | tar zx
sudo install drone /usr/local/bin

# Configure CLI with a Drone user token
export DRONE_SERVER=https://drone.example.com
export DRONE_TOKEN=<your-drone-user-token>

# Add secrets to a repository
drone secret add \
  --repository my-org/my-app \
  --name github_username \
  --data myusername

drone secret add \
  --repository my-org/my-app \
  --name github_token \
  --data ghp_xxxxx
```

---

## Step 8: Enable the Repository

```bash
# Activate the repository in Drone
drone repo enable my-org/my-app

# Trigger a manual build through the Drone API
curl -X POST \
  -H "Authorization: Bearer ${DRONE_TOKEN}" \
  "${DRONE_SERVER}/api/repos/my-org/my-app/builds?branch=main"
```

---

## Best Practices

- `drone-runner-kube` executes pipeline steps as Kubernetes Pods, but the runner remains in beta and its published Helm chart is deprecated, so pin chart and image versions explicitly if you choose this path on Rancher.
- Store all secrets in Drone's secret manager or in Kubernetes Secrets - never hardcode credentials in `.drone.yml`.
- Set `DRONE_RUNNER_CAPACITY` based on your cluster's available CPU and memory to prevent pipeline runs from starving each other.
