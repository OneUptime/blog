# How to Bootstrap Flux CD with Azure DevOps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Azure DevOps, Azure, CI/CD, AKS

Description: Step-by-step instructions for bootstrapping Flux CD with Azure DevOps Repos, including SSH configuration, HTTPS token auth, and integration with AKS.

---

Azure DevOps is Microsoft's DevOps platform that includes Git repositories, CI/CD pipelines, and project management tools. Flux CD can be bootstrapped with Azure DevOps using the generic Git server approach, making it a strong choice for teams already invested in the Microsoft ecosystem. This guide covers setting up Flux CD with Azure DevOps Repos, including both SSH and HTTPS authentication methods, and special considerations for Azure Kubernetes Service (AKS).

## Prerequisites

- A running Kubernetes cluster (AKS recommended, but any cluster works)
- `kubectl` configured to access your cluster
- Flux CLI installed (v2.0 or later)
- An Azure DevOps organization and project
- A personal access token (PAT) with Code (Read & Write) permissions

## Step 1: Create an Azure DevOps Repository

Create a new repository in Azure DevOps for your Flux configuration:

1. Navigate to your Azure DevOps project
2. Go to Repos > Files
3. Click "New repository"
4. Name it `fleet-infra`
5. Initialize with a README or leave it empty
6. Note the clone URLs (both HTTPS and SSH)

## Step 2: Generate a Personal Access Token

Create a PAT in Azure DevOps with the appropriate permissions.

1. Click on User Settings (gear icon) > Personal Access Tokens
2. Click "New Token"
3. Set the name to `flux-cd`
4. Select the organization
5. Set expiration as needed
6. Under Scopes, select **Code: Read & Write**
7. Click "Create" and save the token

```bash
# Export the Azure DevOps PAT
export AZURE_DEVOPS_PAT=<your-personal-access-token>

# Export the organization and project details
export AZURE_DEVOPS_ORG=<your-organization>
export AZURE_DEVOPS_PROJECT=<your-project>
```

## Step 3: Install Flux Components

Install the Flux controllers on your cluster.

```bash
# Install Flux components
flux install

# Verify the installation
flux check
```

## Step 4: Bootstrap Using HTTPS with Token Authentication

The most straightforward method for Azure DevOps is HTTPS with a PAT.

```bash
# Create the Git authentication secret for Azure DevOps
kubectl create secret generic flux-system \
  --from-literal=username=git \
  --from-literal=password=$AZURE_DEVOPS_PAT \
  -n flux-system
```

Create the GitRepository source pointing to your Azure DevOps repository.

```yaml
# clusters/production/flux-system/gotk-sync.yaml
# GitRepository source for Azure DevOps
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m0s
  ref:
    branch: main
  secretRef:
    name: flux-system
  url: https://dev.azure.com/<org>/<project>/_git/fleet-infra
```

```yaml
# clusters/production/flux-system/kustomization-sync.yaml
# Kustomization for syncing cluster state
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 10m0s
  path: ./clusters/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
```

Apply the resources:

```bash
# Apply the GitRepository and Kustomization
kubectl apply -f clusters/production/flux-system/gotk-sync.yaml
kubectl apply -f clusters/production/flux-system/kustomization-sync.yaml

# Verify the source is connected
flux get sources git
```

## Step 5: Alternative - Bootstrap Using SSH

If you prefer SSH authentication, configure SSH keys for Azure DevOps.

```bash
# Generate a dedicated SSH key for Flux
ssh-keygen -t ed25519 -C "flux-cd-azure" -f ~/.ssh/flux-azure -N ""

# Display the public key
cat ~/.ssh/flux-azure.pub
```

Add the public key to Azure DevOps:

1. Go to User Settings > SSH public keys
2. Click "Add" and paste the public key

Then create the Flux secret with the SSH key:

```bash
# Create the SSH secret
flux create secret git flux-system \
  --url=ssh://git@ssh.dev.azure.com/v3/<org>/<project>/fleet-infra \
  --private-key-file=~/.ssh/flux-azure \
  --namespace=flux-system
```

Update the GitRepository to use the SSH URL:

```yaml
# GitRepository source using SSH for Azure DevOps
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m0s
  ref:
    branch: main
  secretRef:
    name: flux-system
  url: ssh://git@ssh.dev.azure.com/v3/<org>/<project>/fleet-infra
```

## Step 6: Push Configuration to the Repository

Clone the repository and push the Flux configuration files.

```bash
# Clone the Azure DevOps repository
git clone https://dev.azure.com/$AZURE_DEVOPS_ORG/$AZURE_DEVOPS_PROJECT/_git/fleet-infra
cd fleet-infra

# Create the directory structure
mkdir -p clusters/production/flux-system

# Export Flux component manifests
flux install --export > clusters/production/flux-system/gotk-components.yaml

# Create the kustomization.yaml
cat > clusters/production/flux-system/kustomization.yaml << 'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
  - kustomization-sync.yaml
EOF

# Commit and push
git add -A
git commit -m "Initialize Flux configuration"
git push origin main
```

## Step 7: Deploy Applications via GitOps

Create application definitions that Flux will manage.

```yaml
# clusters/production/apps/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m0s
  path: ./apps/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
```

```yaml
# apps/production/nginx/deployment.yaml
# Example nginx deployment managed through GitOps
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx-app
  template:
    metadata:
      labels:
        app: nginx-app
    spec:
      containers:
        - name: nginx
          image: nginx:1.25-alpine
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-app
  namespace: default
spec:
  selector:
    app: nginx-app
  ports:
    - port: 80
      targetPort: 80
  type: LoadBalancer
```

## Step 8: Integration with AKS GitOps Extension

If you are running AKS, Microsoft provides a Flux-based GitOps extension that simplifies management through the Azure Portal and CLI.

```bash
# Register the AKS GitOps extension (if using AKS)
az extension add --name k8s-configuration

# Create a Flux configuration via the Azure CLI
az k8s-configuration flux create \
  --resource-group <resource-group> \
  --cluster-name <aks-cluster-name> \
  --cluster-type managedClusters \
  --name flux-system \
  --url https://dev.azure.com/$AZURE_DEVOPS_ORG/$AZURE_DEVOPS_PROJECT/_git/fleet-infra \
  --branch main \
  --kustomization name=infra path=./clusters/production prune=true
```

Note that the AKS GitOps extension manages the Flux installation lifecycle for you, including upgrades.

## Step 9: Verify the Setup

Confirm that Flux is operating correctly.

```bash
# Full system check
flux check

# View all sources and kustomizations
flux get sources git
flux get kustomizations

# Check for any errors
flux logs --level=error

# Force reconciliation
flux reconcile source git flux-system
flux reconcile kustomization flux-system

# View deployed resources
kubectl get all --all-namespaces -l app=nginx-app
```

## Troubleshooting

Common issues with Azure DevOps and Flux CD:

```bash
# Azure DevOps HTTPS URLs have a specific format - ensure correct format
# Format: https://dev.azure.com/<org>/<project>/_git/<repo>

# SSH URLs also have a unique format
# Format: git@ssh.dev.azure.com:v3/<org>/<project>/<repo>

# If PAT authentication fails, verify token has Code (Read & Write) scope
# Tokens expire - check expiration date and regenerate if needed

# For 203 Non-Authoritative errors, ensure the PAT is URL-encoded
# Special characters in PATs need encoding

# View source-controller logs for detailed error messages
kubectl logs -n flux-system deploy/source-controller --tail=50
```

## Summary

Bootstrapping Flux CD with Azure DevOps requires a few more manual steps compared to GitHub or GitLab, but the end result is equally powerful. Whether you use HTTPS with personal access tokens or SSH keys, Flux CD continuously syncs your cluster state with your Azure DevOps repository. For AKS users, the Azure GitOps extension provides an even more integrated experience. Once configured, your team can manage all Kubernetes deployments through pull requests in Azure DevOps, bringing true GitOps practices to your Azure infrastructure.
