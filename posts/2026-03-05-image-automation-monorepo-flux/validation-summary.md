# Validation Summary: How to Set Up Image Automation for Monorepo with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux image-reflector-controller
- Flux image-automation-controller
- Kubernetes manifests
- GitOps monorepo workflows

## Sources Consulted
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux CLI documentation for `flux get images`: https://fluxcd.io/flux/cmd/flux_get_images/

## Issues Found
- The verification command used `flux get image all -n flux-system`, but the current Flux CLI command is `flux get images all -n flux-system`. Updated the command to use the documented plural `images` subcommand.
- The post describes a monorepo with frontend, backend, and worker apps and says to create one ImageUpdateAutomation per application, but the per-app example and apply commands only included frontend and backend. Added the worker ImageUpdateAutomation snippet and corresponding `kubectl apply` command so the example matches the stated repository structure and guidance.

## Review Notes
The Flux API versions used in the examples (`image.toolkit.fluxcd.io/v1`) are current. The ImageRepository, ImagePolicy, ImageUpdateAutomation fields, update marker format, `Setters` strategy, and path scoping behavior match the official Flux documentation.
