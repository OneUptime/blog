# Validation Summary: How to Configure ImageRepository for Harbor in Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD image reflector controller
- Flux ImageRepository API
- Kubernetes Secrets and kubectl
- Harbor container registry
- Harbor robot accounts
- TLS and custom CA certificates

## Sources Consulted
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux image controller options: https://fluxcd.io/flux/components/image/options/
- Flux CLI documentation for `flux get images repository`: https://fluxcd.io/flux/cmd/flux_get_images_repository/
- Flux CLI documentation for `flux create image repository`: https://fluxcd.io/flux/cmd/flux_create_image_repository/
- Kubernetes documentation for `kubectl create secret docker-registry`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Harbor robot account documentation: https://goharbor.io/docs/2.14.0/administration/robot-accounts/
- Harbor project robot account documentation: https://goharbor.io/docs/2.5.0/working-with-projects/project-configuration/create-robot-accounts/

## Issues Found
- The insecure registry section recommended adding a `--insecure-registry` flag to the image-reflector-controller Deployment. Current Flux documentation does not list that controller flag; ImageRepository supports insecure HTTP registries through `.spec.insecure`. Updated the section to show `insecure: true` on the ImageRepository instead.

## Review Notes
- The `exclusionList` example is syntactically valid. Flux uses a default exclusion list for `.sig` tags only when `spec.exclusionList` is not set, so users who also want to exclude Cosign signature tags should include `^.*\\.sig$` in their custom list.
