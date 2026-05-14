# Validation Summary: How to Configure Tenant-Specific Image Policies in Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD image automation controllers
- Flux ImageRepository, ImagePolicy, and ImageUpdateAutomation APIs
- Kubernetes manifests and RBAC
- GitOps image update workflows

## Sources Consulted
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux automated image updates guide: https://fluxcd.io/flux/guides/image-update/
- Flux CLI documentation for image repository, policy, and update status commands: https://fluxcd.io/flux/cmd/flux_get_images_repository/, https://fluxcd.io/flux/cmd/flux_get_images_policy/, https://fluxcd.io/flux/cmd/flux_get_images_update/

## Issues Found
- The post described Flux image automation as controlling which images tenants can deploy or pull. Flux image automation scans registries, evaluates image policies, and commits Git updates; it does not by itself enforce runtime image admission. Updated the description, introduction, Step 5, and summary to clarify that these controls apply to Flux image automation, and added a note to use admission policy for runtime enforcement.
- The staging and production ImagePolicy examples referenced an ImageRepository in another namespace without showing the required ImageRepository cross-namespace access configuration. Added `spec.accessFrom.namespaceSelectors` to the approved ImageRepository examples so the environment namespaces can reference the shared ImageRepository.
- The verification command checked for `latestImage`, but current Flux ImagePolicy status reports the selected image under `status.latestRef`. Updated the command to grep for `latestRef`.

## Review Notes
- The Flux `image.toolkit.fluxcd.io/v1` API versions, `filterTags`, semver/alphabetical policies, image policy marker format, ImageUpdateAutomation `Setters` strategy, and listed `flux get image ...` commands match current official Flux documentation.
- The examples assume corresponding namespaces, GitRepository resources, registry secrets, and controller installation already exist.
