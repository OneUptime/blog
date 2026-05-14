# Validation Summary: How to Migrate Image Automation from Flux v1 to v2

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Flux CD v1 and v2
- Flux Image Reflector Controller
- Flux Image Automation Controller
- Kubernetes manifests and annotations
- GitOps image update automation
- Container registry authentication

## Sources Consulted
- Flux image update automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux v1 image automation migration guide: https://fluxcd.io/flux/migration/flux-v1-automation-migration/
- Flux CLI documentation for install, get, reconcile, suspend, and check commands: https://fluxcd.io/flux/cmd/

## Issues Found
- The Deployment marker example placed the `{"$imagepolicy": ...}` marker on a separate comment line. Flux requires setter markers to be inline comments on the target YAML field, so the example was corrected to put the marker on the `image:` line.
- The "update just the tag portion" example used the full-image marker, which updates the whole image reference. It was replaced with separate `repository` and `tag` fields using the `:name` and `:tag` marker variants.
- The mapping table implied Flux v1 `glob:` and `regex:` filters map directly to `filterTags` alone. Flux v2 no longer selects images by build time, so the table now notes that `filterTags` must be combined with alphabetical or numerical sorting on sortable tags.
- The mapping table treated `fluxcd.io/locked` as equivalent only to suspending the entire `ImageUpdateAutomation`. The wording now describes scope-appropriate Flux v2 options, including removing a marker, suspending an `ImageRepository`, or suspending the automation.

## Review Notes
The post uses the current stable `image.toolkit.fluxcd.io/v1` and `source.toolkit.fluxcd.io/v1` API groups. The CLI examples match current Flux command documentation. Future improvements could mention that Flux image automation components are optional extras and that bootstrapped installations usually need the same `--components-extra` setting in their bootstrap workflow.
