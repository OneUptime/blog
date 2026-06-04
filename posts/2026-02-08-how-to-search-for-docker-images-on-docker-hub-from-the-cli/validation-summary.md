# Validation Summary: How to Search for Docker Images on Docker Hub from the CLI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker Hub
- Docker Hub API
- Skopeo
- regctl / regclient
- AWS ECR CLI
- Google Cloud CLI for Container Registry and Artifact Registry
- GitHub CLI for GitHub Container Registry
- Docker Buildx
- Docker Scout
- Bash
- Python JSON parsing
- curl
- jq

## Sources Consulted
- Docker CLI reference for `docker search`: https://docs.docker.com/reference/cli/docker/search/
- Local `docker search --help` and command checks
- Docker Hub API reference: https://docs.docker.com/reference/api/hub/latest/
- Docker personal access token documentation: https://docs.docker.com/security/for-developers/access-tokens/
- Docker Buildx `imagetools inspect` reference: https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/
- Docker Scout CLI reference: https://docs.docker.com/reference/cli/docker/scout/
- Docker Scout `cves` reference: https://docs.docker.com/reference/cli/docker/scout/cves/
- Docker Scout `quickview` reference: https://docs.docker.com/reference/cli/docker/scout/quickview/
- Docker Scout `compare` reference: https://docs.docker.com/reference/cli/docker/scout/compare/
- Docker Hub API tag endpoint checks against `hub.docker.com/v2/namespaces/.../repositories/.../tags`
- Skopeo `list-tags` documentation: https://github.com/containers/skopeo/blob/main/docs/skopeo-list-tags.1.md
- Skopeo `inspect` documentation: https://github.com/containers/skopeo/blob/main/docs/skopeo-inspect.1.md
- regctl `tag ls` documentation: https://regclient.org/cli/regctl/tag/ls/
- regctl `image inspect` documentation: https://regclient.org/cli/regctl/image/inspect/
- AWS CLI ECR `describe-repositories`: https://docs.aws.amazon.com/cli/latest/reference/ecr/describe-repositories.html
- AWS CLI ECR `list-images`: https://docs.aws.amazon.com/cli/latest/reference/ecr/list-images.html
- AWS CLI ECR `describe-images`: https://docs.aws.amazon.com/cli/latest/reference/ecr/describe-images.html
- Google Cloud SDK `gcloud container images list-tags`: https://docs.cloud.google.com/sdk/gcloud/reference/container/images/list-tags
- Google Artifact Registry image management documentation: https://docs.cloud.google.com/artifact-registry/docs/docker/manage-images
- GitHub REST API packages documentation: https://docs.github.com/rest/reference/packages

## Issues Found
- Removed `.IsAutomated` from the documented `docker search --format` fields because current Docker does not expose it as a valid format placeholder. Kept `is-automated` only as a search filter, where Docker documents it as deprecated.
- Corrected `.IsOfficial` wording to match Docker's text/template output, which renders `[OK]` for official images rather than a boolean in table/template output.
- Updated Docker Hub tag API examples from the older `/v2/repositories/{namespace}/{repository}/tags` path to the documented `/v2/namespaces/{namespace}/repositories/{repository}/tags` path.
- Changed tag ordering examples to `ordering=-last_updated` so newest tags are requested first.
- Replaced the inaccurate `docker search` private repository example with a Docker Hub API namespace repository query using a bearer token from the documented `/v2/auth/token` endpoint.
- Fixed the Skopeo size comparison loop to sum layer sizes instead of printing only the first layer's size.
- Corrected the Docker Scout comparison command to use the required `--to` option.

## Review Notes
The `docker search --format json` example works in the locally installed Docker CLI, although Docker's current CLI reference documents the Go-template placeholders more explicitly than the JSON shorthand. Docker Scout commands may require the Docker Scout CLI plugin and authentication depending on the user's installation and image source.
