# Validation Summary: How to Troubleshoot ImageRepository Scan Failures in Flux

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Flux CD
- Flux image-reflector-controller
- Flux ImageRepository and ImagePolicy resources
- Flux notification Alert resources
- Kubernetes kubectl commands and Secrets
- Container registries, Docker Hub, and AWS ECR

## Sources Consulted
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux Image reflector API reference v1: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux CLI `flux get images repository`: https://fluxcd.io/flux/cmd/flux_get_images_repository/
- Flux CLI `flux reconcile image repository`: https://fluxcd.io/flux/cmd/flux_reconcile_image_repository/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Docker Hub usage and limits: https://docs.docker.com/docker-hub/usage/storage/
- Amazon ECR private registry authentication: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html

## Issues Found
- The connectivity test comment said it tested from the controller pod's network namespace, but `kubectl run` creates a separate temporary pod. Changed the comment to say it tests from a temporary pod in the same namespace.
- The tag filtering command comment said it listed all tags discovered by the ImageRepository, but `.status.lastScanResult` exposes scan metadata including `tagCount` and a latest-tags sample, not the full internal tag database. Updated the comment to describe the output accurately.
- The Alert manifest used `notification.toolkit.fluxcd.io/v1`, but current Flux Alert examples and documentation use `notification.toolkit.fluxcd.io/v1beta3`. Updated the API version.

## Review Notes
The ImageRepository `apiVersion`, `secretRef`, `certSecretRef`, Docker registry secret usage, reconcile command, Docker Hub unauthenticated pull limit, and AWS ECR 12-hour token lifetime were validated against official documentation. Flux also supports cloud-provider authentication through `.spec.provider` values such as `aws`, which could be a useful future expansion for the ECR section.
