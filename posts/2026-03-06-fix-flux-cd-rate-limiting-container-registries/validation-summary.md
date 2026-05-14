# Validation Summary: How to Fix Flux CD Rate Limiting from Container Registries

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Flux CD image-reflector-controller, ImageRepository, and notification Alert resources
- Kubernetes kubectl, Secrets, Deployments, Services, and PersistentVolumeClaims
- Docker Hub pull limits and Docker Registry pull-through cache
- Amazon ECR private registry, pull-through cache rules, IAM/IRSA, and ECR token refresh
- GitHub Container Registry
- Google Artifact Registry
- Azure Container Registry

## Sources Consulted
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux CLI `flux reconcile image repository` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_image_repository/
- Docker Hub usage and pull limits: https://docs.docker.com/docker-hub/usage/
- Docker Hub pull usage and rate-limit headers: https://docs.docker.com/docker-hub/usage/storage/
- Docker Registry pull-through cache documentation: https://docs.docker.com/docker-hub/image-library/mirror/
- CNCF Distribution registry proxy configuration: https://distribution.github.io/distribution/about/configuration/
- Amazon ECR service quotas: https://docs.aws.amazon.com/general/latest/gr/ecr.html
- Amazon ECR pull-through cache rule documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache-creating-rule.html
- Amazon ECR authorization token documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- GitHub Container Registry documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- Google Artifact Registry quotas: https://docs.cloud.google.com/artifact-registry/quotas
- Google Container Registry transition documentation: https://cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Azure Container Registry service tiers: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus

## Issues Found
- Docker Hub paid-plan limits were outdated. Changed Pro/Team from "5000 pulls per day" to unlimited pulls subject to fair use, matching current Docker documentation.
- Amazon ECR quota wording was oversimplified and inaccurate. Replaced the single "1000 pulls per second" claim with per-region API quota wording for BatchGetImage/GetDownloadUrlForLayer and token refresh limits.
- GHCR was listed as "5000 requests per hour," which is a GitHub API-style number and not a published GHCR pull quota. Reworded GHCR claims to avoid an unsupported numeric limit.
- Google Container Registry was presented as current alongside Artifact Registry. Updated the text and example to focus on Artifact Registry, noting that Container Registry is shut down for writes while `gcr.io` repositories can be hosted by Artifact Registry.
- Azure Container Registry tier limits had an incorrect Standard-tier read limit. Updated Basic/Standard/Premium read operations to 1000/3000/10000 per minute.
- The Flux `exclusionList` explanation incorrectly said it limits scanned tags and reduces registry API calls. Updated it to explain that Flux excludes matching tags from scan results after listing repository tags.
- The Docker Registry pull-through cache manifest referenced a Docker registry secret key that would not exist and crossed namespaces incorrectly. Added a same-namespace Opaque Secret with `username` and `password` keys and referenced it from the registry Deployment.
- The pull-through cache section implied the cache would be used automatically. Added a note that Flux or the cluster runtime must be pointed at the cache.
- The ECR pull-through cache command used an invalid Secrets Manager ARN shape for Docker Hub credentials and omitted the region. Updated it to use an `ecr-pullthroughcache/` secret path and `--region`.
- Example AWS account IDs used 9 digits instead of the required 12-digit format. Updated example ECR and IAM ARNs/URLs to use a 12-digit placeholder.
- The Flux Alert example used `notification.toolkit.fluxcd.io/v1`, but Alert is documented under `notification.toolkit.fluxcd.io/v1beta3`. Updated the apiVersion.
- Summary wording claimed tag exclusions narrow scan scope and that GHCR has higher limits. Reworded both claims to match documented behavior.

## Review Notes
The rate-budget calculation remains a useful approximation, but actual registry consumption can vary because registry scans may involve tag-list and manifest/metadata requests rather than a one-to-one "scan equals pull" model.
