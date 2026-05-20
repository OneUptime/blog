# Validation Summary: How to Use OCI Artifacts as Application Sources in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD Helm sources
- Argo CD native OCI sources
- Helm OCI registries
- Kubernetes Secrets
- OCI container registries
- GitHub Actions
- Registry inspection tools (`crane`, `skopeo`)

## Sources Consulted
- Argo CD OCI user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/oci/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/helm/
- Argo CD private repositories guide: https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/
- Argo CD multiple sources guide: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD tracking and deployment strategies: https://argo-cd.readthedocs.io/en/stable/user-guide/tracking_strategies/
- Helm OCI registries documentation: https://helm.sh/docs/v3/topics/registries/
- Helm push command reference: https://helm.sh/docs/helm/helm_push/
- Docker Registry HTTP API V2 specification: https://distribution.github.io/distribution/spec/api/

## Issues Found
- The introduction treated all Argo CD OCI usage as one source mode. Updated it to distinguish OCI Helm charts from Argo CD's native OCI application source support.
- The "Multi-architecture support" benefit was misleading for this Helm chart workflow. Replaced it with standard registry tooling, which applies directly to the examples in the post.
- The Helm `repoURL` explanation implied Argo CD detects OCI solely from `chart` plus a non-Git URL. Updated it to clarify that Helm OCI repository credentials must be registered with OCI support enabled.
- The registry registration section implied every OCI registry must be registered before use. Updated it to clarify that registration is needed for private registries or centrally managed connections.
- The version management section described semver constraints as registry-dependent. Updated it to clarify that Argo CD resolves Helm chart version constraints from registry tags.
- The digest security example used `targetRevision: sha256:...` without showing the native OCI source syntax. Updated it to show `repoURL: oci://...`, `targetRevision`, and `path: .`, and clarified that Helm OCI chart examples should pin exact chart versions.

## Review Notes
Helm and Argo CD CLIs were not installed in the local environment, so CLI flags and configuration fields were verified against official documentation instead of local `--help` output.
