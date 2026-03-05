# How to Store Docker Registry Credentials in Git with SOPS and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, SOPS, Docker Registry, Secrets Management, Container Registry

Description: Learn how to securely store Docker registry pull secrets in Git using SOPS encryption and have Flux CD automatically decrypt and apply them to your cluster.

---

Private container registries require authentication, which means your Kubernetes cluster needs image pull secrets. In a GitOps workflow, these credentials should be stored in Git alongside your other configurations, but never in plaintext. This guide demonstrates how to use SOPS to encrypt Docker registry credentials and let Flux CD handle the decryption automatically.

## Why Store Registry Credentials in Git?

Without GitOps, registry credentials are typically created manually with `kubectl create secret docker-registry`. This approach has problems: secrets are not version-controlled, they can be accidentally deleted, and they are difficult to replicate across clusters. By encrypting them with SOPS and storing them in Git, you get the same GitOps benefits as all your other resources.

## Prerequisites

- Flux CD bootstrapped on your cluster with SOPS decryption configured
- SOPS CLI installed locally
- An age key pair (or cloud KMS key) with the private key available to Flux

If you have not set up SOPS decryption in Flux yet, create the age key secret:

```bash
age-keygen -o age.agekey
cat age.agekey | kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin
```

Create a `.sops.yaml` in your repository root:

```yaml
creation_rules:
  - path_regex: .*secrets.*\.yaml$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

## Step 1: Generate the Docker Registry Secret Manifest

First, generate the Kubernetes Secret in YAML format without applying it:

```bash
kubectl create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username=my-username \
  --docker-password=ghp_xxxxxxxxxxxxxxxxxxxx \
  --docker-email=user@example.com \
  --namespace=my-app \
  --dry-run=client \
  -o yaml > clusters/my-cluster/secrets/ghcr-pull-secret.yaml
```

The generated file looks like:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ghcr-pull-secret
  namespace: my-app
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: eyJhdXRocyI6eyJnaGNyLmlvIjp7InVzZXJuYW1lIjoibXktdXNlcm5hbWUiLCJwYXNzd29yZCI6ImdocF94eHh4eHh4eHh4eHh4eHh4eHh4eCIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsImF1dGgiOiJiWGt0ZFhObGNtNWhiV1U2WjJod1gzaDRlSGg0ZUhoNGVIaDRlSGg0ZUhnPSJ9fX0=
```

## Step 2: Encrypt the Secret with SOPS

Encrypt the file in place:

```bash
sops --encrypt --in-place clusters/my-cluster/secrets/ghcr-pull-secret.yaml
```

After encryption, the `data` values are encrypted but the metadata remains readable:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ghcr-pull-secret
  namespace: my-app
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: ENC[AES256_GCM,data:eyJhdXRocyI6e...,iv:...,tag:...,type:str]
sops:
  age:
    - recipient: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
      enc: |
        -----BEGIN AGE ENCRYPTED FILE-----
        ...
        -----END AGE ENCRYPTED FILE-----
  lastmodified: "2026-03-05T10:00:00Z"
  version: 3.8.1
```

## Step 3: Configure Flux to Decrypt and Apply

Create or update your Kustomization to include SOPS decryption:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app-secrets
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/secrets
  prune: true
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

Commit and push the encrypted secret and the Kustomization:

```bash
git add clusters/my-cluster/secrets/ghcr-pull-secret.yaml
git add clusters/my-cluster/kustomizations/secrets.yaml
git commit -m "Add encrypted Docker registry credentials"
git push
```

## Step 4: Reference the Pull Secret in Deployments

Use the `imagePullSecrets` field in your Deployment or Pod spec:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  template:
    spec:
      imagePullSecrets:
        - name: ghcr-pull-secret
      containers:
        - name: my-app
          image: ghcr.io/my-org/my-app:v1.0.0
```

Alternatively, attach the pull secret to a service account so all pods in the namespace use it automatically:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: default
  namespace: my-app
imagePullSecrets:
  - name: ghcr-pull-secret
```

## Step 5: Handle Multiple Registries

If your application pulls images from multiple private registries, create separate secrets for each:

```bash
# Docker Hub
kubectl create secret docker-registry dockerhub-pull-secret \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=my-user \
  --docker-password=dckr_pat_xxxx \
  --namespace=my-app \
  --dry-run=client -o yaml > clusters/my-cluster/secrets/dockerhub-pull-secret.yaml

# AWS ECR
kubectl create secret docker-registry ecr-pull-secret \
  --docker-server=123456789.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password="$(aws ecr get-login-password)" \
  --namespace=my-app \
  --dry-run=client -o yaml > clusters/my-cluster/secrets/ecr-pull-secret.yaml
```

Encrypt both:

```bash
sops --encrypt --in-place clusters/my-cluster/secrets/dockerhub-pull-secret.yaml
sops --encrypt --in-place clusters/my-cluster/secrets/ecr-pull-secret.yaml
```

Reference them in your deployment:

```yaml
spec:
  template:
    spec:
      imagePullSecrets:
        - name: ghcr-pull-secret
        - name: dockerhub-pull-secret
        - name: ecr-pull-secret
```

## Step 6: Rotating Registry Credentials

When you need to rotate credentials, decrypt locally, update, and re-encrypt:

```bash
sops clusters/my-cluster/secrets/ghcr-pull-secret.yaml
```

This opens the file in your editor with decrypted values. Update the `.dockerconfigjson` value. Since it is base64-encoded JSON, you may prefer to regenerate the entire secret:

```bash
kubectl create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username=my-username \
  --docker-password=NEW_TOKEN_HERE \
  --namespace=my-app \
  --dry-run=client -o yaml > /tmp/new-secret.yaml

sops --encrypt /tmp/new-secret.yaml > clusters/my-cluster/secrets/ghcr-pull-secret.yaml
rm /tmp/new-secret.yaml
```

Commit and push. Flux will reconcile the updated secret within the next interval.

## Verification

Verify the secret was created in the cluster:

```bash
kubectl get secret ghcr-pull-secret -n my-app
kubectl get secret ghcr-pull-secret -n my-app -o jsonpath='{.type}'
```

The type should be `kubernetes.io/dockerconfigjson`. Test that images can be pulled:

```bash
kubectl run test-pull --image=ghcr.io/my-org/my-app:v1.0.0 -n my-app --dry-run=server
```

## Summary

Storing Docker registry credentials in Git with SOPS and Flux CD keeps your pull secrets version-controlled and automatically synced to your clusters. The workflow is straightforward: generate the secret manifest, encrypt it with SOPS, commit it to Git, and configure the Flux Kustomization with SOPS decryption. This approach works with any container registry and supports credential rotation through standard Git workflows.
