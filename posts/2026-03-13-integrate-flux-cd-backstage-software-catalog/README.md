# How to Integrate Flux CD with Backstage Software Catalog

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Backstage, Platform Engineering, Developer Portal, IdP

Description: Connect Flux CD deployments with Backstage software catalog so developers can see real-time GitOps deployment status directly in their internal developer portal.

---

## Introduction

Backstage has become the de facto standard for internal developer portals. It centralizes service discovery, documentation, CI/CD status, and now - with the right integrations - GitOps deployment state. When developers can see Flux reconciliation status, active image versions, and deployment health inside Backstage, they no longer need to context-switch to kubectl or the Flux CLI.

Integrating Flux CD with Backstage closes the feedback loop between what developers build and what is actually running in production. A developer opens their service page in Backstage and immediately sees the current Flux Kustomization status, the last reconciled Git revision, and any errors that need attention - all without leaving the portal.

In this guide you will configure the Backstage Kubernetes plugin to surface Flux objects, annotate catalog entities with Flux metadata, and build a custom Backstage component that displays GitOps deployment state.

## Prerequisites

- A running Backstage instance (v1.20+)
- Flux CD v2 deployed in one or more Kubernetes clusters
- The Backstage Kubernetes plugin installed
- Kubernetes API access from the Backstage backend
- Service catalog entities (catalog-info.yaml) in your application repositories

## Step 1: Install the Backstage Kubernetes Plugin

```bash
# In your Backstage app directory
yarn --cwd packages/app add @backstage/plugin-kubernetes
yarn --cwd packages/backend add @backstage/plugin-kubernetes-backend
```

Configure the plugin in `app-config.yaml`:

```yaml
# app-config.yaml
kubernetes:
  serviceLocatorMethod:
    type: multiTenant
  clusterLocatorMethods:
    - type: config
      clusters:
        - name: production
          url: https://kubernetes.example.com
          authProvider: serviceAccount
          serviceAccountToken: ${K8S_SERVICE_ACCOUNT_TOKEN}
          caData: ${K8S_CA_DATA}
        - name: staging
          url: https://staging-kubernetes.example.com
          authProvider: serviceAccount
          serviceAccountToken: ${K8S_STAGING_TOKEN}
          caData: ${K8S_STAGING_CA_DATA}
  # Include Flux custom resources in the Kubernetes plugin view
  customResources:
    - group: kustomize.toolkit.fluxcd.io
      apiVersion: v1
      plural: kustomizations
    - group: helm.toolkit.fluxcd.io
      apiVersion: v2beta2
      plural: helmreleases
    - group: source.toolkit.fluxcd.io
      apiVersion: v1
      plural: gitrepositories
    - group: image.toolkit.fluxcd.io
      apiVersion: v1beta2
      plural: imagepolicies
```

## Step 2: Annotate Catalog Entities with Flux Metadata

Add Backstage Kubernetes annotations to your service's `catalog-info.yaml` so Backstage knows which Flux objects belong to which catalog entity.

```yaml
# catalog-info.yaml (in the application repository)
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-service
  description: The main API service for team alpha
  annotations:
    # Standard Backstage Kubernetes annotations
    backstage.io/kubernetes-id: my-service
    backstage.io/kubernetes-namespace: team-alpha

    # Flux-specific annotations for direct linking
    flux.weave.works/kustomization: team-alpha/my-service
    flux.weave.works/helm-release: team-alpha/my-service

    # Link to the source Git repository Flux is tracking
    backstage.io/source-location: url:https://github.com/acme/team-alpha-apps
    github.com/project-slug: acme/team-alpha-apps

  tags:
    - go
    - api
    - team-alpha
  links:
    - url: https://my-service.acme.example.com
      title: Production URL
      icon: web
spec:
  type: service
  lifecycle: production
  owner: team-alpha
  system: acme-platform
```

## Step 3: Configure RBAC for Backstage Service Account

Backstage needs read access to Flux custom resources in all namespaces it monitors.

```yaml
# infrastructure/backstage/rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: backstage-flux-reader
rules:
  - apiGroups: ["kustomize.toolkit.fluxcd.io"]
    resources: ["kustomizations"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["helm.toolkit.fluxcd.io"]
    resources: ["helmreleases"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources: ["gitrepositories", "ocirepositories", "helmrepositories"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["image.toolkit.fluxcd.io"]
    resources: ["imagepolicies", "imagerepositories"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods", "events", "services"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: backstage-flux-reader
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: backstage-flux-reader
subjects:
  - kind: ServiceAccount
    name: backstage
    namespace: backstage
```

## Step 4: Build a Custom Flux Status Card

Extend Backstage's entity page with a Flux status card that shows reconciliation state at a glance.

```typescript
// packages/app/src/components/FluxStatusCard/FluxStatusCard.tsx
import React from 'react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useKubernetesObjects } from '@backstage/plugin-kubernetes';
import { Card, CardHeader, CardContent, Chip } from '@material-ui/core';

export const FluxStatusCard = () => {
  const { entity } = useEntity();
  const { kubernetesObjects } = useKubernetesObjects(entity);

  const kustomizations = kubernetesObjects?.items?.flatMap(cluster =>
    cluster.resources?.flatMap(resource =>
      resource.type === 'kustomizations' ? resource.resources : []
    ) ?? []
  ) ?? [];

  return (
    <Card>
      <CardHeader title="GitOps Status (Flux CD)" />
      <CardContent>
        {kustomizations.map((k: any) => {
          const ready = k.status?.conditions?.find(
            (c: any) => c.type === 'Ready'
          );
          return (
            <div key={k.metadata.name}>
              <strong>{k.metadata.name}</strong>
              <Chip
                label={ready?.status === 'True' ? 'Ready' : 'Not Ready'}
                color={ready?.status === 'True' ? 'primary' : 'secondary'}
                size="small"
              />
              <div>Revision: {k.status?.lastAppliedRevision}</div>
              <div>Message: {ready?.message}</div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
```

## Step 5: Add the Card to the Entity Page

```typescript
// packages/app/src/components/catalog/EntityPage.tsx
import { FluxStatusCard } from '../FluxStatusCard/FluxStatusCard';

const serviceEntityPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3}>
        <Grid item md={6}>
          <EntityAboutCard variant="gridItem" />
        </Grid>
        <Grid item md={6}>
          {/* Flux GitOps status card */}
          <FluxStatusCard />
        </Grid>
        <Grid item md={12}>
          <EntityKubernetesContent />
        </Grid>
      </Grid>
    </EntityLayout.Route>
  </EntityLayout>
);
```

## Best Practices

- Use Backstage's built-in Kubernetes plugin view for raw Flux object inspection and build custom cards for curated summaries
- Sync your catalog-info.yaml annotations with the Flux object names to avoid mismatches
- Configure read-only Backstage service accounts - the portal should display state, not modify it
- Add a direct link from Backstage to the platform's GitOps repository for the selected service
- Surface Flux alerts and notifications in Backstage using a webhook integration with the Backstage events API
- Use TechDocs to link runbooks from the Backstage entity page for common Flux operational tasks

## Conclusion

Integrating Flux CD with Backstage creates a unified view of service health that spans code, CI, and GitOps deployment state. Developers get the information they need inside the tool they already use daily, reducing context switching and improving observability. The Kubernetes plugin's custom resource support makes surfacing Flux objects straightforward, and custom cards let you tailor the display to exactly the information your teams care about most.
