# How to Deploy JupyterHub on Kubernetes with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, JupyterHub, Data Science, HelmRelease, Notebooks

Description: Learn how to deploy JupyterHub multi-user notebook server to Kubernetes using Flux CD HelmRelease for a GitOps-managed data science platform.

---

## Introduction

JupyterHub enables data science teams to run Jupyter notebooks in a shared Kubernetes environment, where each user gets their own isolated notebook server with dedicated resources. Managing JupyterHub configuration through Flux CD ensures that changes to user profiles, resource limits, authentication, and notebook images are reviewed in Git before being applied to the cluster.

The Zero to JupyterHub Helm chart is the standard way to deploy JupyterHub on Kubernetes. It handles user pod lifecycle, persistent storage, authentication (OAuth, LDAP), and single-user notebook server configuration. By wrapping this chart in a Flux HelmRelease, you get version-controlled JupyterHub configuration with automatic reconciliation and drift detection.

In this guide you will deploy JupyterHub using Flux CD with GitHub OAuth authentication, configurable user profiles with different resource tiers, and persistent storage for notebook files.

## Prerequisites

- A Kubernetes cluster with Flux CD installed (minimum 4 CPUs, 8GB RAM)
- `kubectl` and `flux` CLI tools installed
- A GitHub OAuth application for authentication
- A StorageClass supporting ReadWriteOnce PVCs for user home directories
- Basic understanding of JupyterHub configuration

## Step 1: Add the JupyterHub HelmRepository

```yaml
# clusters/production/sources/jupyterhub.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: jupyterhub
  namespace: flux-system
spec:
  interval: 1h
  url: https://hub.jupyter.org/helm-chart/
```

## Step 2: Create the GitHub OAuth Secret

Store the GitHub OAuth credentials as a Kubernetes Secret (use SOPS in production).

```yaml
# clusters/production/secrets/jupyterhub-oauth-secret.yaml
# Encrypt this with SOPS before committing to Git
apiVersion: v1
kind: Secret
metadata:
  name: jupyterhub-oauth
  namespace: jupyterhub
type: Opaque
stringData:
  clientId: "your-github-oauth-client-id"
  clientSecret: "your-github-oauth-client-secret"
```

## Step 3: Deploy JupyterHub

```yaml
# clusters/production/apps/jupyterhub-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: jupyterhub
  namespace: flux-system
spec:
  interval: 1h
  targetNamespace: jupyterhub
  createNamespace: true
  chart:
    spec:
      chart: jupyterhub
      version: "3.x"
      sourceRef:
        kind: HelmRepository
        name: jupyterhub
  # Allow more time for JupyterHub to install
  install:
    timeout: 15m
  upgrade:
    timeout: 15m
  values:
    # Hub configuration
    hub:
      config:
        # GitHub OAuth authenticator
        GitHubOAuthenticator:
          client_id:
            valueFrom:
              secretKeyRef:
                name: jupyterhub-oauth
                key: clientId
          client_secret:
            valueFrom:
              secretKeyRef:
                name: jupyterhub-oauth
                key: clientSecret
          oauth_callback_url: "https://jupyter.myorg.com/hub/oauth_callback"
          # Restrict to your organization's members
          allowed_organizations:
            - myorg
          scope:
            - read:org
        JupyterHub:
          authenticator_class: github
      resources:
        requests:
          cpu: 200m
          memory: 512Mi
        limits:
          cpu: 1000m
          memory: 1Gi

    # Proxy for ingress
    proxy:
      service:
        type: ClusterIP
      https:
        enabled: false  # Use external ingress with TLS termination

    # Ingress configuration
    ingress:
      enabled: true
      ingressClassName: nginx
      annotations:
        cert-manager.io/cluster-issuer: letsencrypt-prod
        nginx.ingress.kubernetes.io/proxy-body-size: 100m
        nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
      hosts:
        - jupyter.myorg.com
      tls:
        - secretName: jupyterhub-tls
          hosts:
            - jupyter.myorg.com

    # Single-user server (notebook) configuration
    singleuser:
      # Default notebook image
      image:
        name: jupyter/scipy-notebook
        tag: "2024-01-15"
      # Default resource allocation
      cpu:
        limit: 2
        guarantee: 0.5
      memory:
        limit: 4G
        guarantee: 1G
      # Persistent storage for user notebooks
      storage:
        type: dynamic
        capacity: 10Gi
        dynamic:
          storageClass: standard
      # User profiles with different resource tiers
      profileList:
        - display_name: "Standard (2 CPU, 4GB RAM)"
          description: "Standard compute for general data analysis"
          default: true
          kubespawner_override:
            cpu_limit: 2
            cpu_guarantee: 0.5
            mem_limit: "4G"
            mem_guarantee: "1G"

        - display_name: "Large (8 CPU, 16GB RAM)"
          description: "Large compute for intensive model training"
          kubespawner_override:
            cpu_limit: 8
            cpu_guarantee: 2
            mem_limit: "16G"
            mem_guarantee: "4G"

        - display_name: "GPU (4 CPU, 8GB RAM, 1 GPU)"
          description: "GPU-enabled environment for deep learning"
          kubespawner_override:
            cpu_limit: 4
            mem_limit: "8G"
            extra_resource_limits:
              nvidia.com/gpu: "1"
            image: jupyter/tensorflow-notebook:2024-01-15

    # Scheduling configuration
    scheduling:
      userScheduler:
        enabled: true
      podPriority:
        enabled: true
      userPlaceholder:
        enabled: true
        replicas: 5

    # Culling idle servers to save resources
    cull:
      enabled: true
      timeout: 3600    # Cull after 1 hour of inactivity
      every: 300       # Check every 5 minutes
      maxAge: 86400    # Max 24 hours regardless of activity
```

## Step 4: Configure User Environment with Custom Images

Build and manage custom notebook images for your data science team.

```yaml
# apps/jupyterhub/custom-image-helmrelease-patch.yaml
# Add to the singleuser profileList:
profileList:
  - display_name: "Data Science (Custom Image)"
    description: "Pre-installed with company data science libraries"
    kubespawner_override:
      image: myregistry/ds-notebook:2024.03
      cpu_limit: 4
      mem_limit: "8G"
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/production/apps/jupyterhub-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: jupyterhub
  namespace: flux-system
spec:
  interval: 30m    # JupyterHub is stable; sync less frequently
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./clusters/production/apps/jupyterhub
  prune: true
  wait: true
  timeout: 20m
```

## Step 6: Apply and Verify

```bash
# Apply all JupyterHub resources
kubectl apply -f clusters/production/sources/jupyterhub.yaml
flux reconcile helmrelease jupyterhub --with-source -n flux-system

# Watch the installation progress
flux get helmrelease jupyterhub -n flux-system --watch

# Check all JupyterHub pods are running
kubectl get pods -n jupyterhub

# Verify the hub is accessible
kubectl get ingress -n jupyterhub

# Check hub logs
kubectl logs -n jupyterhub -l component=hub -f

# List active user servers
kubectl get pods -n jupyterhub -l component=singleuser-server
```

## Step 7: Update User Profiles

To add or modify user resource profiles, update the HelmRelease in Git.

```bash
# After pushing the profile changes to Git
flux reconcile helmrelease jupyterhub --with-source

# Existing user servers are not affected until they restart
# New profile options are available immediately to new sessions

# View the current values applied
helm get values jupyterhub -n jupyterhub
```

## Best Practices

- Use SOPS to encrypt OAuth client secrets before committing to Git
- Set culling policies to automatically shut down idle servers and reduce costs
- Create custom Docker images with pre-installed libraries rather than installing packages in notebooks
- Use node affinity or taints to schedule GPU user servers on GPU nodes
- Set storage quotas on PVCs to prevent users from filling the cluster storage
- Enable `userScheduler` to efficiently bin-pack user pods onto the fewest nodes

## Conclusion

Deploying JupyterHub on Kubernetes with Flux CD gives your data science platform the same GitOps discipline as your application infrastructure. User profiles, resource quotas, authentication settings, and notebook images are all managed in Git, reviewed in pull requests, and applied automatically by Flux. When you need to update resource limits or add a new GPU-enabled profile, a Git commit triggers the update, and Flux reconciles the change without manual Helm commands.
