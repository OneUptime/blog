# How to Integrate GitHub Actions with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Action, Rancher, Kubernetes, CI/CD, DevOps, Automation, Deployment

Description: Learn how to connect GitHub Actions workflows to a Rancher-managed Kubernetes cluster for automated container builds and deployments using kubeconfig secrets.

---

GitHub Actions is one of the most widely used CI/CD platforms, and pairing it with Rancher gives you an automated path from code commit to running workload on Kubernetes.

---

## Prerequisites

- Rancher v2.9+ managing at least one downstream cluster
- GitHub repository with Actions enabled
- `kubectl` access to the cluster

---

## Step 1: Generate a Scoped Kubeconfig from Rancher

Create a dedicated service account and extract a kubeconfig file for use in GitHub Actions.

```bash
# Create namespace and service account

kubectl create namespace my-app
kubectl create serviceaccount github-deploy -n my-app

# Bind the edit role to the service account
kubectl create rolebinding github-deploy-binding \
  --clusterrole=edit \
  --serviceaccount=my-app:github-deploy \
  --namespace=my-app

# Create a long-lived token Secret (Kubernetes 1.24+)
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: github-deploy-token
  namespace: my-app
  annotations:
    kubernetes.io/service-account.name: github-deploy
type: kubernetes.io/service-account-token
EOF
```

Build a minimal kubeconfig and base64-encode it for storage in GitHub Secrets:

```bash
TOKEN_B64=""
until [ -n "$TOKEN_B64" ]; do
  TOKEN_B64=$(kubectl get secret github-deploy-token -n my-app \
    -o jsonpath='{.data.token}')
  [ -n "$TOKEN_B64" ] || sleep 1
done

TOKEN=$(printf '%s' "$TOKEN_B64" | base64 -d)

SERVER=$(kubectl config view --raw --flatten --minify \
  -o jsonpath='{.clusters[0].cluster.server}')
CA_DATA=$(kubectl config view --raw --flatten --minify \
  -o jsonpath='{.clusters[0].cluster.certificate-authority-data}')

cat <<EOF | base64 | tr -d '\n' > kubeconfig.b64
apiVersion: v1
kind: Config
clusters:
- cluster:
    server: $SERVER
    certificate-authority-data: $CA_DATA
  name: rancher
contexts:
- context:
    cluster: rancher
    namespace: my-app
    user: github-deploy
  name: rancher
current-context: rancher
users:
- name: github-deploy
  user:
    token: $TOKEN
EOF
```

---

## Step 2: Add the Kubeconfig to GitHub Secrets

In your GitHub repository go to **Settings > Secrets and variables > Actions** and add:

- `KUBECONFIG_DATA` - the base64 content of `kubeconfig.b64`

This workflow pushes to GitHub Container Registry using the repository `GITHUB_TOKEN`, so no extra registry secret is required.

---

## Step 3: Write the GitHub Actions Workflow

This workflow builds and pushes a Docker image to GitHub Container Registry, then updates an existing Deployment in the Rancher cluster:

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy to Rancher

on:
  push:
    branches: [main]

env:
  IMAGE: ghcr.io/${{ github.repository }}:${{ github.sha }}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v6

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v7
        with:
          context: .
          push: true
          tags: ${{ env.IMAGE }}

  deploy:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Set up kubectl
        uses: azure/setup-kubectl@v4

      - name: Write kubeconfig
        run: |
          # Decode the stored kubeconfig to disk
          echo "${{ secrets.KUBECONFIG_DATA }}" | base64 -d > /tmp/kubeconfig
          chmod 600 /tmp/kubeconfig

      - name: Deploy to Rancher cluster
        env:
          KUBECONFIG: /tmp/kubeconfig
        run: |
          # Update the container image. The container name on the left
          # must match the Deployment spec.
          kubectl set image deployment/my-app \
            my-app=${{ env.IMAGE }} \
            -n my-app
          # Block until rollout finishes or times out
          kubectl rollout status deployment/my-app \
            -n my-app \
            --timeout=5m
```

---

## Step 4: Add a Smoke Test Step

After deploying, run a basic health check before marking the job successful:

```yaml
      - name: Smoke test
        env:
          KUBECONFIG: /tmp/kubeconfig
        run: |
          # Wait for at least one ready pod
          kubectl wait pod \
            -l app=my-app \
            -n my-app \
            --for=condition=Ready \
            --timeout=120s
```

---

## Best Practices

- Use **GitHub Environments** with required reviewers for production deployments.
- Limit the service account to only the namespaces it needs - never use `cluster-admin`.
- Rotate the kubeconfig secret on a schedule using GitHub Actions itself or a secrets manager.
- Store image digests (not tags) in production manifests for deterministic deploys.
