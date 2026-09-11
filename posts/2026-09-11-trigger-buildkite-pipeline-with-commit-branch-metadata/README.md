# How to Trigger a Buildkite Pipeline with Commit and Metadata

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, Automation, Git, YAML

Description: Create dynamic Buildkite trigger steps that pass exact commit and branch values, scoped environment settings, and explicit build metadata.

---

A downstream deployment pipeline should know exactly which code and release inputs it received. A trigger that relies on defaults can build the target pipeline's default branch at `HEAD`, even when the parent tested a different commit.

Buildkite trigger steps can carry the target commit, branch, environment, and metadata. Generate the step after runtime inputs exist, serialize the values, and decide whether the parent must wait for the downstream result.

## Understand the trigger contract

The [trigger step reference](https://buildkite.com/docs/pipelines/configure/step-types/trigger-step) defines `build.commit`, `build.branch`, `build.message`, `build.env`, and `build.meta_data`. The field is named `meta_data` with an underscore.

A simple static trigger looks like this:

```yaml
steps:
  - trigger: "application-deploy"
    label: "Deploy tested commit"
    key: trigger-deploy
    async: false
    build:
      commit: "${BUILDKITE_COMMIT}"
      branch: "${BUILDKITE_BRANCH}"
      message: "Deploy from ${BUILDKITE_PIPELINE_SLUG}"
      env:
        DEPLOY_ENVIRONMENT: "staging"
      meta_data:
        release-channel: "candidate"
```

This file uses normal pipeline-upload interpolation so the parent job fills in its commit and branch. If the target repository is different, the parent's commit may not exist there. In that case, resolve a target-repository revision explicitly and pass the parent's commit separately as provenance.

## Generate a trigger after packaging

Suppose an earlier step builds an image and stores its immutable digest as `release/image-digest` metadata. A dependent upload step can pass that digest to the deployment pipeline.

Use this structure for the parent:

```yaml
steps:
  - label: "Build image"
    key: build-image
    command: "bash .buildkite/scripts/build-image.sh"

  - label: "Trigger deployment"
    key: upload-deploy-trigger
    depends_on: build-image
    command: "bash .buildkite/scripts/trigger-deploy.sh"
```

`build-image.sh` is your existing image build and push workflow. It must store the actual published digest after the push succeeds. The trigger wrapper reads that required value:

```bash
#!/usr/bin/env bash
set -euo pipefail

export IMAGE_DIGEST
IMAGE_DIGEST=$(buildkite-agent meta-data get release/image-digest)
pipeline_file=$(mktemp)
trap 'rm -f "$pipeline_file"' EXIT
python3 .buildkite/create-trigger.py > "$pipeline_file"
buildkite-agent pipeline upload --no-interpolation "$pipeline_file"
```

Then create `.buildkite/create-trigger.py`:

```python
import json
import os
import re

digest = os.environ["IMAGE_DIGEST"]
if not re.fullmatch(r"sha256:[0-9a-f]{64}", digest):
    raise SystemExit("Expected an immutable sha256 image digest")

print(json.dumps({
    "steps": [{
        "trigger": "application-deploy",
        "key": "deploy-tested-image",
        "label": "Deploy tested image to staging",
        "async": False,
        "build": {
            "commit": os.environ["BUILDKITE_COMMIT"],
            "branch": os.environ["BUILDKITE_BRANCH"],
            "message": "Deploy image produced by the parent build",
            "env": {"DEPLOY_ENVIRONMENT": "staging"},
            "meta_data": {
                "release/image-digest": digest,
                "release/source-build-id": os.environ["BUILDKITE_BUILD_ID"],
            },
        },
    }],
}))
```

JSON serialization preserves values as data. The no-interpolation upload is intentional because the generator already inserted the parent values. It also prevents dollar signs in future user-provided messages from being interpreted unexpectedly.

## Read inputs in the target pipeline

The downstream build receives its own metadata store. The parent does not automatically share all metadata or arbitrary exported variables with it. Read only the values explicitly passed:

```bash
#!/usr/bin/env bash
set -euo pipefail

digest=$(buildkite-agent meta-data get release/image-digest)
source_build=$(buildkite-agent meta-data get release/source-build-id)
printf 'Deploying %s from build %s\n' "$digest" "$source_build"
```

Use the digest with the intended image repository in your deployment tool. Validate the target environment against an allowlist in the deployment entry point, and retrieve credentials from the target pipeline's approved secret configuration. Metadata should carry identifiers and provenance, not passwords.

If downstream jobs need the parent's artifacts, use the triggering build ID and scope the producer step. This is a separate artifact access operation and may require a cross-cluster access rule.

## Choose synchronous behavior explicitly

With `async: false`, the trigger waits for the downstream build and reflects its result. With `async: true`, the parent proceeds after the downstream build starts; its success does not certify that deployment later succeeded.

Use synchronous triggers when the parent represents a release outcome. Asynchronous triggers can suit independent notifications or secondary workflows, but those workflows need their own failure visibility.

A synchronous trigger is still a build boundary. Job retries, build cancellation, and the target pipeline's intermediate-build settings can affect the relationship. Test those cases before using a parent green check as a deployment signal.

## Check permissions and pull request behavior

Trigger authorization depends on the relevant user or team permissions and, where configured, pipeline trigger rules. A valid generated document cannot prove the parent may start the target pipeline. Exercise the same source that production uses, including scheduled or webhook-created builds.

Avoid passing `BUILDKITE_PULL_REQUEST` merely for reporting. The agent can use it to change checkout behavior to the pull request ref. Pass a custom field such as `SOURCE_PULL_REQUEST` when you only want provenance.

## Verify a complete round trip

Preview the generated trigger with harmless sample environment values. In a test build, compare parent and target commit, branch, digest, and source build ID. Make a downstream job fail and verify the parent behaves according to `async`.

Also test a branch name containing a slash and a message containing quotes. These cases catch string-building errors that a simple `main` branch example misses.

## Conclusion

A downstream trigger should carry an explicit revision and a small, validated input contract. Generate it after the producer succeeds, and use synchronous behavior when the parent must represent the downstream result.

## Official Documentation

- [Trigger step attributes and permissions](https://buildkite.com/docs/pipelines/configure/step-types/trigger-step)
- [Build metadata](https://buildkite.com/docs/pipelines/configure/build-meta-data)
- [Artifact access between builds](https://buildkite.com/docs/pipelines/configure/artifacts)
