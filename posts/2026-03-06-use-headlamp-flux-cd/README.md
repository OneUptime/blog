# How to Use Headlamp with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Headlamp, Dashboard, Kubernetes, GitOps, UI, CNCF

Description: A practical guide to using Headlamp as a Kubernetes dashboard with Flux CD plugin support for managing GitOps workflows.

---

## Introduction

Headlamp is a CNCF Sandbox project that provides a modern, extensible Kubernetes dashboard. Unlike traditional dashboards, Headlamp supports a plugin system that allows you to add Flux CD-specific views and controls. This makes it an excellent choice for teams that want a general-purpose Kubernetes UI with deep GitOps integration.

In this guide, you will learn how to deploy Headlamp, install the Flux CD plugin, and use it to monitor and manage your GitOps deployments.

## Prerequisites

Before you begin, ensure you have:

- A running Kubernetes cluster (v1.26 or later)
- Flux CD installed and bootstrapped
- kubectl configured to access your cluster
- Helm v3 installed

Verify your environment:

```bash
# Check cluster connectivity

kubectl cluster-info

# Verify Flux is running
flux check
```

## What Is Headlamp

Headlamp is a Kubernetes web UI that offers:

- A clean, modern interface for browsing Kubernetes resources
- A plugin architecture for extending functionality
- Support for multiple clusters
- RBAC-aware views that respect user permissions
- Desktop and in-cluster deployment options
- CNCF backing ensuring long-term maintenance

## Installing Headlamp

### Method 1: In-Cluster Deployment with Helm

Create the Flux resources to deploy Headlamp via Helm:

```yaml
# headlamp-helmrepo.yaml
# HelmRepository for the Headlamp Helm chart
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: headlamp
  namespace: flux-system
spec:
  # Official Headlamp Helm chart repository
  url: https://kubernetes-sigs.github.io/headlamp/
  interval: 1h
```

```yaml
# headlamp-helmrelease.yaml
# HelmRelease to deploy Headlamp in the cluster
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: headlamp
  namespace: headlamp
spec:
  interval: 1h
  chart:
    spec:
      chart: headlamp
      version: "0.42.x"
      sourceRef:
        kind: HelmRepository
        name: headlamp
        namespace: flux-system
  # Create the namespace if it does not exist
  install:
    createNamespace: true
  values:
    # Enable the plugin system
    config:
      pluginsDir: /headlamp/plugins
    # Configure resource limits
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 256Mi
    # Persistence for plugins
    persistentVolumeClaim:
      enabled: true
      accessModes:
        - ReadWriteOnce
      size: 1Gi
      storageClassName: standard
    volumeMounts:
      - name: headlamp-plugins
        mountPath: /headlamp/plugins
    volumes:
      - name: headlamp-plugins
        persistentVolumeClaim:
          claimName: headlamp
```

Apply the resources:

```bash
kubectl create namespace headlamp
kubectl apply -f headlamp-helmrepo.yaml
kubectl apply -f headlamp-helmrelease.yaml
```

### Method 2: Desktop Application

Headlamp is also available as a desktop application:

```bash
# macOS (via Homebrew Cask)
brew install --cask headlamp

# Linux (Flatpak)
flatpak install flathub io.kinvolk.Headlamp

# Windows (via winget)
winget install Headlamp
```

The desktop version automatically connects to clusters defined in your kubeconfig.

### Verify the Installation

```bash
# Check that Headlamp is running
kubectl get pods -n headlamp

# Verify the HelmRelease is reconciled
flux get helmrelease headlamp -n headlamp
```

## Accessing Headlamp

### Creating a Service Account Token

Headlamp accepts a bearer token for authentication. For Kubernetes v1.24 and later, create a service account and generate a token with `kubectl create token`:

```yaml
# headlamp-admin-sa.yaml
# ServiceAccount for Headlamp admin access
apiVersion: v1
kind: ServiceAccount
metadata:
  name: headlamp-admin
  namespace: headlamp
---
# ClusterRoleBinding granting cluster-admin to the service account
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: headlamp-admin
subjects:
  - kind: ServiceAccount
    name: headlamp-admin
    namespace: headlamp
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
```

Apply and retrieve a token:

```bash
kubectl apply -f headlamp-admin-sa.yaml

# Get the authentication token
kubectl create token headlamp-admin -n headlamp
```

### Port Forwarding

```bash
# Forward the Headlamp service to localhost
kubectl port-forward svc/headlamp -n headlamp 8080:80
```

Open `http://localhost:8080` and paste the token to log in.

### Ingress Configuration

```yaml
# headlamp-ingress.yaml
# Ingress to expose Headlamp externally
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: headlamp
  namespace: headlamp
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - headlamp.example.com
      secretName: headlamp-tls
  rules:
    - host: headlamp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: headlamp
                port:
                  number: 80
```

## Installing the Flux CD Plugin

### Step 1: Build or Download the Plugin

The Flux plugin for Headlamp can be installed from the Headlamp desktop Plugin Catalog. For in-cluster deployments, use the official Flux plugin image.

### Step 2: Deploy the Plugin via Init Container

For in-cluster installations, copy the plugin files from the official plugin image into a shared volume:

```yaml
# flux-plugin-deployment.yaml
# Init container to install the Flux plugin
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: headlamp
  namespace: headlamp
spec:
  interval: 1h
  chart:
    spec:
      chart: headlamp
      version: "0.42.x"
      sourceRef:
        kind: HelmRepository
        name: headlamp
        namespace: flux-system
  values:
    config:
      pluginsDir: /build/plugins
    # Init container to copy the Flux plugin into a shared plugin directory
    initContainers:
      - name: headlamp-plugins
        image: ghcr.io/headlamp-k8s/headlamp-plugin-flux:latest
        imagePullPolicy: Always
        command:
          - /bin/sh
          - -c
          - mkdir -p /build/plugins && cp -r /plugins/* /build/plugins/ && chown -R 100:101 /build
        securityContext:
          runAsNonRoot: false
          privileged: false
          runAsUser: 0
          runAsGroup: 0
        volumeMounts:
          - name: headlamp-plugins
            mountPath: /build/plugins
    # Volume for plugins shared between init and main containers
    volumeMounts:
      - name: headlamp-plugins
        mountPath: /build/plugins
    volumes:
      - name: headlamp-plugins
        emptyDir: {}
```

### Step 3: Configure RBAC for the Plugin

The Flux plugin needs permissions to read Flux CRDs:

```yaml
# flux-plugin-rbac.yaml
# ClusterRole for the Flux plugin to access Flux resources
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: headlamp-flux
rules:
  # Source controller resources
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources:
      - gitrepositories
      - helmrepositories
      - ocirepositories
      - buckets
      - helmcharts
    verbs: ["get", "list", "watch"]
  # Kustomize controller resources
  - apiGroups: ["kustomize.toolkit.fluxcd.io"]
    resources:
      - kustomizations
    verbs: ["get", "list", "watch"]
  # Helm controller resources
  - apiGroups: ["helm.toolkit.fluxcd.io"]
    resources:
      - helmreleases
    verbs: ["get", "list", "watch"]
  # Notification controller resources
  - apiGroups: ["notification.toolkit.fluxcd.io"]
    resources:
      - alerts
      - providers
      - receivers
    verbs: ["get", "list", "watch"]
  # Image automation resources
  - apiGroups: ["image.toolkit.fluxcd.io"]
    resources:
      - imagerepositories
      - imagepolicies
      - imageupdateautomations
    verbs: ["get", "list", "watch"]
---
# Bind the role to the Headlamp service account
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: headlamp-flux
subjects:
  - kind: ServiceAccount
    name: headlamp-admin
    namespace: headlamp
roleRef:
  kind: ClusterRole
  name: headlamp-flux
  apiGroup: rbac.authorization.k8s.io
```

## Using Headlamp with Flux CD

### Flux Resource Views

With the plugin installed, Headlamp adds a Flux section to the sidebar with views such as:

- **Sources** - Browse source resources
- **Kustomizations** - View Kustomizations
- **HelmReleases** - View HelmReleases
- **Image Automations** and **Notifications** - View image automation and notification resources when their CRDs are installed

### Viewing Kustomization Details

Click on any Kustomization to see:

- Current status and conditions
- Source reference and revision
- Dependent resources
- Inventory resources
- Recent events

### Viewing HelmRelease Details

HelmRelease details include:

- Chart source reference and version
- Values applied to the release
- Dependent HelmReleases
- Inventory resources
- Current status and conditions

### Kubernetes Resource Correlation

Headlamp links Flux resources to inventory entries for the Kubernetes objects they manage. For example, clicking a HelmRelease can show:

- The Deployments created by the chart
- The Services and Ingresses
- ConfigMaps and Secrets

## Configuring OIDC Authentication

For production use, configure OIDC instead of service account tokens:

```yaml
# headlamp-oidc-values.yaml
# HelmRelease values for OIDC authentication
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: headlamp
  namespace: headlamp
spec:
  interval: 1h
  chart:
    spec:
      chart: headlamp
      version: "0.42.x"
      sourceRef:
        kind: HelmRepository
        name: headlamp
        namespace: flux-system
  values:
    config:
      oidc:
        # OIDC provider configuration
        clientID: headlamp
        clientSecret: your-client-secret
        issuerURL: https://dex.example.com
        callbackURL: https://headlamp.example.com/oidc-callback
        # Scopes to request from the OIDC provider
        scopes: "openid,profile,email,groups"
```

## Multi-Cluster Support

Headlamp supports managing multiple clusters from a single instance:

```bash
# Create a Secret containing kubeconfig files for the extra clusters
kubectl -n headlamp create secret generic headlamp-kubeconfigs \
  --from-file=staging=./staging.kubeconfig \
  --from-file=production=./production.kubeconfig
```

```yaml
# headlamp-multicluster-values.yaml
# HelmRelease values for loading multiple kubeconfig files
values:
  env:
    - name: KUBECONFIG
      value: /kubeconfigs/staging:/kubeconfigs/production
  volumeMounts:
    - name: kubeconfigs
      mountPath: /kubeconfigs
      readOnly: true
  volumes:
    - name: kubeconfigs
      secret:
        secretName: headlamp-kubeconfigs
```

## Troubleshooting

### Plugin Not Loading

```bash
# Check if the plugin files exist in the container
kubectl exec -n headlamp deployment/headlamp -- ls /build/plugins/

# Check Headlamp logs for plugin loading errors
kubectl logs -n headlamp deployment/headlamp

# Restart Headlamp to reload plugins
kubectl rollout restart deployment headlamp -n headlamp
```

### Token Authentication Failing

```bash
# Generate a fresh token
kubectl create token headlamp-admin -n headlamp
```

### Flux Resources Not Visible

```bash
# Verify CRDs are installed
kubectl get crd | grep toolkit.fluxcd.io

# Check RBAC permissions
kubectl auth can-i list kustomizations.kustomize.toolkit.fluxcd.io \
  --as=system:serviceaccount:headlamp:headlamp-admin
```

## Summary

Headlamp provides a modern, extensible Kubernetes dashboard that integrates well with Flux CD through its plugin system. Its CNCF backing, multi-cluster support, and flexible authentication options make it a solid choice for teams looking for a general-purpose Kubernetes UI with GitOps capabilities. By deploying Headlamp through Flux itself, you maintain a fully GitOps-managed toolchain from dashboard to deployments.
