# Validation Summary: Build Once, Promote Everywhere: Stop Rebuilding Artifacts per Environment

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- CI/CD build and promotion pipelines
- Immutable artifact management and cryptographic digests
- Docker and OCI container images, manifests, and multi-platform image indexes
- Docker Buildx and `docker/build-push-action`
- GitHub Actions job outputs, workflow artifacts, environments, concurrency, and artifact attestations
- GitLab CI/CD job artifacts
- Software supply chain provenance and release manifests
- Runtime configuration, database migrations, deployment rollback, and policy controls

## Sources Consulted

- [Docker Docs: Pull an image by digest](https://docs.docker.com/reference/cli/docker/image/pull/#pull-an-image-by-digest-immutable-identifier)
- [Docker Docs: Image digests and multi-platform manifests](https://docs.docker.com/dhi/explore/security-concepts/digests/)
- [docker/build-push-action usage, inputs, and outputs](https://github.com/docker/build-push-action)
- [OCI Image Index Specification](https://specs.opencontainers.org/image-spec/image-index/)
- [GitHub Docs: Using artifact attestations to establish provenance for builds](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)
- [GitHub Docs: Publishing Docker images](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)
- [GitHub Docs: Deployment environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments)
- [GitHub Docs: Deploying to a specific environment](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/deploy-to-environment)
- [GitHub Docs: Control the concurrency of workflows and jobs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
- [GitHub Docs: Passing information between jobs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/pass-job-outputs)
- [GitHub Docs: Store and share data with workflow artifacts](https://docs.github.com/en/actions/tutorials/store-and-share-data)
- [GitLab Docs: Job artifacts](https://docs.gitlab.com/ci/jobs/job_artifacts/)

## Issues Found

- The post stated that every environment receives the same tested bytes. A top-level digest for a multi-platform container identifies an image index whose platform-specific manifests can contain different bytes. Changed the claim to identical tested artifact identity and added the requirement to test every target platform.
- The `docker/build-push-action@v7` example uses path context (`context: .`) and pushes to a registry, but its prerequisites were unstated. Clarified that the source must already be checked out and the workflow authenticated to the target registry.
- The post said to pass the `image.digest` file as a job output or artifact. GitHub Actions job outputs are mapped string values, while files are transferred with workflow artifacts. Clarified the distinction between passing the digest value as a job output and uploading the file as a workflow artifact.
- The conclusion repeated the same-bytes guarantee without accounting for multi-platform images. Scoped the guarantee to each tested target platform.

## Review Notes

- `docker/build-push-action@v7` is current, accepts the shown `context`, `push`, and `tags` inputs, and exposes the image digest through the `digest` output.
- The YAML and JSON snippets are syntactically valid. The registry, digests, commit, and build-run values are intentionally illustrative placeholders.
- Docker documents digest references as immutable identifiers. For multi-platform images, the top-level digest identifies the image index and each platform-specific image has its own digest.
- GitHub's current container-attestation flow uses a fully qualified, untagged subject name plus a SHA-256 subject digest and supports the digest output from `docker/build-push-action`.
- GitHub environments support required approval, deployment branch restrictions, custom protection rules, and delayed access to environment secrets. Current concurrency controls support serialized deployments and either replacement or queuing of pending runs.
- GitHub and GitLab workflow artifacts can transfer build output between jobs, subject to their configured retention policies.
- The existing documentation links resolve to the intended official resources; the Docker image-digests link redirects to its current canonical path.
- No reviewed API, action version, command, or configuration field is deprecated as of 2026-07-28.
