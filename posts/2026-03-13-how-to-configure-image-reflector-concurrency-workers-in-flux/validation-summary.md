# Validation Summary: How to Configure Image Reflector Concurrency Workers in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux image-reflector-controller
- Kubernetes Deployments
- Kustomize patches
- kubectl JSONPath
- Container registries: Docker Hub, GitHub Container Registry, Amazon ECR, Google Artifact Registry

## Sources Consulted
- Flux image reflector and automation controllers documentation: https://fluxcd.io/flux/components/image/
- Flux image controller options: https://fluxcd.io/flux/components/image/options/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux generated install manifest from the latest flux2 release: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Docker Hub pull usage and limits: https://docs.docker.com/docker-hub/usage/pulls/
- GitHub Container registry documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- Amazon ECR service quotas: https://docs.aws.amazon.com/AmazonECR/latest/userguide/service-quotas.html
- Google Artifact Registry quotas and limits: https://cloud.google.com/artifact-registry/quotas

## Issues Found
- The post described ImageRepository reconciliation as a single registry API call and implied sequential scanning. Updated the wording to "one or more API calls" and "low concurrency" because Flux defaults the controller to multiple concurrent reconciles.
- The registry rate-limit bullets included an unsupported GHCR "5,000 requests per hour" value and overly vague ECR/GAR guidance. Replaced those bullets with values and caveats from official Docker, GitHub, AWS, and Google documentation.
- The post said requests to the same registry are naturally serialized. Updated it to state that Flux does not serialize requests per registry, so users should keep concurrency lower when many ImageRepositories target one rate-limited registry.
- The verification command rendered the args array as a single JSONPath result and then split on commas, which would not reliably print one argument per line. Replaced it with a JSONPath range over the args list.

## Review Notes
The `--concurrent` flag and its default value of `4` are documented for the image-reflector-controller. The Kustomize patch format is valid for a Flux bootstrap repository, and the core Deployment arguments shown in the patch match the current Flux generated install manifest with the added concurrency flag.
