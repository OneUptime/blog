# Validation Summary: How to List All Tags of a Docker Image on Docker Hub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Hub
- Docker Registry HTTP API v2
- Docker Hub API
- curl
- jq
- Bash
- skopeo
- regctl / regclient
- AWS ECR
- Google Container Registry
- Azure Container Registry

## Sources Consulted
- CNCF Distribution Registry HTTP API V2 specification: https://distribution.github.io/distribution/spec/api/
- Docker Registry authentication documentation: https://docs.docker.com/reference/api/registry/auth/
- Docker Hub API reference, list repository tags endpoint: https://docs.docker.com/reference/api/hub/latest/
- Docker Hub deprecated API endpoints: https://docs.docker.com/reference/api/hub/deprecated/
- skopeo-list-tags manual page: https://www.mankier.com/1/skopeo-list-tags
- regctl tag ls CLI reference: https://regclient.org/cli/regctl/tag/ls/
- regclient image reference documentation: https://regclient.org/usage/
- AWS CLI ecr describe-images reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/describe-images.html
- Google Cloud SDK gcloud container images list-tags reference: https://cloud.google.com/sdk/gcloud/reference/container/images/list-tags
- Azure CLI az acr repository show-tags reference: https://learn.microsoft.com/en-us/cli/azure/acr/repository

## Issues Found
- The Docker Registry API intro said authentication handling was needed for official Docker Hub images specifically. The examples also authenticated non-official Docker Hub repositories, and Docker's authentication documentation applies to Docker Hub registry requests generally, so the wording was changed to "Docker Hub images."
- The Docker Hub REST API examples used the older `/v2/repositories/{namespace}/{repository}/tags` URL form. It currently still returns data, but Docker's current API reference documents `/v2/namespaces/{namespace}/repositories/{repository}/tags`, so the examples were updated to the documented endpoint.
- The Docker Hub REST API comment said the endpoint returns creation dates. The example extracts `last_updated`, and Docker's response schema documents update and tag push/pull timestamps rather than a creation date for each tag, so the wording was changed to "update dates."
- The reusable `docker-tags` shell function assigned the token to a lowercase `token` variable but sent uppercase `$TOKEN` in the Authorization header. The header now uses `$token`, so the function works without relying on an unrelated global variable.

## Review Notes
- The registry API and Docker Hub API examples were spot-checked with live public Docker Hub requests for `library/nginx`; both returned HTTP 200 and expected pagination fields.
- The Docker Hub API examples are for public repositories. Private Docker Hub repositories would require authenticated Docker Hub API requests.
