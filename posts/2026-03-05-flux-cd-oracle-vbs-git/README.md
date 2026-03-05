# How to Set Up Flux CD on Oracle VBS Git Repositories

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Oracle Cloud, OCI, VBS, DevOps, Oracle Visual Builder Studio

Description: A step-by-step guide to configuring Flux CD to work with Oracle Visual Builder Studio (VBS) Git repositories for GitOps workflows on Oracle Cloud Infrastructure.

---

Oracle Visual Builder Studio (VBS), formerly known as Oracle Developer Cloud Service, provides Git repository hosting as part of Oracle Cloud Infrastructure (OCI). While Flux CD has built-in support for GitHub, GitLab, and Bitbucket, you can also use it with any standard Git repository over SSH or HTTPS, including Oracle VBS. This guide explains how to set up Flux CD with Oracle VBS Git repositories for a complete GitOps workflow on Oracle Cloud.

## Prerequisites

- An Oracle Cloud Infrastructure (OCI) account with access to Visual Builder Studio
- A VBS project with a Git repository created
- A Kubernetes cluster (OKE or any other Kubernetes distribution)
- `kubectl` configured to access your cluster
- The Flux CLI installed on your local machine

## Understanding Oracle VBS Git Access

Oracle VBS provides Git repository access via both HTTPS and SSH. For Flux CD, SSH is the recommended method because it uses deploy keys for authentication, which is more secure and does not require storing user passwords.

The SSH URL format for VBS Git repositories is:

```text
ssh://git@vbs.example.com/project-name/repo-name.git
```

Replace `vbs.example.com` with your VBS instance hostname, which typically follows the pattern `your-instance.developer.ocp.oraclecloud.com`.

## Step 1: Generate an SSH Key Pair

Generate an SSH key pair that Flux will use to authenticate with your VBS Git repository.

```bash
# Generate an Ed25519 SSH key pair for Flux
ssh-keygen -t ed25519 -C "flux-vbs-deploy-key" -f flux-vbs-key -N ""

# Display the public key
cat flux-vbs-key.pub
```

## Step 2: Add the SSH Key to Oracle VBS

Add the public key to your Oracle VBS instance:

1. Log in to your Oracle VBS instance
2. Navigate to your user profile settings
3. Go to the SSH Keys section
4. Click "Add SSH Key"
5. Paste the contents of `flux-vbs-key.pub`
6. Save the key

Alternatively, if your VBS project supports deploy keys at the repository level, add the key there for more granular access control.

## Step 3: Get the VBS SSH Host Key

Flux needs to know the SSH host key of the VBS server to establish a trusted connection. Retrieve it using `ssh-keyscan`.

```bash
# Scan the VBS host for its SSH host key
# Replace with your actual VBS hostname
ssh-keyscan your-instance.developer.ocp.oraclecloud.com > vbs-known-hosts 2>/dev/null

# Verify the contents
cat vbs-known-hosts
```

## Step 4: Install Flux on the Cluster

Since Flux does not have a built-in bootstrap provider for Oracle VBS, use `flux install` to install the controllers and then configure the Git source manually.

```bash
# Run pre-flight checks
flux check --pre

# Install Flux controllers
flux install
```

Verify the installation:

```bash
# Check that all controllers are running
flux check

# List all pods in flux-system
kubectl get pods -n flux-system
```

## Step 5: Create the SSH Secret for VBS

Create a Kubernetes Secret containing the SSH private key and known hosts for VBS authentication.

```bash
# Create the secret with the SSH key and known hosts
flux create secret git vbs-ssh-credentials \
  --namespace=flux-system \
  --url=ssh://git@your-instance.developer.ocp.oraclecloud.com/project-name/repo-name.git \
  --private-key-file=flux-vbs-key \
  --known-hosts-file=vbs-known-hosts
```

Alternatively, create the secret using kubectl:

```bash
# Create the secret manually with kubectl
kubectl create secret generic vbs-ssh-credentials \
  --namespace=flux-system \
  --from-file=identity=flux-vbs-key \
  --from-file=identity.pub=flux-vbs-key.pub \
  --from-file=known_hosts=vbs-known-hosts
```

Verify the secret was created:

```bash
# Check the secret exists
kubectl get secret vbs-ssh-credentials -n flux-system
```

## Step 6: Create the GitRepository Source

Create a GitRepository resource that points to your VBS repository.

```yaml
# vbs-git-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: vbs-fleet-infra
  namespace: flux-system
spec:
  interval: 5m
  url: ssh://git@your-instance.developer.ocp.oraclecloud.com/project-name/repo-name.git
  ref:
    branch: main
  secretRef:
    name: vbs-ssh-credentials
```

Apply it:

```bash
# Apply the GitRepository resource
kubectl apply -f vbs-git-source.yaml

# Check the status of the source
flux get sources git vbs-fleet-infra
```

If the source shows a Ready status, Flux can successfully connect to your VBS repository.

## Step 7: Create a Kustomization to Reconcile from VBS

Create a Kustomization that tells Flux what to deploy from the VBS repository.

```yaml
# vbs-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: vbs-apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: vbs-fleet-infra
  path: ./clusters/my-cluster
  prune: true
  targetNamespace: default
```

Apply it:

```bash
# Apply the Kustomization
kubectl apply -f vbs-kustomization.yaml

# Check the Kustomization status
flux get kustomizations vbs-apps
```

## Step 8: Set Up the Repository Structure

In your VBS Git repository, create the directory structure that Flux expects. The structure should match the `path` specified in your Kustomization.

```bash
# Clone your VBS repository
git clone ssh://git@your-instance.developer.ocp.oraclecloud.com/project-name/repo-name.git
cd repo-name

# Create the directory structure
mkdir -p clusters/my-cluster/apps
```

Add a sample application manifest:

```yaml
# clusters/my-cluster/apps/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: sample-app
---
# clusters/my-cluster/apps/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-demo
  namespace: sample-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx-demo
  template:
    metadata:
      labels:
        app: nginx-demo
    spec:
      containers:
        - name: nginx
          image: nginx:1.27-alpine
          ports:
            - containerPort: 80
```

Create a Kustomize configuration file:

```yaml
# clusters/my-cluster/apps/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - deployment.yaml
```

Add a top-level Kustomization in the cluster path:

```yaml
# clusters/my-cluster/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - apps/
```

Commit and push:

```bash
git add -A
git commit -m "Add initial cluster configuration"
git push origin main
```

## Step 9: Verify Reconciliation

After pushing to VBS, Flux should detect the changes and reconcile.

```bash
# Trigger an immediate reconciliation
flux reconcile source git vbs-fleet-infra
flux reconcile kustomization vbs-apps

# Check the Kustomization status
flux get kustomizations vbs-apps

# Verify the sample app was deployed
kubectl get pods -n sample-app
```

## Using HTTPS Authentication with VBS

If SSH is not available or you prefer HTTPS, create an HTTPS-based secret instead.

```bash
# Create an HTTPS secret for VBS
flux create secret git vbs-https-credentials \
  --namespace=flux-system \
  --url=https://your-instance.developer.ocp.oraclecloud.com/project-name/repo-name.git \
  --username=your-vbs-username \
  --password=your-vbs-password
```

Update the GitRepository source to use HTTPS:

```yaml
# vbs-git-source-https.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: vbs-fleet-infra
  namespace: flux-system
spec:
  interval: 5m
  url: https://your-instance.developer.ocp.oraclecloud.com/project-name/repo-name.git
  ref:
    branch: main
  secretRef:
    name: vbs-https-credentials
```

## Using VBS with Oracle Kubernetes Engine (OKE)

If you are running OKE on Oracle Cloud, you can combine Flux with VBS for a fully Oracle-native GitOps stack.

```bash
# Configure kubectl for OKE
oci ce cluster create-kubeconfig \
  --cluster-id ocid1.cluster.oc1... \
  --file $HOME/.kube/config \
  --region us-ashburn-1

# Verify OKE connectivity
kubectl get nodes

# Install Flux on OKE
flux install

# Then follow the steps above to configure the VBS Git source
```

## Configuring Webhook Notifications from VBS

Oracle VBS supports outgoing webhooks. Configure a webhook to notify Flux when changes are pushed, enabling near-instant reconciliation.

First, create a Receiver in Flux:

```yaml
# vbs-receiver.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: vbs-webhook
  namespace: flux-system
spec:
  type: generic
  events:
    - "push"
  secretRef:
    name: webhook-token
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: vbs-fleet-infra
```

Create the webhook token:

```bash
# Generate and store the webhook token
kubectl create secret generic webhook-token \
  --namespace=flux-system \
  --from-literal=token=$(head -c 32 /dev/urandom | base64)

# Apply the receiver
kubectl apply -f vbs-receiver.yaml

# Get the webhook URL
flux get receivers vbs-webhook
```

Configure the resulting webhook URL in your VBS project settings under the webhook or notification configuration.

## Troubleshooting VBS Connectivity

If Flux cannot connect to your VBS repository, check these common issues:

```bash
# Check source-controller logs for SSH/connection errors
kubectl logs -n flux-system deployment/source-controller | grep -i "error\|fail\|auth"

# Verify the secret has the correct keys
kubectl get secret vbs-ssh-credentials -n flux-system -o jsonpath='{.data}' | jq 'keys'

# Test SSH connectivity from inside the cluster
kubectl run ssh-test --rm -it --image=alpine --restart=Never -- \
  sh -c "apk add openssh-client && ssh -T -o StrictHostKeyChecking=no git@your-instance.developer.ocp.oraclecloud.com"
```

## Summary

While Flux CD does not have a dedicated bootstrap provider for Oracle VBS, setting up GitOps with VBS repositories is straightforward using the generic Git source configuration. Install Flux with `flux install`, create an SSH or HTTPS secret for VBS authentication, and configure a GitRepository source pointing to your VBS repository. This approach works on any Kubernetes cluster, including Oracle Kubernetes Engine, giving you a complete GitOps workflow within the Oracle Cloud ecosystem.
