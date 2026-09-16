# How to Roll Back a Drone Deployment with Rollback Events and the Original Build Metadata

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, CI/CD, Deployment, Docker, DevOps

Description: Use Drone rollback events with the correct source build, immutable release artifacts, explicit target filters, and verifiable deployment history.

A rollback should identify the exact release being restored. Rebuilding an old Git commit can produce a different container when dependencies, base images, or build-time configuration have changed. Use Drone's rollback event to establish the audit relationship, then deploy the immutable artifact recorded by the original release.

This workflow assumes your Drone distribution supports rollback. Check feature availability before designing the recovery procedure; a custom OSS-only server build may expose different capabilities.

## Select the source build deliberately

Suppose build 142 produced the last healthy API release, and build 150 deployed the faulty release. Inspect build 142's commit, status, reports, and release manifest before requesting a rollback:

```sh
drone build info acme/api 142
drone build rollback acme/api 142 production
```

The arguments are repository, source build number, and target environment. The [official CLI implementation](https://github.com/harness/drone-cli/blob/master/drone/build/build_rollback.go) verifies that interface. Use credentials authorized for the repository, and protect who can request production rollbacks.

The server's [rollback handler](https://github.com/harness/harness/blob/drone/handler/api/repos/builds/rollback.go) creates a rollback trigger using the selected build's commit-related metadata and records its number as the parent. The resulting execution has its own identity. Confirm this behavior at the source revision matching your installed server, particularly if you operate a fork.

Do not point the command at the failed deployment merely because it is the most recent build. The selected source must identify the release you intend to restore. Also distinguish an artifact-producing build from a later promotion build: both can refer to the same commit while having different build numbers.

## Keep a release manifest outside the workspace

Publish a manifest alongside each successful artifact. For example:

```json
{
  "repository": "acme/api",
  "source_build": 142,
  "commit": "0123456789abcdef0123456789abcdef01234567",
  "image": "registry.example.com/api@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "schema_compatibility": "api-schema-7"
}
```

The values are illustrative. Generate the real digest from the image publication result, restrict manifest writes, and retain it for at least your rollback window. A mutable `stable` tag does not establish which bytes were originally tested.

The manifest should record both its artifact-producing build and any subsequent deployment execution. If your pipeline allows promoting a promotion or rolling back a rollback, resolve that chain through verified server metadata or an explicit artifact reference. Do not assume the immediate parent always has an artifact under its own build-number prefix.

## Filter rollback execution explicitly

Keep normal tests and image publishing restricted to their intended events. Define a dedicated rollback pipeline:

```yaml
kind: pipeline
type: docker
name: production-rollback

concurrency:
  limit: 1

steps:
  - name: restore-release
    image: python:3.13-slim
    commands:
      - python ci/restore_release.py

trigger:
  event:
    - rollback
  target:
    - production
```

Here `ci/restore_release.py` is an application-owned deployment program, not a built-in Drone command. Its responsibilities are to read the source metadata, fetch and authenticate the release manifest, validate the target, request the deployment, and verify health. Package the program and its dependencies in a reviewed deployment image when relying on repository scripts from old commits would be unsafe or impractical.

Drone's [pipeline triggers](https://docs.drone.io/pipeline/docker/syntax/trigger/) support rollback events and target matching. Test both filters. An unrestricted publishing pipeline can otherwise run during the same rollback build and overwrite artifacts you wanted to preserve.

The named pipeline's concurrency limit does not serialize every other production pipeline. If ordinary promotions use another pipeline name, share a deployment-side coordinator or route both event types through one protected pipeline before relying on mutual exclusion.

## Verify the metadata before changing production

The deployment program should fail before acting if the event or target is wrong, the parent is missing, the manifest repository differs, or the digest cannot be found. Drone provides the [parent build number](https://docs.drone.io/pipeline/environment/reference/drone-build-parent/) and [deployment target](https://docs.drone.io/pipeline/environment/reference/drone-deploy-to/) as environment metadata. Verify source commit agreement as well.

A rollback pipeline may execute configuration associated with an older commit, while a configuration extension can supply centrally managed content. Rehearse the exact configuration-selection behavior of your installation. An old commit that predates rollback handling may contain no matching pipeline.

## Treat success as an application result

Before the change, confirm that the previous binary can read the current database and configuration. A rollback event does not reverse schema migrations, restore data, or undo messages already published by the bad release.

Observe rollout completion, application health, error rate, and the actual running image digest. Save a deployment record linking the rollback execution, original build, old and new digests, operator, and target. If recovery fails, keep that failure visible and use the next documented recovery action. The audit trail should show what ran and what production is serving, without reconstructing the answer from a mutable tag.
