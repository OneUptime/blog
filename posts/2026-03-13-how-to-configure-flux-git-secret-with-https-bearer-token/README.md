# How to Configure Flux Git Secret with HTTPS Bearer Token

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Source Controller, Authentication, Secrets, HTTPS, Bearer Token, Git

Description: A guide to configuring Flux CD Source Controller to authenticate with Git repositories using an HTTPS bearer token.

---

## Introduction

Flux CD supports bearer token authentication for HTTPS Git repositories. This method is useful when your Git provider or identity system issues tokens that should be passed as HTTP bearer credentials rather than as basic auth username/password pairs. Bearer tokens are common with Azure DevOps, GitHub fine-grained tokens, and enterprise identity providers.

In this guide, you will learn how to create a Kubernetes Secret with a bearer token and configure a Flux `GitRepository` resource to use it.

## Prerequisites

- A Kubernetes cluster (v1.20 or later)
- Flux CD installed on your cluster (v2.x)
- `kubectl` configured to communicate with your cluster
- A bearer token from your Git provider or identity system

## Step 1: Obtain a Bearer Token

How you obtain a bearer token depends on your Git provider:

### Azure DevOps

Generate a Personal Access Token (PAT) from Azure DevOps:

1. Go to User Settings > Personal Access Tokens.
2. Create a new token with Code (Read) scope.
3. Copy the generated token.

### GitHub (Fine-Grained Tokens)

1. Go to Settings > Developer settings > Personal access tokens > Fine-grained tokens.
2. Create a new token with repository access.
3. Copy the generated token.

### Custom Identity Provider

If your organization uses an OAuth2 or OIDC provider, obtain a token using your provider's flow:

```bash
TOKEN=$(curl -s -X POST https://auth.example.com/oauth/token \
  -d "grant_type=client_credentials" \
  -d "client_id=your-client-id" \
  -d "client_secret=your-client-secret" \
  -d "scope=repository:read" | jq -r '.access_token')
```

## Step 2: Create the Kubernetes Secret

Create a Secret containing the bearer token. The key must be named `bearerToken`:

```bash
kubectl create secret generic git-bearer-token \
  --namespace=flux-system \
  --from-literal=bearerToken=your-bearer-token-here
```

As a YAML manifest:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-bearer-token
  namespace: flux-system
type: Opaque
stringData:
  bearerToken: your-bearer-token-here
```

Apply the manifest:

```bash
kubectl apply -f git-bearer-token-secret.yaml
```

## Step 3: Configure the GitRepository Resource

Reference the Secret in your `GitRepository` resource:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://dev.azure.com/your-org/your-project/_git/your-repo
  ref:
    branch: main
  secretRef:
    name: git-bearer-token
```

Apply the resource:

```bash
kubectl apply -f gitrepository.yaml
```

When Flux detects a `bearerToken` field in the Secret, it uses the token as an HTTP `Authorization: Bearer <token>` header instead of basic auth.

## Step 4: Handle Token Rotation

Bearer tokens often have expiration times. You can update the token without downtime by patching the Secret:

```bash
kubectl create secret generic git-bearer-token \
  --namespace=flux-system \
  --from-literal=bearerToken=new-bearer-token-here \
  --dry-run=client -o yaml | kubectl apply -f -
```

Then force a reconciliation:

```bash
flux reconcile source git my-app
```

For automated token rotation, consider using a CronJob or an external secrets operator:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rotate-git-token
  namespace: flux-system
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: token-rotator
          containers:
          - name: rotator
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              TOKEN=$(curl -s -X POST https://auth.example.com/oauth/token \
                -d "grant_type=client_credentials" \
                -d "client_id=$CLIENT_ID" \
                -d "client_secret=$CLIENT_SECRET" | jq -r '.access_token')
              kubectl create secret generic git-bearer-token \
                --namespace=flux-system \
                --from-literal=bearerToken=$TOKEN \
                --dry-run=client -o yaml | kubectl apply -f -
            envFrom:
            - secretRef:
                name: token-rotator-credentials
          restartPolicy: OnFailure
```

## Verification

Check the `GitRepository` status:

```bash
flux get sources git my-app
```

View detailed information:

```bash
kubectl describe gitrepository my-app -n flux-system
```

Verify the Secret contains the expected token:

```bash
kubectl get secret git-bearer-token -n flux-system -o jsonpath='{.data.bearerToken}' | base64 -d
```

## Troubleshooting

### 401 Unauthorized

If you see authentication errors:

1. Verify the token has not expired.
2. Confirm the token has the necessary scopes for repository access.
3. Check that the Secret key is named exactly `bearerToken` (case-sensitive).

### 403 Forbidden

If authentication succeeds but access is denied:

1. Verify the token's scopes include read access to the specific repository.
2. Check if IP-based restrictions are blocking your cluster's egress IP.
3. Ensure the token belongs to a user or service account with access to the repository.

### Token vs Basic Auth Confusion

Flux uses different authentication methods based on which keys exist in the Secret:

- `username` + `password`: Basic authentication
- `bearerToken`: Bearer token authentication

Do not mix both in the same Secret. If both are present, the behavior may be unpredictable.

## Summary

Bearer token authentication with Flux provides a flexible way to authenticate with Git repositories, especially when working with Azure DevOps, fine-grained tokens, or enterprise identity providers. The key considerations are using the correct Secret key name (`bearerToken`), managing token expiration, and implementing automated rotation for short-lived tokens.
