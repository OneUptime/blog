# Validation Summary: Flux CD vs ArgoCD: CLI vs UI Approach

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Flux CD
- Argo CD
- GitOps
- Kubernetes custom resources
- Flux CLI
- Argo CD CLI
- HelmRelease, Kustomization, GitRepository, OCIRepository, and Application manifests

## Sources Consulted
- Flux CLI command reference: https://fluxcd.io/flux/cmd/flux/
- Flux `create kustomization` command reference: https://fluxcd.io/flux/cmd/flux_create_kustomization/
- Flux `export source git` command reference: https://fluxcd.io/flux/cmd/flux_export_source_git/
- Flux `export kustomization` command reference: https://fluxcd.io/flux/cmd/flux_export_kustomization/
- Flux `export helmrelease` command reference: https://fluxcd.io/flux/cmd/flux_export_helmrelease/
- Flux `events` command reference: https://fluxcd.io/flux/cmd/flux_events/
- Flux Kustomization API documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux OCIRepository API documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux notification Provider and Alert documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux UI ecosystem documentation: https://fluxcd.io/flux/
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/installation/
- Argo CD getting started documentation: https://argo-cd.readthedocs.io/en/latest/getting_started/
- Argo CD sync windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD CLI command references for `app set`, `app resources`, `app logs`, and `admin initial-password`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/
- Argo CD web-based terminal documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/web_based_terminal/
- Capacitor Flux UI announcement: https://fluxcd.io/blog/2024/02/introducing-capacitor/

## Issues Found
- The Argo CD login command omitted `--insecure` while using a local port-forward to the HTTPS server. Added `--insecure`, matching the Argo CD getting started guidance for this setup.
- The Argo CD Application manifest placed `metadata.annotations` under `spec` and included `syncWindows` directly in an Application. Moved notifications annotations to top-level metadata and replaced the invalid `syncWindows` block with a short note that sync windows are configured on AppProjects.
- The UI feature list said pod terminal access was available through the UI without qualification. Updated it to say terminal access is optional and depends on enabling the web terminal.
- The Flux UI example used the old Weave GitOps Helm repository, which currently fails TLS checks and is stale. Replaced it with the Capacitor OCIRepository/Kustomization example from Flux ecosystem documentation.
- The Flux backup commands used invalid export syntax such as `flux export source all`, `flux export kustomization all`, and `flux export helmrelease all`. Changed them to the documented `--all` form and explicit source subcommands.

## Review Notes
The operational footprint numbers are approximate and can vary substantially by cluster size, HA mode, controller configuration, and requested resources. They are acceptable as illustrative guidance, but future revisions should avoid treating those figures as guaranteed defaults.
