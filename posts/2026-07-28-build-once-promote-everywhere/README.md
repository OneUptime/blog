# Build Once, Promote Everywhere: Stop Rebuilding Artifacts per Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CI/CD, Artifact Management, Deployment, Supply Chain Security, Docker

Description: Build and verify one immutable artifact, then move its recorded identity through staging and production without recompiling source.

---

If staging and production rebuild the same commit independently, they do not necessarily deploy the same software. A mutable dependency, base image, compiler, timestamp, generated file, or network response can change between builds.

"Build once, promote everywhere" gives every environment the same tested artifact identity. For a multi-platform container image, one top-level digest can identify an image index containing different platform-specific images, so test each target platform before promotion. Environment-specific configuration is supplied at deployment or runtime; it is not compiled into a fresh artifact.

## Define the Unit of Promotion

Choose an object with an immutable identity:

- container image by repository and digest;
- package by immutable repository coordinate and checksum;
- archive or binary by artifact ID and cryptographic digest;
- infrastructure module by version and digest.

A Git commit identifies source, not the resulting binary. A tag such as `app:1.8` is a convenient name but can be moved. Docker supports pulling by digest, which selects an exact image manifest or image index:

```text
registry.example.com/payments@sha256:...
```

Record both human and immutable identities. The version helps operators communicate; the digest prevents ambiguity.

## Split the Pipeline into Build and Promotion

A useful flow is:

```text
source commit
  -> build
  -> package
  -> test packaged bytes
  -> scan and attest
  -> publish immutable object
  -> deploy digest to staging
  -> verify
  -> approve
  -> deploy same digest to production
```

The build stage should produce one release candidate. Integration and acceptance tests should consume that candidate rather than compiling a private copy. Once checks pass, promotion changes environment state or metadata, not artifact content.

After checking out the source and authenticating to the target registry, capture the digest returned by the registry push:

```yaml
- name: Build and push
  id: image
  uses: docker/build-push-action@v7
  with:
    context: .
    push: true
    tags: registry.example.com/payments:${{ github.sha }}

- name: Record identity
  run: printf '%s\n' '${{ steps.image.outputs.digest }}' > image.digest
```

Pass the recorded digest value as a job output, or upload `image.digest` as a workflow artifact, then deploy `repository@digest`. The tag can remain for discovery, but the deployment record should use the digest.

## Keep Configuration Outside the Artifact

One artifact cannot move unchanged if the build bakes in:

- production API endpoints;
- environment credentials;
- tenant IDs;
- logging destinations;
- environment-specific feature flags;
- per-environment generated assets.

Separate configuration into two categories:

1. build-time values that genuinely change program semantics and therefore define a different artifact;
2. deploy-time or runtime values supplied by the target environment.

Use command-line flags, environment variables, mounted configuration, secret stores, or platform configuration for the second category. Validate required values at startup and fail clearly.

Frontend applications need special attention because configuration is often embedded into static JavaScript. Options include serving a small runtime configuration document, injecting values at container start, or explicitly accepting that each environment-specific frontend bundle is a separate artifact. Do not call environment rebuilds "promotion" if the bytes change.

## Publish Before Deployment

The artifact repository is the handoff boundary. A deployment should not depend on a previous runner's filesystem or an opportunistic cache.

Publishing should be:

- immutable or append-only for a version/digest;
- atomic from the consumer's perspective;
- authenticated with least privilege;
- accompanied by checksums and metadata;
- retained according to rollback and compliance needs.

CI workflow artifacts can transfer a build between jobs, but a supported release often belongs in a package or container registry with an appropriate retention policy.

Create a small release manifest:

```json
{
  "source": "git:4d3c...",
  "image": "registry.example.com/payments",
  "digest": "sha256:...",
  "buildRun": "github:owner/repo/actions/runs/12345"
}
```

Sign or attest this record where the risk justifies it. GitHub artifact attestations can establish build provenance for binaries and container images, and its container flow takes a subject name plus digest.

## Gate Environments Without Rebuilding

Deployment environments should apply controls around the same identity:

- staging deploys digest `D`;
- smoke and acceptance tests report against `D`;
- a reviewer approves `D`;
- production deploys digest `D`.

GitHub environments can require approval, restrict deployment branches, apply custom protection rules, and withhold environment secrets until rules pass. These controls govern permission and timing; they should not invoke another compiler.

Keep separate concurrency rules for deployment so two production changes cannot race. Decide whether production runs should queue or whether a newer candidate supersedes an older one. Cancellation is safe only if the deployment operation and target platform support interruption without leaving partial state.

## Handle Database and Infrastructure Changes Explicitly

Application bytes may be immutable while deployment also performs stateful work. Database migrations, feature-flag changes, and infrastructure updates need their own compatibility contract.

General engineering recommendations:

- use expand-and-contract schema changes so old and new application versions can overlap;
- make migrations idempotent or record their applied version;
- separate a destructive migration from an easily canceled application rollout;
- require backups and tested restore procedures for irreversible changes;
- keep the artifact compatible with the rollback window.

These are deployment design practices, not guarantees supplied by a CI provider.

## Roll Back by Identity

A rollback should select a previously known-good digest, not rebuild an old commit with today's dependencies:

```text
deploy registry.example.com/payments@sha256:previous...
```

Retain:

- the artifact and its metadata;
- deployment history per environment;
- configuration version;
- database compatibility notes;
- provenance and security scan evidence.

Test rollback in a non-production environment. If a migration or external protocol makes the prior artifact incompatible, document that the release is roll-forward-only before approval.

## Detect Accidental Rebuilds

Add controls that make promotion violations visible:

- deployment jobs accept an artifact digest as required input;
- deployment jobs do not check out source or install compilers;
- manifests record the same digest in every environment;
- policy rejects mutable tag-only production references;
- acceptance test reports include the digest under test;
- the release UI links build, artifact, and deployments.

If environment-specific packaging is unavoidable, make it a named transformation with its own digest and verification. Transparency is better than claiming identical promotion while silently changing files.

## Migration Path

Move incrementally:

1. Package the current CI output and calculate a checksum.
2. Make downstream tests consume the package.
3. Publish it to durable storage.
4. Change staging to accept its identity.
5. Add approval and production promotion of the same identity.
6. Remove source checkout and build tools from deploy jobs.
7. Add provenance, retention, rollback, and policy controls.

The outcome is stronger than faster deployment. It gives an auditable statement: for each tested target platform, the bytes in production are the bytes that passed the release gates.

## Official Documentation

- [Docker image pull by digest](https://docs.docker.com/reference/cli/docker/image/pull/)
- [Docker image digests](https://docs.docker.com/dhi/core-concepts/digests/)
- [GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)
- [GitHub deployment environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments)
- [Deploying to a GitHub Actions environment](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/deploy-to-environment)
- [GitLab job artifacts](https://docs.gitlab.com/ci/jobs/job_artifacts/)
