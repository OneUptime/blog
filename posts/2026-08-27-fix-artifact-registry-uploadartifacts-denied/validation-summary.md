# Validation Summary: Why Artifact Registry Returns `uploadArtifacts` Denied After `gcloud auth configure-docker`

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Google Cloud Artifact Registry
- Google Cloud CLI (`gcloud`)
- Docker and Docker credential helpers
- Google Cloud Identity and Access Management (IAM)
- Compute Engine service accounts and OAuth access scopes
- Workload Identity Federation

## Sources Consulted

- [Authenticate Docker to Artifact Registry](https://cloud.google.com/artifact-registry/docs/docker/authentication)
- [Troubleshoot container image issues](https://cloud.google.com/artifact-registry/docs/docker/troubleshoot)
- [Artifact Registry access control with IAM](https://cloud.google.com/artifact-registry/docs/access-control)
- [Artifact Registry roles and permissions](https://cloud.google.com/iam/docs/roles-permissions/artifactregistry)
- [Artifact Registry repository and image names](https://cloud.google.com/artifact-registry/docs/docker/names)
- [Push and pull Docker images](https://cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling)
- [Artifact Registry repository overview](https://cloud.google.com/artifact-registry/docs/repositories)
- [Deploying to Compute Engine](https://cloud.google.com/artifact-registry/docs/integrate-compute)
- [Container Registry transition differences for Docker](https://cloud.google.com/artifact-registry/docs/transition/changes-docker)
- [`gcloud auth configure-docker` reference](https://cloud.google.com/sdk/gcloud/reference/auth/configure-docker)
- [`gcloud auth list` reference](https://cloud.google.com/sdk/gcloud/reference/auth/list)
- [`gcloud artifacts repositories describe` reference](https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/describe)
- [`gcloud artifacts repositories add-iam-policy-binding` reference](https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/add-iam-policy-binding)
- [`gcloud artifacts repositories get-iam-policy` reference](https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/get-iam-policy)
- [IAM access-change propagation](https://cloud.google.com/iam/docs/access-change-propagation)
- [IAM deny policies](https://cloud.google.com/iam/docs/deny-overview)
- [IAM principal access boundary policies](https://cloud.google.com/iam/docs/principal-access-boundary-policies)
- [Identities for workloads](https://cloud.google.com/iam/docs/workload-identities)
- [Docker CLI configuration](https://docs.docker.com/reference/cli/docker/)
- [Docker Registry authentication](https://docs.docker.com/reference/api/registry/auth/)
- [`docker image tag` reference](https://docs.docker.com/reference/cli/docker/image/tag/)
- [`docker image push` reference](https://docs.docker.com/reference/cli/docker/image/push/)

## Issues Found

- The repository check only required Docker format. Direct pushes are supported for standard repositories, so the post now also requires standard repository mode.
- The `DOCKER_CONFIG` wording incorrectly grouped Docker client configuration with the gcloud credential context. The post now distinguishes changes to the Docker helper configuration from operating-system user or `sudo` changes that can also select a different gcloud context.
- The post called the output of `gcloud artifacts repositories get-iam-policy` the repository's effective policy. That command returns the allow policy attached to the repository and omits inherited allow policies, IAM deny policies, and principal access boundary policies. The wording and follow-up checks were corrected accordingly.
- The `401 Unauthorized` description did not distinguish the normal initial Docker Registry authentication challenge from a terminal authentication error. It now refers to a final `401 Unauthorized` response.
- The immutable-tags wording used nonstandard terminology and did not state the relevant conflict precisely. It now describes the immutable image tags setting rejecting reuse of a tag for a different image version.
- The Compute Engine access-scope statement was too broad. It now specifies credentials for the VM's attached service account, because user credentials obtained on a VM are not restricted merely by running on that VM.
- The create-on-push exception was underspecified. The post now states that `pkg.dev` repositories must already exist and that create-on-push roles apply only to `gcr.io` repositories used in documented Container Registry migration workflows.
- The post incorrectly said Artifact Registry Repository Administrator can manage repository policies. The role can read, write, and delete artifacts but does not manage repository IAM policies, so the role comparison was corrected.

## Review Notes

- All shell snippets are syntactically valid. The documented `gcloud` commands, flags, IAM member forms, image name, `docker tag`, and `docker push` usages are current and correct.
- `gcloud auth list` correctly shows the selected gcloud account in the normal helper flow. Service account impersonation or explicit credential overrides can make the effective request identity differ.
- `gcloud auth configure-docker` prompts for confirmation by default; unattended automation can add `--quiet` after reviewing the configuration change.
- The image path example assumes a regular project ID. Legacy domain-scoped project IDs require the documented colon-to-slash path handling.
- All external links in the post resolve to the intended current official Google Cloud documentation.
