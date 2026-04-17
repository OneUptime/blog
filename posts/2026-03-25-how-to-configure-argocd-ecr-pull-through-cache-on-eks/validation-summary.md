# Validation Summary: How to Configure ArgoCD ECR Pull-Through Cache on EKS

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Amazon ECR (Elastic Container Registry) and ECR pull-through cache
- Amazon EKS (Elastic Kubernetes Service)
- ArgoCD (and ArgoCD Image Updater)
- AWS Secrets Manager
- AWS IAM
- GitHub Container Registry (GHCR) and GitHub Personal Access Tokens
- Kubernetes (CronJob, ServiceAccount, Secret, Deployment manifests)
- Helm (OCI-based Helm charts)
- AWS CLI / kubectl / argocd CLI

## Sources Consulted
- AWS ECR API Reference — CreateRepositoryCreationTemplate: https://docs.aws.amazon.com/AmazonECR/latest/APIReference/API_CreateRepositoryCreationTemplate.html
- AWS ECR User Guide — Pull-through cache rules and supported upstream registries (registry-1.docker.io, ghcr.io, registry.k8s.io, quay.io, public.ecr.aws)
- AWS ECR User Guide — Lifecycle policy schema (countType, countUnit, sinceImagePushed, imageCountMoreThan)
- AWS ECR documentation on the `ecr-pullthroughcache/` Secrets Manager naming requirement and the `{"username","accessToken"}` payload format used for GHCR
- AWS ECR authorization token documentation (12-hour token lifetime)
- ArgoCD declarative repository Secrets (`argocd.argoproj.io/secret-type: repository`, `enableOCI`)
- ArgoCD Image Updater annotation reference (`image-list`, `update-strategy: semver`, `pull-secret` with `ext:` script form)
- GitHub Docs — Personal access token `read:packages` scope for GHCR

## Issues Found
- **Step 3 — invalid prefix value `""`**: The post used `--prefix ""` to apply a repository creation template to all repositories. The ECR API requires `prefix` to be at least 1 character (regex `^([a-z0-9]+...|ROOT)$`); the documented way to target all repositories without a more specific template is the special value `ROOT`. Updated the example to use `--prefix "ROOT"` and adjusted the surrounding sentence accordingly.

## Review Notes
- `--image-tag-mutability IMMUTABLE` for pull-through cache is a valid choice but worth flagging: with IMMUTABLE, tags like `latest` cached by ECR will not pick up upstream changes once written. For most production setups using version-pinned tags this is fine; readers using floating tags may want `MUTABLE`.
- The ArgoCD Helm Application example (`docker-hub/prometheuscommunity` for the `prometheus` chart) is illustrative — the prometheus-community charts are not currently published as OCI artifacts on Docker Hub, so for a real deployment readers would need to substitute the actual OCI source (e.g. an upstream registry that publishes the chart as an OCI artifact). Left as-is because the syntax and URL pattern being demonstrated are correct.
- Docker Hub rate limit numbers ("100-200 pulls per 6 hours") match the long-standing anonymous/authenticated-free tier limits; Docker has been adjusting these over time but the figures remain reasonable for a general explanation.
- The CronJob refreshes credentials every 6 hours for tokens that live 12 hours — appropriate margin. The CronJob image (`amazon/aws-cli:2.15.0`) does not contain `kubectl`, so in a real deployment readers would need an image that bundles both `aws` and `kubectl` (or a multi-container/initContainer pattern). Did not modify because this is a structural design choice rather than a clear-cut technical error, but worth noting for a future revision.
