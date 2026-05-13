# Validation Summary: How to Deploy Backstage Developer Portal with Flux CD

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Backstage
- Backstage Helm chart
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository custom resources
- Kustomize-controller Kustomization custom resources
- PostgreSQL
- GitHub OAuth and GitHub integration
- TechDocs

## Sources Consulted
- Backstage Helm chart README and values: https://github.com/backstage/charts/tree/main/charts/backstage
- Backstage chart repository: https://backstage.github.io/charts
- Backstage authentication documentation: https://backstage.io/docs/auth/
- Backstage GitHub authentication getting started guide: https://backstage.io/docs/getting-started/config/authentication/
- Backstage GitHub discovery provider documentation: https://backstage.io/docs/integrations/github/discovery/
- Backstage database configuration documentation: https://backstage.io/docs/getting-started/config/database/
- Backstage TechDocs configuration documentation: https://backstage.io/docs/features/techdocs/configuration/
- Backstage TechDocs getting started documentation: https://backstage.io/docs/features/techdocs/getting-started/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux CLI documentation for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/

## Issues Found
- The post said the official Backstage Helm chart packages "all required configuration" into the release. The chart supports injecting configuration, but a production Backstage instance still needs a custom image and application-specific config, so the wording was narrowed to "application configuration."
- The post implied GitHub authentication and catalog discovery would work from Helm values alone. Backstage requires the relevant auth provider/sign-in page and GitHub catalog backend module to be included in the custom application image, so the introduction now states that requirement.
- The Backstage database configuration omitted `password: ${POSTGRES_PASSWORD}` even though the bundled PostgreSQL instance was configured with a password. Added the password field so Backstage can authenticate to PostgreSQL.
- The `GITHUB_TOKEN` secret was created but not referenced by Backstage configuration. Added `integrations.github` with `token: ${GITHUB_TOKEN}`, which is required for GitHub catalog discovery and other GitHub integrations.
- The TechDocs example used `builder: external` with `publisher: local`, while the surrounding guide describes Backstage transforming Markdown into HTML. Updated the quick-start configuration to `builder: local`, `generator.runIn: local`, and `publisher.type: local`, matching Backstage's basic TechDocs setup for containerized deployments.
- The HelmRelease version range was pinned to the old `1.x` chart line. Updated it to `>=2.0.0 <3.0.0` to track the current Backstage chart major version.
- The Flux `Kustomization` example was shown as `clusters/my-cluster/backstage/kustomization.yaml`, the same directory it reconciles. That would conflict with Flux's handling of a directory-level `kustomization.yaml`. Updated the example path to `clusters/my-cluster/flux-system/backstage-kustomization.yaml`.

## Review Notes
- The examples assume the `fleet-repo` GitRepository already exists in `flux-system`.
- The TechDocs local publisher is acceptable for a basic setup, but production deployments should usually use external object storage and CI/CD-generated TechDocs.
- The GitHub OAuth callback URL must be configured in GitHub for the deployed backend URL, typically `https://backstage.example.com/api/auth/github/handler/frame`.
