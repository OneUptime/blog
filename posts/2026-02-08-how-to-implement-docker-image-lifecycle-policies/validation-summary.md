# Validation Summary: How to Implement Docker Image Lifecycle Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker images and Dockerfiles
- Docker Registry HTTP API V2 / CNCF Distribution
- AWS Elastic Container Registry lifecycle policies
- Google Artifact Registry cleanup policies
- Azure Container Registry retention policies and purge tasks
- Docker Scout vulnerability scanning
- Bash automation

## Sources Consulted
- Amazon ECR lifecycle policy properties: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- Amazon ECR lifecycle policy examples: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_examples.html
- AWS CLI ECR lifecycle policy preview commands: https://docs.aws.amazon.com/cli/latest/reference/ecr/start-lifecycle-policy-preview.html and https://docs.aws.amazon.com/cli/latest/reference/ecr/get-lifecycle-policy-preview.html
- AWS CLI ECR tag mutability examples: https://docs.aws.amazon.com/cli/latest/userguide/cli_ecr_code_examples.html
- Google Artifact Registry cleanup policies: https://cloud.google.com/artifact-registry/docs/repositories/cleanup-policy
- gcloud artifacts repositories set-cleanup-policies reference: https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/set-cleanup-policies
- Azure CLI ACR retention reference: https://learn.microsoft.com/en-us/cli/azure/acr/config/retention
- Azure Container Registry purge documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auto-purge
- CNCF Distribution HTTP API V2: https://distribution.github.io/distribution/spec/api/
- Docker Scout CVEs CLI reference: https://docs.docker.com/reference/cli/docker/scout/cves/
- Dockerfile ONBUILD reference: https://docs.docker.com/reference/dockerfile/

## Issues Found
- The ECR production rule used `tagPrefixList: ["prod-", "release-"]`, which would match images that have both prefixes as tags rather than either prefix. Split it into separate `prod-` and `release-` rules so each prefix is handled correctly.
- The ECR preview example only called `get-lifecycle-policy-preview`. Added `start-lifecycle-policy-preview` first because ECR requires a preview request before retrieving preview results.
- The Google Artifact Registry command passed the JSON policy inline to `--policy`, but the gcloud command expects a path to a local JSON policy file. Changed the example to write `cleanup-policy.json` and pass that file with `--no-dry-run`.
- The custom registry script used `jq -r '.tags[]'`, which errors when a repository has no tags or a null tag list. Changed it to `jq -r '.tags[]?'`.

## Review Notes
- Azure ACR retention is still documented as a preview command group, but the command and options in the post match current Microsoft documentation.
- The custom registry script remains a simplified example and assumes schema 2 image manifests with config blobs available through the registry API. Production implementations should also handle OCI manifests, manifest lists, authentication, pagination, and registry garbage collection behavior.
