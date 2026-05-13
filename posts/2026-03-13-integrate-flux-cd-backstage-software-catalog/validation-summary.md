# Validation Summary: How to Integrate Flux CD with Backstage Software Catalog

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Backstage Software Catalog
- Backstage Kubernetes frontend and backend plugins
- Flux CD v2
- Kubernetes custom resources and RBAC
- React and TypeScript
- GitOps deployment status

## Sources Consulted
- Backstage Kubernetes plugin installation: https://backstage.io/docs/features/kubernetes/installation/
- Backstage Kubernetes plugin configuration: https://backstage.io/docs/features/kubernetes/configuration/
- Backstage `@backstage/plugin-kubernetes-react` API reference: https://backstage.io/docs/reference/plugin-kubernetes-react/
- Backstage `useKubernetesObjects` API reference: https://backstage.io/docs/reference/plugin-kubernetes-react.usekubernetesobjects/
- Backstage `@backstage/plugin-kubernetes-common` types/source: https://raw.githubusercontent.com/backstage/backstage/master/plugins/kubernetes-common/src/types.ts
- Flux Kustomization API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux HelmRelease API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux ImagePolicy documentation/API references: https://fluxcd.io/flux/components/image/imagepolicies/ and https://fluxcd.io/flux/components/image/reflector-api/v1/

## Issues Found
- The Backstage backend plugin package was installed but not registered in `packages/backend/src/index.ts`. Added the documented `backend.add(import('@backstage/plugin-kubernetes-backend'));` step.
- The Flux HelmRelease custom resource used `helm.toolkit.fluxcd.io/v2beta2`, while current Flux documentation uses `helm.toolkit.fluxcd.io/v2`. Updated the configuration snippet.
- The Flux ImagePolicy custom resource used `image.toolkit.fluxcd.io/v1beta2`, while current Flux documentation uses `image.toolkit.fluxcd.io/v1`. Updated the configuration snippet.
- The Backstage Kubernetes hook was imported from `@backstage/plugin-kubernetes`, but current API docs expose `useKubernetesObjects` from `@backstage/plugin-kubernetes-react`. Updated the import and added the package to the app install command.
- The custom card filtered Kubernetes plugin responses by `resource.type === 'kustomizations'`, but Backstage returns configured CRDs under the `customresources` response type. Updated the card to filter custom resources by Flux `apiVersion` and `kind`.
- The entity annotation section implied that catalog annotations alone identify Flux objects. Backstage also needs matching Kubernetes labels or a label selector. Added a sentence clarifying the required label/selector match.
- The RBAC example omitted several read permissions required by the default Backstage Kubernetes plugin view, including `pods/log`, standard workload/config object types, batch resources, and metrics pods. Expanded the RBAC snippet while keeping Flux custom resources read-only.
- The best-practices wording referred to syncing annotations with Flux object names. Updated it to refer to labels or selectors, which is how Backstage associates Kubernetes resources with catalog entities.

## Review Notes
The custom `flux.weave.works/*` annotations are not standard Backstage or Flux annotations, but they are technically valid custom annotations if a local Backstage component reads them for links or filtering. The example remains a starting point; production Backstage installations may also need permission framework configuration or auth-provider-specific Kubernetes settings depending on the deployment.
