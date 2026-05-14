# Validation Summary: How to Handle Rate Limiting from Container Registries in Flux CD

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Flux CD image-reflector-controller and image automation APIs
- Flux ImageRepository and ImagePolicy custom resources
- Flux HelmRepository and HelmRelease custom resources
- Docker Hub pull limits and registry authentication
- GitHub Container Registry / GitHub Packages
- AWS ECR and IRSA authentication
- Google Artifact Registry authentication
- Harbor proxy cache
- Kubernetes Secrets, Kustomize patches, and kubectl
- Prometheus and Grafana monitoring

## Sources Consulted
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux CLI documentation for suspending ImageRepository resources: https://fluxcd.io/flux/cmd/flux_suspend_image_repository/
- Flux CLI documentation for getting ImageRepository status: https://fluxcd.io/flux/cmd/flux_get_images_repository/
- Flux metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Docker Hub pull usage and limits: https://docs.docker.com/docker-hub/usage/pulls/
- GitHub Packages / Container registry documentation: https://docs.github.com/packages/getting-started-with-github-container-registry/about-github-container-registry
- GitHub Packages billing documentation: https://docs.github.com/en/billing/concepts/product-billing/github-packages
- Harbor proxy cache documentation: https://goharbor.io/docs/main/administration/configure-proxy-cache/

## Issues Found
- Docker Hub paid limits were listed as "5,000+ pulls per day". Updated this to the current Docker documentation language: Pro, Team, and Business accounts have unlimited pulls, subject to fair use.
- GitHub Container Registry was described as having a fixed "5,000 requests per hour" limit. Replaced this with the documented GitHub Packages / Container Registry usage model and a general note about service rate and abuse limits.
- The Google Artifact Registry static credential example used `provider: gcp`. Removed it because Flux uses `provider: gcp` for workload identity; static credentials via `secretRef` should use the default generic provider.
- The ImageRepository interval comment incorrectly referred to increasing from a default of 1 minute. Changed it because `.spec.interval` is required for ImageRepository resources.
- The ImagePolicy filtering section implied tag filtering reduces registry scans. Clarified it as reducing policy selection scope, because ImagePolicy filters tags after ImageRepository scan results are available.
- The Harbor example deployed only `goharbor/harbor-core` with an environment variable, which is not a working Harbor proxy cache deployment. Replaced it with the supported Harbor proxy cache setup flow from the official Harbor documentation.
- The cached registry ImageRepository example pointed at a cluster-local fake Harbor service from the removed deployment. Updated it to use the documented Harbor proxy cache image prefix pattern.
- The OCI HelmRepository example implied `.spec.interval` reduces registry calls. Updated the comment because Flux documents HelmRepository interval as ineffectual for OCI repositories.
- Prometheus alert and Grafana queries used gauge `rate()` patterns and invalid single-quoted PromQL label matchers in JSON. Updated them to use `max_over_time` for conditions, histogram bucket data for duration, and valid double-quoted PromQL matchers.
- The emergency suspend example only suspended resources in the default Flux namespace and the resume loop did not preserve namespaces. Replaced suspend with an all-namespaces `kubectl patch` and updated the resume loop to pass each resource namespace.
- The Kustomize emergency patch had `resources: []`, so it would not patch any manifests. Updated it to show that ImageRepository manifests must be included under `resources`, and added group/version target fields.

## Review Notes
The Flux and Kubernetes CLIs were not installed in the local environment, so command verification was done against official Flux CLI documentation instead of local `--help` output. The Harbor section remains a setup outline because Harbor proxy cache is configured through Harbor registry endpoints and proxy-cache projects rather than a single Kubernetes Deployment manifest.
