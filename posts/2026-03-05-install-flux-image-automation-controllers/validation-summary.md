# Validation Summary: How to Install Flux Image Automation Controllers

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Flux CD
- Flux CLI
- Flux image-reflector-controller
- Flux image-automation-controller
- Kubernetes
- Kustomize
- GitHub bootstrap and deploy keys

## Sources Consulted
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux `flux bootstrap github` CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux `flux install` CLI reference: https://fluxcd.io/flux/cmd/flux_install/
- Flux `flux check` CLI reference: https://fluxcd.io/flux/cmd/flux_check/
- Flux image automation controllers documentation: https://fluxcd.io/flux/components/image/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/

## Issues Found
- The prerequisites listed Kubernetes v1.25 or later, which is outdated for current Flux releases. Updated the prerequisite to refer to Flux-supported Kubernetes versions and the current documented versions.
- The prerequisites said Flux core controllers must already be bootstrapped, but the post also covers first-time bootstrap. Replaced this with the requirement for cluster admin permissions to install or update Flux controllers.
- The post said the image automation stack consists of three controllers but listed only two. Updated the count to two, matching the official Flux image automation controller documentation.
- The GitHub bootstrap examples omitted `--read-write-key`. Added it because Flux's GitHub deploy-key flow needs write access when image automation commits changes back to the repository.
- The `flux install` section said it installs only the extra components. Updated the wording because `flux install --components-extra=...` installs or upgrades Flux with the default components plus the extra components.
- The verification command used plain `flux check`, which checks the default components unless extra components are specified. Updated it to `flux check --components-extra=image-reflector-controller,image-automation-controller`.
- The Git access section was titled as RBAC and implied source-controller-specific credentials. Updated it to describe Git credentials for the `GitRepository` referenced by `ImageUpdateAutomation`, and to mention `--read-write-key` for SSH deploy-key bootstrap.

## Review Notes
The remaining commands and CRD names match current Flux documentation. The HTTPS Secret example is valid as a generic Git credential secret, but in a real bootstrap installation users should avoid replacing an existing `flux-system` secret unless they intend to change the GitRepository authentication method.
