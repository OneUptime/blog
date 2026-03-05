# How to Bootstrap Flux CD with Bitbucket Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Bitbucket Server, CI/CD, Atlassian

Description: Learn how to bootstrap Flux CD with Bitbucket Server (Bitbucket Data Center), including SSH key configuration, project setup, and automated deployments.

---

Bitbucket Server (also known as Bitbucket Data Center) is Atlassian's self-hosted Git solution widely used in enterprise environments. While Flux CD does not have a dedicated `flux bootstrap bitbucket-server` command like it does for GitHub and GitLab, you can bootstrap Flux using the generic Git server approach combined with manual repository setup. This guide walks you through the complete process of connecting Flux CD to a Bitbucket Server instance.

## Prerequisites

- A running Kubernetes cluster (v1.26 or later)
- `kubectl` configured to access your cluster
- Flux CLI installed (v2.0 or later)
- A Bitbucket Server instance with SSH access
- An SSH key pair for authentication
- A Bitbucket Server project and repository created

## Step 1: Create a Repository in Bitbucket Server

Unlike GitHub and GitLab bootstrapping, Bitbucket Server requires you to create the repository manually before bootstrapping. Log in to your Bitbucket Server web interface and create a new repository.

1. Navigate to your project (e.g., `INFRA`)
2. Click "Create repository"
3. Name it `fleet-infra`
4. Set it to private
5. Note the SSH clone URL (e.g., `ssh://git@bitbucket.example.com:7999/infra/fleet-infra.git`)

## Step 2: Generate and Configure an SSH Key

Create a dedicated SSH key pair for Flux CD to use when connecting to Bitbucket Server.

```bash
# Generate an SSH key pair for Flux
ssh-keygen -t ed25519 -C "flux-cd" -f ~/.ssh/flux-bitbucket -N ""

# Display the public key to add to Bitbucket Server
cat ~/.ssh/flux-bitbucket.pub
```

Add the public key to Bitbucket Server:

1. Navigate to the `fleet-infra` repository settings
2. Go to "Access keys"
3. Click "Add key"
4. Paste the public key and grant "Read/Write" permission

## Step 3: Get the Bitbucket Server Host Key

Flux needs the SSH host key of your Bitbucket Server to verify the connection.

```bash
# Scan the Bitbucket Server host key
ssh-keyscan -p 7999 bitbucket.example.com > known_hosts.txt

# Display the host key (you will need this later)
cat known_hosts.txt
```

## Step 4: Install Flux Components Manually

Since there is no dedicated Bitbucket Server bootstrap command, use `flux install` to deploy the controllers first.

```bash
# Install Flux controllers on the cluster
flux install \
  --components=source-controller,kustomize-controller,helm-controller,notification-controller

# Verify the installation
flux check
```

## Step 5: Create the Git Authentication Secret

Create a Kubernetes secret with the SSH private key and known hosts file.

```bash
# Create the SSH authentication secret for Flux
flux create secret git flux-system \
  --url=ssh://git@bitbucket.example.com:7999/infra/fleet-infra.git \
  --private-key-file=~/.ssh/flux-bitbucket \
  --namespace=flux-system
```

Alternatively, create the secret manually with known hosts verification:

```bash
# Create the secret with explicit known hosts
kubectl create secret generic flux-system \
  --from-file=identity=~/.ssh/flux-bitbucket \
  --from-file=identity.pub=~/.ssh/flux-bitbucket.pub \
  --from-file=known_hosts=known_hosts.txt \
  -n flux-system
```

## Step 6: Create the GitRepository Source

Define a GitRepository resource that tells Flux where to find your configuration.

```yaml
# flux-system/gotk-sync.yaml
# GitRepository source pointing to Bitbucket Server
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
  url: ssh://git@bitbucket.example.com:7999/infra/fleet-infra.git
```

Apply the resource to the cluster:

```bash
# Apply the GitRepository resource
kubectl apply -f flux-system/gotk-sync.yaml
```

## Step 7: Create the Kustomization Resource

Define a Kustomization resource that tells Flux how to apply the manifests from the repository.

```yaml
# flux-system/kustomization-sync.yaml
# Kustomization that syncs the cluster directory from Bitbucket Server
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
  timeout: 5m0s
```

Apply and verify:

```bash
# Apply the Kustomization resource
kubectl apply -f flux-system/kustomization-sync.yaml

# Verify the source is being fetched
flux get sources git

# Verify the kustomization is reconciling
flux get kustomizations
```

## Step 8: Push Initial Configuration to Bitbucket Server

Commit the Flux configuration files to your Bitbucket Server repository so they are tracked in Git.

```bash
# Clone the repository
git clone ssh://git@bitbucket.example.com:7999/infra/fleet-infra.git
cd fleet-infra

# Create the cluster directory structure
mkdir -p clusters/production/flux-system

# Export the Flux component manifests
flux install --export > clusters/production/flux-system/gotk-components.yaml

# Copy the sync manifests
cp flux-system/gotk-sync.yaml clusters/production/flux-system/
cp flux-system/kustomization-sync.yaml clusters/production/flux-system/

# Create a kustomization.yaml for the flux-system directory
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
git commit -m "Add Flux system configuration"
git push origin main
```

## Step 9: Deploy a Sample Application

Add application manifests to test the GitOps workflow.

```yaml
# clusters/production/apps/podinfo.yaml
# HelmRelease for the podinfo sample application
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 1h0s
  url: https://stefanprodan.github.io/podinfo
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: podinfo
  namespace: default
spec:
  interval: 5m0s
  chart:
    spec:
      chart: podinfo
      version: "6.5.*"
      sourceRef:
        kind: HelmRepository
        name: podinfo
        namespace: flux-system
  values:
    replicaCount: 2
    resources:
      requests:
        cpu: 100m
        memory: 64Mi
```

Commit and push this file. Flux will automatically detect the change and deploy the application.

```bash
# Force immediate reconciliation
flux reconcile source git flux-system

# Check the HelmRelease status
flux get helmreleases --all-namespaces
```

## Step 10: Verify and Monitor

Ensure everything is working as expected.

```bash
# Check all Flux resources
flux get all

# View Flux events
flux events

# Check controller logs for errors
flux logs --level=error

# Verify the podinfo deployment
kubectl get pods -l app.kubernetes.io/name=podinfo
```

## Using HTTPS Instead of SSH

If your Bitbucket Server setup requires HTTPS authentication, create a secret with username and password credentials.

```bash
# Create an HTTPS authentication secret
kubectl create secret generic flux-system \
  --from-literal=username=<bitbucket-username> \
  --from-literal=password=<bitbucket-http-access-token> \
  -n flux-system
```

Then update the GitRepository resource URL to use HTTPS:

```yaml
# GitRepository source using HTTPS
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
  url: https://bitbucket.example.com/scm/infra/fleet-infra.git
```

## Summary

While Bitbucket Server does not have a dedicated Flux bootstrap command, the setup process is well-defined and repeatable. By manually installing Flux components, configuring SSH authentication, and creating the GitRepository and Kustomization resources, you achieve the same GitOps workflow as with other Git providers. Once configured, Flux continuously monitors your Bitbucket Server repository for changes and applies them to your cluster automatically. This approach works for both Bitbucket Server and Bitbucket Data Center deployments.
