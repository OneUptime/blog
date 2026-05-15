# Validation Summary: How to Create an ImagePolicy in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- Flux image-reflector-controller
- Flux ImageRepository
- Flux ImagePolicy
- Flux ImageUpdateAutomation
- kubectl
- Flux CLI
- Go regular expressions

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux CLI `flux create image policy` documentation: https://fluxcd.io/flux/cmd/flux_create_image_policy/
- Flux CLI `flux get images policy` documentation: https://fluxcd.io/flux/cmd/flux_get_images_policy/
- Go regexp package documentation: https://pkg.go.dev/regexp

## Issues Found
No technical issues found.

## Review Notes
The current Flux CLI documentation lists the command page as `flux get images policy`, while its examples still show `flux get image policy`. The post uses the singular form shown in the official examples, so no change was made.
