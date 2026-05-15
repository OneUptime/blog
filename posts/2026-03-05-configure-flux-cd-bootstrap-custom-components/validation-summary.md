# Validation Summary: How to Configure Flux CD Bootstrap with Custom Components

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI bootstrap and install commands
- Kubernetes controllers, Deployments, CRDs, RBAC, and NetworkPolicies
- Flux image automation APIs: ImageRepository, ImagePolicy, and ImageUpdateAutomation
- GitHub deploy keys for Flux bootstrap

## Sources Consulted
- Flux CLI reference: flux bootstrap - https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux CLI reference: flux bootstrap github - https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux CLI reference: flux install - https://fluxcd.io/flux/cmd/flux_install/
- Flux optional components documentation - https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux GitHub bootstrap documentation - https://fluxcd.io/flux/installation/bootstrap/github/
- Flux image update guide - https://fluxcd.io/flux/guides/image-update/
- Flux ImageUpdateAutomation documentation - https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux controller options documentation - https://fluxcd.io/flux/components/source/options/
- Flux multi-tenancy documentation - https://fluxcd.io/flux/installation/configuration/multitenancy/

## Issues Found
- The post said to add image automation later by rerunning bootstrap with `--read-write-key=true`, but the official image update guide notes that an existing read-only SSH deploy key may need rotation by deleting the `flux-system` Secret before rerunning bootstrap. I added that caveat so the command does not imply it will always upgrade an existing read-only deploy key in place.
- The image automation setup listed ImageRepository, ImagePolicy, and ImageUpdateAutomation resources, but did not mention the required image policy marker in the target YAML. Flux's `Setters` strategy only updates fields marked with `{"$imagepolicy": ...}` comments. I added a minimal Deployment example showing the marker.

## Review Notes
The Flux CLI was not installed in the local workspace, so command verification was performed against the current official Flux CLI documentation. The documented flags, default components, extra image automation components, API versions, and ImageUpdateAutomation fields are current in the official Flux docs as of this review.
