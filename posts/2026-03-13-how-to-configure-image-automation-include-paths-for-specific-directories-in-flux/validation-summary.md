# Validation Summary: How to Configure Image Automation Include Paths for Specific Directories in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Flux ImageUpdateAutomation
- Kubernetes custom resources
- GitOps
- Shell commands

## Sources Consulted
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux CLI documentation for image update status: https://fluxcd.io/flux/cmd/flux_get_images_update/

## Issues Found
- The post described "include paths" as if Flux ImageUpdateAutomation had a separate include-paths feature. Flux currently supports scoping updates with `.spec.update.path`, not a separate include paths field. Updated the title, tags, description, introduction, section heading, and conclusion to use `update.path` terminology.
- The production branch example said changes "go through a pull request branch." Flux pushes to the configured branch; it does not create a pull request by itself. Updated the wording to say production changes are pushed to a separate branch that can be used for a pull request.
- The `find` command worked for the given directory but did not group the YAML filename predicates clearly. Updated it to `find ./clusters/production/apps \( -name "*.yaml" -o -name "*.yml" \) | head -20`.

## Review Notes
The `ImageUpdateAutomation` manifests use the current `image.toolkit.fluxcd.io/v1` API, valid `spec.git.checkout`, `spec.git.commit`, `spec.git.push`, and `spec.update.path` fields, and the supported `Setters` update strategy. The Flux CLI command shown is valid; the official command page is titled `flux get images update` but documents `flux get image update` examples as accepted usage.
