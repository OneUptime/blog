# How to Use Flux CD with Backstage Developer Portal

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, backstage, developer portal, kubernetes, gitops, internal developer platform, spotify

Description: A practical guide to integrating Flux CD with the Backstage developer portal for unified service catalog and GitOps visibility.

---

## Introduction

Backstage is an open-source developer portal originally created by Spotify. It provides a centralized platform for managing services, documentation, and infrastructure. By integrating Flux CD with Backstage, your development teams get a unified view of their services alongside GitOps deployment status, reconciliation history, and source information.

In this guide, you will learn how to set up the Flux CD plugin for Backstage, configure the Kubernetes integration, and create service catalog entries that display Flux CD deployment information.

## Prerequisites

Before you begin, ensure you have:

- A running Kubernetes cluster with Flux CD installed
- A Backstage instance (v1.20 or later)
- Node.js 18 or later
- kubectl configured to access your cluster

```bash
# Verify Flux is running
flux check

# Verify your Backstage instance
cd /path/to/backstage
yarn --version
```

## Setting Up Backstage

### Creating a New Backstage Instance

If you do not have a Backstage instance yet:

```bash
# Create a new Backstage app
npx @backstage/create-app@latest

# Navigate to the app directory
cd my-backstage-app

# Start the development server
yarn dev
```

### Installing the Kubernetes Plugin

Backstage needs the Kubernetes plugin to communicate with your cluster:

```bash
# Install the Kubernetes backend plugin
yarn --cwd packages/backend add @backstage/plugin-kubernetes-backend

# Install the Kubernetes frontend plugin
yarn --cwd packages/app add @backstage/plugin-kubernetes
```

## Configuring Kubernetes Integration

### Backend Configuration

Add Kubernetes cluster configuration to your `app-config.yaml`:

```yaml
# app-config.yaml
# Kubernetes integration configuration for Backstage
kubernetes:
  # Service locator method
  serviceLocatorMethod:
    type: multiTenant
  # Cluster configuration
  clusterLocatorMethods:
    - type: config
      clusters:
        - name: production
          # Kubernetes API server URL
          url: https://kubernetes.default.svc.cluster.local
          # Authentication method
          authProvider: serviceAccount
          # Skip TLS verification for development (use proper certs in production)
          skipTLSVerify: false
          # Path to the CA certificate
          caFile: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
          # Service account token for authentication
          serviceAccountToken:
            $env: K8S_SERVICE_ACCOUNT_TOKEN
          # Custom resources to fetch (Flux CRDs)
          customResources:
            # Flux Kustomizations
            - group: kustomize.toolkit.fluxcd.io
              apiVersion: v1
              plural: kustomizations
            # Flux HelmReleases
            - group: helm.toolkit.fluxcd.io
              apiVersion: v1
              plural: helmreleases
            # Flux GitRepositories
            - group: source.toolkit.fluxcd.io
              apiVersion: v1
              plural: gitrepositories
            # Flux HelmRepositories
            - group: source.toolkit.fluxcd.io
              apiVersion: v1
              plural: helmrepositories
```

### Creating a Service Account for Backstage

```yaml
# backstage-sa.yaml
# Service account for Backstage to read Kubernetes resources
apiVersion: v1
kind: ServiceAccount
metadata:
  name: backstage
  namespace: backstage
---
# ClusterRole for reading Flux and Kubernetes resources
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: backstage-reader
rules:
  # Core Kubernetes resources
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps", "namespaces"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets", "statefulsets"]
    verbs: ["get", "list", "watch"]
  # Flux source resources
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources: ["gitrepositories", "helmrepositories", "ocirepositories"]
    verbs: ["get", "list", "watch"]
  # Flux kustomize resources
  - apiGroups: ["kustomize.toolkit.fluxcd.io"]
    resources: ["kustomizations"]
    verbs: ["get", "list", "watch"]
  # Flux helm resources
  - apiGroups: ["helm.toolkit.fluxcd.io"]
    resources: ["helmreleases"]
    verbs: ["get", "list", "watch"]
  # Flux notification resources
  - apiGroups: ["notification.toolkit.fluxcd.io"]
    resources: ["alerts", "providers", "receivers"]
    verbs: ["get", "list", "watch"]
---
# Bind the ClusterRole to the Backstage service account
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: backstage-reader
subjects:
  - kind: ServiceAccount
    name: backstage
    namespace: backstage
roleRef:
  kind: ClusterRole
  name: backstage-reader
  apiGroup: rbac.authorization.k8s.io
---
# Long-lived token for the service account
apiVersion: v1
kind: Secret
metadata:
  name: backstage-token
  namespace: backstage
  annotations:
    kubernetes.io/service-account.name: backstage
type: kubernetes.io/service-account-token
```

Apply and get the token:

```bash
kubectl create namespace backstage
kubectl apply -f backstage-sa.yaml

# Get the service account token
export K8S_SERVICE_ACCOUNT_TOKEN=$(kubectl get secret backstage-token \
  -n backstage -o jsonpath='{.data.token}' | base64 -d)
```

## Installing the Flux CD Plugin for Backstage

### Adding the Plugin

Install the Flux CD plugin for Backstage:

```bash
# Install the Flux plugin for the frontend
yarn --cwd packages/app add @weaveworks/backstage-plugin-flux
```

### Registering the Plugin

Add the Flux plugin to your Backstage app:

```typescript
// packages/app/src/components/catalog/EntityPage.tsx
// Import the Flux CD plugin components
import {
  FluxEntityKustomizationsCard,
  FluxEntityHelmReleasesCard,
  FluxEntityGitRepositoriesCard,
  FluxEntitySourcesCard,
} from '@weaveworks/backstage-plugin-flux';

// Add Flux cards to the service entity page
const serviceEntityPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3}>
        {/* Existing cards */}
        <Grid item md={6}>
          <EntityAboutCard />
        </Grid>

        {/* Flux CD cards */}
        <Grid item md={6}>
          <FluxEntityKustomizationsCard />
        </Grid>
        <Grid item md={6}>
          <FluxEntityHelmReleasesCard />
        </Grid>
        <Grid item md={6}>
          <FluxEntityGitRepositoriesCard />
        </Grid>
      </Grid>
    </EntityLayout.Route>

    {/* Dedicated Flux tab */}
    <EntityLayout.Route path="/flux" title="GitOps">
      <Grid container spacing={3}>
        <Grid item md={12}>
          <FluxEntityKustomizationsCard />
        </Grid>
        <Grid item md={12}>
          <FluxEntityHelmReleasesCard />
        </Grid>
        <Grid item md={12}>
          <FluxEntitySourcesCard />
        </Grid>
      </Grid>
    </EntityLayout.Route>
  </EntityLayout>
);
```

## Creating Service Catalog Entries

### Annotating Services for Flux

Create catalog entries with Flux CD annotations:

```yaml
# catalog-info.yaml
# Backstage catalog entry for a service managed by Flux CD
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payment-service
  description: Payment processing service
  annotations:
    # Link to the Kubernetes resources
    backstage.io/kubernetes-id: payment-service
    # Kubernetes namespace where the service runs
    backstage.io/kubernetes-namespace: payments
    # Kubernetes label selector for finding pods
    backstage.io/kubernetes-label-selector: app=payment-service
    # Flux Kustomization reference
    flux.weave.works/kustomization: flux-system/payment-service
    # Flux HelmRelease reference (if using Helm)
    flux.weave.works/helmrelease: payments/payment-service
  tags:
    - payments
    - golang
    - flux
spec:
  type: service
  lifecycle: production
  owner: team-payments
  system: payment-platform
```

### Multi-Environment Catalog Entry

For services deployed to multiple environments:

```yaml
# catalog-info-multi-env.yaml
# Backstage catalog entry with multiple environment annotations
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: api-gateway
  description: API Gateway service
  annotations:
    backstage.io/kubernetes-id: api-gateway
    # Reference multiple Flux resources for different environments
    flux.weave.works/kustomization: |
      flux-system/api-gateway-staging,
      flux-system/api-gateway-production
  links:
    - url: https://github.com/myorg/api-gateway
      title: Source Code
    - url: https://grafana.example.com/d/api-gateway
      title: Dashboard
spec:
  type: service
  lifecycle: production
  owner: team-platform
  system: api-platform
```

## Building Custom Flux Dashboards in Backstage

### Creating a Flux Overview Page

Add a dedicated Flux overview page to Backstage:

```typescript
// packages/app/src/components/flux/FluxOverviewPage.tsx
// Custom page showing all Flux resources across the organization
import React from 'react';
import {
  Header,
  Page,
  Content,
  ContentHeader,
} from '@backstage/core-components';
import { Grid } from '@material-ui/core';
import {
  FluxKustomizationsTable,
  FluxHelmReleasesTable,
  FluxSourcesTable,
} from '@weaveworks/backstage-plugin-flux';

// FluxOverviewPage shows a summary of all Flux resources
export const FluxOverviewPage = () => (
  <Page themeId="tool">
    <Header title="GitOps Overview" subtitle="Flux CD Status" />
    <Content>
      <ContentHeader title="Kustomizations" />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FluxKustomizationsTable />
        </Grid>
      </Grid>

      <ContentHeader title="Helm Releases" />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FluxHelmReleasesTable />
        </Grid>
      </Grid>

      <ContentHeader title="Sources" />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FluxSourcesTable />
        </Grid>
      </Grid>
    </Content>
  </Page>
);
```

Register the page in your app routes:

```typescript
// packages/app/src/App.tsx
import { FluxOverviewPage } from './components/flux/FluxOverviewPage';

const routes = (
  <FlatRoutes>
    {/* Other routes */}
    <Route path="/flux" element={<FluxOverviewPage />} />
  </FlatRoutes>
);
```

## Deploying Backstage with Flux CD

### Managing Backstage Through GitOps

Deploy Backstage itself using Flux CD:

```yaml
# backstage-helmrelease.yaml
# HelmRelease to deploy Backstage via Flux
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: backstage
  namespace: backstage
spec:
  interval: 1h
  chart:
    spec:
      chart: backstage
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: backstage
        namespace: flux-system
  values:
    # Backstage application configuration
    backstage:
      image:
        # Use your custom Backstage image with plugins installed
        registry: ghcr.io
        repository: myorg/backstage
        tag: latest
      # Mount the app-config as a ConfigMap
      extraAppConfig:
        - filename: app-config.production.yaml
          configMapRef: backstage-config
      # Environment variables for secrets
      extraEnvVarsSecrets:
        - backstage-secrets
    # PostgreSQL for the Backstage catalog
    postgresql:
      enabled: true
      auth:
        existingSecret: backstage-db-credentials
```

```yaml
# backstage-config.yaml
# ConfigMap with Backstage production configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: backstage-config
  namespace: backstage
data:
  app-config.production.yaml: |
    app:
      baseUrl: https://backstage.example.com
    backend:
      baseUrl: https://backstage.example.com
      database:
        client: pg
        connection:
          host: ${POSTGRES_HOST}
          port: ${POSTGRES_PORT}
          user: ${POSTGRES_USER}
          password: ${POSTGRES_PASSWORD}
    kubernetes:
      serviceLocatorMethod:
        type: multiTenant
      clusterLocatorMethods:
        - type: config
          clusters:
            - name: production
              url: https://kubernetes.default.svc.cluster.local
              authProvider: serviceAccount
              serviceAccountToken: ${K8S_SERVICE_ACCOUNT_TOKEN}
              customResources:
                - group: kustomize.toolkit.fluxcd.io
                  apiVersion: v1
                  plural: kustomizations
                - group: helm.toolkit.fluxcd.io
                  apiVersion: v1
                  plural: helmreleases
```

## Setting Up Software Templates

### Flux-Enabled Service Template

Create a Backstage software template that sets up Flux CD resources:

```yaml
# templates/flux-service/template.yaml
# Backstage template for creating a new service with Flux CD
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: flux-service-template
  title: Flux CD Service
  description: Create a new service with Flux CD GitOps deployment
spec:
  owner: team-platform
  type: service
  parameters:
    - title: Service Information
      required:
        - name
        - owner
      properties:
        name:
          title: Service Name
          type: string
          description: Name of the service
        owner:
          title: Owner
          type: string
          description: Team that owns this service
          ui:field: OwnerPicker
        namespace:
          title: Kubernetes Namespace
          type: string
          default: default
  steps:
    # Step 1: Create the service repository
    - id: create-repo
      name: Create Repository
      action: publish:github
      input:
        repoUrl: github.com?owner=myorg&repo=${{ parameters.name }}
        description: ${{ parameters.name }} service

    # Step 2: Create Flux resources in the fleet repo
    - id: create-flux-resources
      name: Create Flux Resources
      action: publish:github:pull-request
      input:
        repoUrl: github.com?owner=myorg&repo=fleet-infra
        title: "Add Flux resources for ${{ parameters.name }}"
        branchName: add-${{ parameters.name }}
        description: "Add Kustomization and HelmRelease for ${{ parameters.name }}"

    # Step 3: Register in Backstage catalog
    - id: register
      name: Register in Catalog
      action: catalog:register
      input:
        repoContentsUrl: ${{ steps['create-repo'].output.repoContentsUrl }}
        catalogInfoPath: /catalog-info.yaml
```

## Troubleshooting

### Flux Resources Not Appearing in Backstage

```bash
# Verify the Kubernetes plugin can reach the cluster
# Check Backstage backend logs for connection errors

# Ensure custom resources are configured in app-config.yaml
# Verify RBAC permissions for the Backstage service account
kubectl auth can-i list kustomizations.kustomize.toolkit.fluxcd.io \
  --as=system:serviceaccount:backstage:backstage

# Check that annotations on the catalog entity match actual Flux resources
flux get kustomization -n flux-system
```

### Plugin Rendering Issues

```bash
# Clear the Backstage cache
yarn --cwd packages/app clean

# Rebuild the frontend
yarn --cwd packages/app build

# Check for JavaScript console errors in the browser
```

## Summary

Integrating Flux CD with Backstage creates a powerful internal developer platform where teams can see their services, documentation, and GitOps deployment status in one place. The Flux plugin provides real-time visibility into Kustomizations, HelmReleases, and source status directly from the service catalog. By deploying Backstage through Flux CD itself, you achieve a fully self-referential GitOps workflow where the developer portal is managed by the same tools it displays.
