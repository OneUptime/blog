# Validation Summary: How to Suspend and Resume Image Automation in Flux

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Flux CD
- Flux image automation controllers
- Kubernetes custom resources
- Flux CLI
- kubectl
- YAML manifests

## Sources Consulted
- Flux CLI documentation: `flux suspend image update` - https://fluxcd.io/flux/cmd/flux_suspend_image_update/
- Flux CLI documentation: `flux resume image update` - https://fluxcd.io/flux/cmd/flux_resume_image_update/
- Flux CLI documentation: `flux suspend image policy` - https://fluxcd.io/flux/cmd/flux_suspend_image_policy/
- Flux CLI documentation: `flux resume image policy` - https://fluxcd.io/flux/cmd/flux_resume_image_policy/
- Flux CLI documentation: `flux get images all` - https://fluxcd.io/flux/cmd/flux_get_images_all/
- Flux ImageUpdateAutomation documentation - https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux ImageRepository documentation - https://fluxcd.io/flux/components/image/imagerepositories/
- Flux Image reflector API reference v1 - https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux image update guide - https://fluxcd.io/flux/guides/image-update/

## Issues Found
- The post used `flux get image all -n flux-system` for status checks. Current Flux documentation lists the command as `flux get images all`, so this was corrected.
- The post used `flux get image policy --all-namespaces` in the selective suspension example. Current Flux documentation lists image status commands under `flux get images`, so this was corrected to `flux get images policy --all-namespaces`.
- The maintenance-window section said suspending image automation prevents deployments. Suspending `ImageUpdateAutomation` prevents new automated image update commits, but it does not stop Flux from applying other Git changes or already-committed updates. The wording was narrowed accordingly.

## Review Notes
The Flux docs recommend removing or commenting out `.spec.suspend` in Git-managed YAML when resuming, although setting it to `false` is also supported and is useful for direct `kubectl` patching. The post's patch examples are technically valid.
