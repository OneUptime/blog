# How to Configure Git Credentials for Azure DevOps Repos in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Azure DevOps, Repository Management

Description: Learn how to connect ArgoCD to Azure DevOps Repos using personal access tokens, SSH keys, and managed identities for deploying Kubernetes applications.

---

Azure DevOps Repos is Microsoft's Git hosting service used by many organizations, especially those already invested in the Azure ecosystem. Connecting ArgoCD to Azure DevOps requires understanding its unique URL formats and authentication options. This guide walks through every method and the common pitfalls you might encounter.

## Azure DevOps URL Formats

Azure DevOps has two URL formats you need to be aware of:

```
# New format (recommended)
https://dev.azure.com/organization/project/_git/repository

# Legacy format (still works)
https://organization.visualstudio.com/project/_git/repository
```

Both formats work with ArgoCD, but the new format is recommended. Some organizations also run Azure DevOps Server (formerly TFS) on-premises:

```
# Azure DevOps Server (on-premises)
https://azuredevops.company.com/organization/project/_git/repository
```

## Method 1: Personal Access Token (Most Common)

PATs are the simplest way to connect ArgoCD to Azure DevOps. Create one at https://dev.azure.com/your-org/_usersettings/tokens with the `Code (Read)` scope.

```yaml
# azure-devops-pat.yaml
apiVersion: v1
kind: Secret
metadata:
  name: azure-devops-credentials
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://dev.azure.com/your-organization
  username: argocd
  password: your_azure_devops_pat_here
```

An important quirk of Azure DevOps: the username can be anything when using a PAT. Azure DevOps ignores the username field and only validates the token. Some people use their email, some use an empty string, some use a placeholder like `argocd`. It does not matter.

```bash
kubectl apply -f azure-devops-pat.yaml
```

### For a Single Repository

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: azure-devops-single-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://dev.azure.com/your-org/your-project/_git/k8s-manifests
  username: argocd
  password: your_pat
```

## Method 2: SSH Keys

Azure DevOps supports SSH authentication. Add your public key at https://dev.azure.com/your-org/_usersettings/keys.

First, generate the key:

```bash
ssh-keygen -t rsa -b 4096 -C "argocd@company.com" -f argocd-azdo-key -N ""
```

Note: Azure DevOps requires RSA keys. ED25519 keys are supported on Azure DevOps Services but may not work on older Azure DevOps Server installations.

The SSH URL format for Azure DevOps is different:

```
# Azure DevOps SSH URL
git@ssh.dev.azure.com:v3/organization/project/repository
```

Configure ArgoCD:

```yaml
# azure-devops-ssh.yaml
apiVersion: v1
kind: Secret
metadata:
  name: azure-devops-ssh-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: git@ssh.dev.azure.com:v3/your-organization
  sshPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    MIIEpAIBAAKCAQEA...
    -----END RSA PRIVATE KEY-----
```

Add Azure DevOps SSH host key to ArgoCD:

```bash
# Get the Azure DevOps SSH host key
ssh-keyscan ssh.dev.azure.com
```

Update the known hosts ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-ssh-known-hosts-cm
  namespace: argocd
data:
  ssh_known_hosts: |
    ssh.dev.azure.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC7Hr1oTWqNqOlzGJOfGJ4NakVyIzf1rXYd4d7wo6jBlkLvCA4odBlL0mDUyZ0/QUfTTqeu+tm22gOsv+VrVTMk6vwRU75gY/y9ut5Mb3bR5BV58dKXyq9A9UeB5Cakehn5Zgm6x1mKoVyf+FFn26iYqXJRgzIZZcZ5V6hrE0Qg39kZm4az48o0AUbf6Sp4SLdvnuMa2sVNwHBboS7EJkm57XQPVU3/QpyNLHbWDdzwtrlS+ez30S3AdYhLKEOxAG8weOnyrtLJAUen9mTkol8oII1edf7mWWbWVf0nBmly21+nZcmCTISQBtdcyPaEno7fFQMDD26/s0lfKob4Kw8H
    github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
```

## Method 3: Azure Managed Identity (Advanced)

If your ArgoCD cluster runs on AKS, you can use Azure Managed Identity with the Azure DevOps REST API. This requires a custom approach since ArgoCD does not natively support managed identity authentication for Git.

The typical pattern is to use a sidecar or init container that generates PATs from the managed identity:

```yaml
# This is a conceptual example - requires custom implementation
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-repo-server
          # ... standard configuration
        - name: token-refresher
          image: your-registry/azure-pat-refresher:latest
          env:
            - name: AZURE_CLIENT_ID
              value: "managed-identity-client-id"
            - name: AZURE_DEVOPS_ORG
              value: "your-organization"
          volumeMounts:
            - name: token
              mountPath: /tmp/token
      volumes:
        - name: token
          emptyDir: {}
```

For most teams, a long-lived PAT from a service account is simpler and works well.

## Azure DevOps Server (On-Premises)

For Azure DevOps Server running on your own infrastructure, the configuration is similar but with your custom URL:

```yaml
# azdo-server-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: azdo-server-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://azuredevops.company.com/DefaultCollection
  username: argocd
  password: your_pat_or_password
```

Handle the internal CA certificate:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-tls-certs-cm
  namespace: argocd
data:
  azuredevops.company.com: |
    -----BEGIN CERTIFICATE-----
    MIIFjTCCA3WgAwIBAgIUK...
    -----END CERTIFICATE-----
```

## Using the ArgoCD CLI

```bash
# Add Azure DevOps repo with PAT
argocd repo add "https://dev.azure.com/your-org/your-project/_git/k8s-manifests" \
  --username argocd \
  --password your_pat

# Add credential template
argocd repocreds add "https://dev.azure.com/your-org" \
  --username argocd \
  --password your_pat

# Verify
argocd repo list
```

## Creating an Application

```yaml
# app-from-azdo.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-service
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://dev.azure.com/your-org/your-project/_git/k8s-manifests
    targetRevision: main
    path: environments/production
  destination:
    server: https://kubernetes.default.svc
    namespace: my-service
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## Configuring Webhooks

Azure DevOps supports service hooks that can notify ArgoCD of pushes:

1. Go to Project Settings > Service hooks > Create subscription
2. Choose "Web Hooks" as the service
3. Select "Code pushed" as the trigger
4. Set the URL to `https://argocd.company.com/api/webhook`

In ArgoCD, configure the webhook secret:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  webhook.azuredevops.secret: your-webhook-secret
```

## Troubleshooting

### "TF401019: The Git repository with name or identifier does not exist"

This usually means the URL format is wrong. Azure DevOps URLs are case-sensitive:

```bash
# Wrong - spaces or wrong case in project/repo name
https://dev.azure.com/org/My Project/_git/My Repo

# Right - use the exact names as shown in Azure DevOps
https://dev.azure.com/org/My%20Project/_git/My%20Repo
```

### "VS30063: You are not authorized"

The PAT may have expired or lacks the required scope:

```bash
# Test the PAT
curl -u "argocd:your_pat" "https://dev.azure.com/your-org/_apis/git/repositories?api-version=7.0"
```

### Timeout Errors

Azure DevOps can be slow for large repositories. Increase the ArgoCD timeout:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  timeout.reconciliation: 300s
```

### Azure DevOps PAT Scopes

For ArgoCD, the minimum required PAT scope is:
- Code: Read

You do not need Build, Release, or any other scopes. Use the principle of least privilege.

For more on managing ArgoCD repository credentials across multiple providers, see [repository credentials in ArgoCD](https://oneuptime.com/blog/post/2026-01-25-repository-credentials-argocd/view).
