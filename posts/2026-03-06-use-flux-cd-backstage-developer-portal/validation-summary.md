# Validation Summary: How to Use Flux CD with Backstage Developer Portal

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Backstage
- Backstage Kubernetes plugin
- Backstage Flux plugin
- Flux CD
- Kubernetes RBAC and ServiceAccounts
- HelmRelease, Kustomization, and Flux source custom resources
- Backstage Software Templates

## Sources Consulted
- Backstage Kubernetes plugin installation: https://backstage.io/docs/features/kubernetes/installation
- Backstage Kubernetes plugin configuration and catalog annotations: https://backstage.io/docs/features/kubernetes/configuration
- Backstage configuration includes and environment variables: https://backstage.io/docs/conf/writing/
- Backstage community Flux plugin README: https://github.com/backstage/community-plugins/blob/main/workspaces/flux/plugins/flux/README.md
- Flux ecosystem page for the Backstage Flux plugin: https://fluxcd.io/ecosystem
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux source API v1 reference: https://fluxcd.io/flux/components/source/api/v1/
- Kubernetes ServiceAccount token Secret documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes `kubectl auth can-i` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Backstage Helm chart values: https://artifacthub.io/packages/helm/backstage/backstage

## Issues Found
- The post installed the deprecated `@weaveworks/backstage-plugin-flux` package and used component names that do not match the maintained plugin API. Changed the installation and imports to `@backstage-community/plugin-flux` with `EntityFlux*` components and `FluxRuntimePage`.
- The post used `flux.weave.works/*` catalog annotations to map Flux resources to Backstage entities. The Flux plugin uses Backstage's Kubernetes common label, so the examples now use `backstage.io/kubernetes-id` on the entity and labels on Flux resources.
- The custom Flux overview page referenced table components that are not documented by the maintained plugin. Replaced the example with the documented `FluxRuntimePage`.
- The Kubernetes custom resource configuration omitted `OCIRepository`, which is displayed by the Flux sources card. Added the `ocirepositories` custom resource.
- The RBAC example omitted some Flux source resources used by the plugin. Added `buckets` and `helmcharts` to the source-controller resource permissions.
- The Kubernetes plugin installation commands did not mention registering the backend plugin. Added the current backend registration snippet.
- The prerequisites pinned Node.js to "18 or later", which is no longer an accurate evergreen requirement for current Backstage releases. Changed this to require a Node.js version supported by the selected Backstage release.
- The troubleshooting section included `yarn --cwd packages/app clean`, which is not a reliable Backstage app command. Removed it and kept the build verification command.
- The introduction and summary implied reconciliation history and real-time behavior. Adjusted the wording to reconciliation state and current visibility, which better matches the Flux plugin's documented behavior.

## Review Notes
The Helm chart and scaffolder examples are still illustrative and depend on the Backstage chart version and locally registered scaffolder actions. The post now avoids incorrect plugin APIs and resource mapping, but production deployments should still pin chart versions and verify action availability in the target Backstage instance.
