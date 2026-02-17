# How to Set Up ACR Token-Based Authentication for Scoped Repository Access Control

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ACR, Azure Container Registry, Authentication, Tokens, Access Control, Security, Docker

Description: Learn how to create scoped ACR tokens that grant fine-grained access to specific repositories, replacing broad admin credentials with least-privilege tokens.

---

Azure Container Registry admin credentials are convenient but dangerous. When you enable the admin account, anyone with those credentials has full push and pull access to every repository in the registry. If those credentials leak, your entire container image library is exposed.

ACR token-based authentication solves this by letting you create tokens with precise permissions. You can create a token that only allows pulling images from a specific repository, or one that only allows pushing to a staging repository. This guide covers creating scope maps, generating tokens, and using them in practice.

## Why Scoped Tokens

Consider a typical development workflow. You have multiple teams, each owning different microservices. Your CI/CD pipeline needs push access to write new images, but your production AKS cluster only needs pull access to read them. External partners might need pull access to specific shared images but nothing else.

With the admin account, everyone gets the same all-or-nothing access. With scoped tokens, you can create:

- A CI/CD token that can push to `myapp/api` and `myapp/frontend` but nothing else
- A production pull token that can only read from `myapp/api`, `myapp/frontend`, and `myapp/worker`
- A partner token that can only pull from `shared/sdk`

## Prerequisites

- Azure Container Registry on the Premium SKU (token-based auth requires Premium)
- Azure CLI 2.50 or later
- Some repositories with images in your registry

## Step 1: Create Scope Maps

A scope map defines a set of permissions on specific repositories. Think of it as an IAM policy for your container registry.

```bash
# Create a scope map for CI/CD pipeline - push and pull to specific repos
az acr scope-map create \
  --name cicd-scope \
  --registry myRegistry \
  --description "CI/CD pipeline access to application repositories" \
  --repository myapp/api content/write content/read \
  --repository myapp/frontend content/write content/read \
  --repository myapp/worker content/write content/read \
  --repository myapp/api metadata/read \
  --repository myapp/frontend metadata/read \
  --repository myapp/worker metadata/read
```

The permission types are:

- `content/read` - Pull images and read manifests
- `content/write` - Push images and write manifests
- `content/delete` - Delete images and tags
- `metadata/read` - Read repository metadata (tags, manifests list)
- `metadata/write` - Write repository metadata

Let's create a few more scope maps for different use cases.

```bash
# Create a scope map for production cluster - pull only
az acr scope-map create \
  --name production-pull-scope \
  --registry myRegistry \
  --description "Production cluster read-only access" \
  --repository myapp/api content/read \
  --repository myapp/frontend content/read \
  --repository myapp/worker content/read

# Create a scope map for external partner - very limited access
az acr scope-map create \
  --name partner-scope \
  --registry myRegistry \
  --description "External partner access to shared SDK images" \
  --repository shared/sdk content/read \
  --repository shared/sdk metadata/read

# Create a scope map for cleanup automation - delete old images
az acr scope-map create \
  --name cleanup-scope \
  --registry myRegistry \
  --description "Automated cleanup tool for removing old images" \
  --repository myapp/api content/read content/delete \
  --repository myapp/frontend content/read content/delete \
  --repository myapp/worker content/read content/delete
```

## Step 2: Create Tokens from Scope Maps

Now create tokens that use these scope maps. Each token gets a username and one or two passwords.

```bash
# Create a token for CI/CD using the cicd-scope map
az acr token create \
  --name cicd-token \
  --registry myRegistry \
  --scope-map cicd-scope \
  --status enabled

# Create a token for production pull
az acr token create \
  --name production-pull-token \
  --registry myRegistry \
  --scope-map production-pull-scope \
  --status enabled

# Create a token for external partner
az acr token create \
  --name partner-token \
  --registry myRegistry \
  --scope-map partner-scope \
  --status enabled
```

## Step 3: Generate Token Passwords

Tokens need passwords to authenticate. Each token supports two passwords, which allows you to rotate one while the other is still active.

```bash
# Generate password1 for the CI/CD token
# Store the output - the password is only shown once
az acr token credential generate \
  --name cicd-token \
  --registry myRegistry \
  --password1 \
  --expiry "2027-01-01T00:00:00Z"

# Generate password1 for the production pull token
az acr token credential generate \
  --name production-pull-token \
  --registry myRegistry \
  --password1 \
  --expiry "2027-01-01T00:00:00Z"

# Generate password1 for the partner token with shorter expiry
az acr token credential generate \
  --name partner-token \
  --registry myRegistry \
  --password1 \
  --expiry "2026-06-01T00:00:00Z"
```

Save the generated passwords securely. Store them in Azure Key Vault or your secrets manager of choice. The password is only displayed once at creation time.

## Step 4: Use Tokens for Docker Authentication

Tokens work just like regular Docker credentials. The username is the token name.

```bash
# Login to ACR using a scoped token
docker login myregistry.azurecr.io \
  --username cicd-token \
  --password "<generated-password>"

# Push an image (works because cicd-token has content/write)
docker push myregistry.azurecr.io/myapp/api:v2.0

# Try pushing to an unauthorized repo (this will fail)
docker push myregistry.azurecr.io/unauthorized/image:latest
# Error: denied: requested access to the resource is denied
```

## Step 5: Use Tokens in Kubernetes

For AKS clusters, create a Kubernetes secret with the token credentials and reference it as an imagePullSecret.

```bash
# Create a Kubernetes secret with the production pull token
kubectl create secret docker-registry acr-pull-secret \
  --docker-server=myregistry.azurecr.io \
  --docker-username=production-pull-token \
  --docker-password="<generated-password>" \
  --namespace=production
```

Reference it in your deployments:

```yaml
# deployment.yaml
# Uses scoped ACR token for image pulling
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      # Reference the pull secret with the scoped token
      imagePullSecrets:
      - name: acr-pull-secret
      containers:
      - name: api
        image: myregistry.azurecr.io/myapp/api:v2.0
```

## Step 6: Password Rotation

Tokens support two passwords to enable zero-downtime rotation. Here is the process:

```bash
# Step 1: Generate password2 while password1 is still active
az acr token credential generate \
  --name production-pull-token \
  --registry myRegistry \
  --password2 \
  --expiry "2028-01-01T00:00:00Z"

# Step 2: Update all systems to use password2
# (Update Kubernetes secrets, CI/CD variables, etc.)
kubectl create secret docker-registry acr-pull-secret \
  --docker-server=myregistry.azurecr.io \
  --docker-username=production-pull-token \
  --docker-password="<new-password2>" \
  --namespace=production \
  --dry-run=client -o yaml | kubectl apply -f -

# Step 3: Once everything is using password2, delete password1
az acr token credential delete \
  --name production-pull-token \
  --registry myRegistry \
  --password1
```

## Step 7: Managing Token Lifecycle

List and manage your tokens:

```bash
# List all tokens in the registry
az acr token list --registry myRegistry -o table

# Show details of a specific token
az acr token show --name cicd-token --registry myRegistry

# Disable a token (immediately blocks all access)
az acr token update \
  --name partner-token \
  --registry myRegistry \
  --status disabled

# Re-enable a token
az acr token update \
  --name partner-token \
  --registry myRegistry \
  --status enabled

# Delete a token permanently
az acr token delete \
  --name partner-token \
  --registry myRegistry --yes
```

## Updating Scope Maps

As your application evolves, you may need to add or remove repositories from a scope map.

```bash
# Add a new repository to the CI/CD scope map
az acr scope-map update \
  --name cicd-scope \
  --registry myRegistry \
  --add-repository myapp/newservice content/write content/read

# Remove a repository from the scope map
az acr scope-map update \
  --name cicd-scope \
  --registry myRegistry \
  --remove-repository myapp/deprecated content/write content/read
```

Changes to scope maps take effect immediately for all tokens using that scope map. No token regeneration is needed.

## Auditing Token Usage

ACR logs all authentication events to Azure Monitor diagnostic logs. Enable diagnostics to track which tokens are being used.

```bash
# Enable diagnostic logging for the registry
az monitor diagnostic-settings create \
  --resource $(az acr show --name myRegistry --query id -o tsv) \
  --name acr-diagnostics \
  --workspace <log-analytics-workspace-id> \
  --logs '[{"category":"ContainerRegistryLoginEvents","enabled":true}]'
```

Once logging is enabled, you can query for token authentication events:

```bash
# Query login events from the last 24 hours
az monitor log-analytics query \
  --workspace <workspace-id> \
  --analytics-query "ContainerRegistryLoginEvents | where TimeGenerated > ago(24h) | project TimeGenerated, Identity, LoginServer, ResultType"
```

## Best Practices

Keep scope maps focused and descriptive. One scope map per role or service identity is cleaner than a few broad scope maps shared across many tokens.

Set expiration dates on all token passwords. Never create passwords without an expiry. When a password expires, any system using it stops working, which is exactly the behavior you want as a forcing function for rotation.

Store token passwords in Azure Key Vault, not in CI/CD environment variables or config files. Key Vault gives you audit trails, access policies, and automated rotation capabilities.

Disable the admin account once you have scoped tokens in place. The admin account is a security liability and should only be used as a break-glass option.

Review and clean up unused tokens regularly. Stale tokens from old projects or departed team members are a security risk.

Token-based authentication transforms ACR from a shared resource with a single set of credentials into a properly governed container registry with least-privilege access for every consumer.
