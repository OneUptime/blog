# Validation Summary: How to Set Up Docker Image Garbage Collection in CI

## Status
validated

## Post Type
Tutorial / DevOps guide

## Technologies Covered
- Docker CLI prune commands
- GitHub Actions self-hosted runners
- CNCF Distribution / Docker Registry garbage collection
- Docker Registry HTTP API V2 manifest deletion
- AWS Elastic Container Registry lifecycle policies
- Google Artifact Registry Docker image management
- Azure Container Registry purge tasks
- Bash scripting

## Sources Consulted
- Docker CLI documentation: `docker image prune`, `docker volume prune`, `docker system prune`, and Docker pruning guide: https://docs.docker.com/reference/cli/docker/image/prune/, https://docs.docker.com/reference/cli/docker/volume/prune/, https://docs.docker.com/reference/cli/docker/system/prune/, https://docs.docker.com/engine/manage-resources/pruning/
- Local Docker CLI help for `docker image prune`, `docker container prune`, `docker system prune`, `docker volume prune`, and `docker network prune`.
- GitHub Actions documentation for selecting self-hosted runners with labels: https://docs.github.com/en/actions/how-tos/managing-self-hosted-runners/using-self-hosted-runners-in-a-workflow
- CNCF Distribution registry configuration and garbage collection documentation: https://distribution.github.io/distribution/about/configuration/, https://distribution.github.io/distribution/about/garbage-collection/
- AWS ECR lifecycle policy documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- Google Artifact Registry image management and gcloud reference: https://cloud.google.com/artifact-registry/docs/docker/manage-images, https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/list, https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/delete
- Azure Container Registry purge documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auto-purge

## Issues Found
- `docker volume prune -f` was described as removing all unused volumes. Current Docker only prunes anonymous volumes by default, so the examples now use `docker volume prune -a -f` where all unused volumes are intended.
- The scheduled GitHub Actions matrix defined runner labels but did not use `matrix.runner` in `runs-on`, so each matrix job would still target any self-hosted runner. Updated `runs-on` to include the matrix label.
- The self-hosted registry garbage collection section omitted the official requirement to stop writes or put the registry in read-only mode before garbage collection. Added that warning and moved `--dry-run` before the config path to match official command usage.
- The registry cleanup script claimed it sorted tags by creation date, but the Registry API tag list does not provide creation dates and `sort -V` sorts version-like tag names. Updated the comment and `KEEP_LAST` explanation accordingly.
- The ECR lifecycle rule used `tagPrefixList: ["dev-", "pr-"]`, which selects images that have all specified tag prefixes rather than either prefix. Split this into separate dev and pull request rules.
- The Google Artifact Registry example formatted `DIGEST`, which is not the documented resource field used by the gcloud examples, and deleting a tagged digest can fail without `--delete-tags`. Updated it to format `version` and pass `--delete-tags`.

## Review Notes
- The Docker prune examples are valid but intentionally destructive. They should be used only on disposable CI runners or hosts where named volumes and stopped containers are not needed.
- The Google Artifact Registry section could be further improved in the future by showing native cleanup policies, which are available for Artifact Registry and avoid hand-written deletion loops.
