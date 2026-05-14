# Validation Summary: How to Configure ImageUpdateAutomation Include/Exclude Paths in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Image Automation
- ImageUpdateAutomation custom resources
- Kubernetes manifests and kubectl
- GitOps repository structure

## Sources Consulted
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux ImageUpdateAutomation API reference v1: https://fluxcd.io/flux/components/image/automation-api/v1/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux CLI reference for `flux get images update`: https://fluxcd.io/flux/cmd/flux_get_images_update/

## Issues Found
- The post initially said ImageUpdateAutomation supports include and exclude path configurations. Flux only documents `.spec.update.path`, an optional directory path containing manifests to update, and does not provide native include/exclude path fields. Updated the description and introduction to describe the supported update path accurately.
- The post said `update.path` can restrict updates to specific subdirectories or files. Flux documents the field as a directory containing manifests, so the wording was changed to refer to subdirectories.

## Review Notes
The YAML examples use the current `image.toolkit.fluxcd.io/v1` API and the supported `Setters` strategy. The `flux get image update --all-namespaces` command is consistent with the Flux CLI examples, and the policy marker format matches Flux documentation.
