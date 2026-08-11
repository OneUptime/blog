# How to Share Environment Variables Across Woodpecker Steps Without Repeating YAML

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Woodpecker CI, CI/CD, Environment Variables, YAML Anchors, Secrets

Description: Share static and computed values across Woodpecker steps with YAML anchors, workspace files, and carefully scoped server-wide variables.

---

Every Woodpecker step runs in a separate container or backend process. An `export` in one step changes only that process and its children; it cannot mutate the environment of a later step. To avoid repeated YAML, choose a mechanism based on the value's lifetime:

- use YAML anchors and map merges for static per-workflow configuration;
- write computed, non-secret values to a file in the shared workspace and source it later;
- use `WOODPECKER_ENVIRONMENT` only for truly instance-wide defaults;
- inject secrets with `from_secret` into each step that needs them.

Those mechanisms look similar in YAML but have different security and lifecycle properties.

## Static Values: YAML Anchors and Map Merges

Woodpecker supports YAML anchors and aliases through a top-level `variables` section. The section is a convenient home for YAML nodes; it is not itself a runtime environment shared by containers.

Define a reusable map:

~~~yaml
variables:
  common_env: &common_env
    NODE_ENV: test
    NPM_CONFIG_FUND: 'false'
    NPM_CONFIG_AUDIT: 'false'

steps:
  - name: lint
    image: node:24-alpine
    environment:
      <<: *common_env
    commands:
      - npm ci
      - npm run lint

  - name: test
    image: node:24-alpine
    environment:
      <<: *common_env
      TEST_REPORTER: junit
    commands:
      - npm ci
      - npm test
~~~

The YAML merge copies the common keys into each step's `environment` map before Woodpecker executes anything. A step can add a key or overwrite a merged value locally.

Keep three limitations in mind:

1. Anchors are YAML-document features, so they do not cross separate workflow files.
2. They reduce repetition but do not make values mutable at runtime.
3. `variables` is not a general templating language; it holds nodes referenced by aliases.

If several workflow files need the same policy, generate them from a reviewed source or accept a small amount of explicit duplication. Hidden cross-file templating can be harder to audit than repeated configuration.

## Reuse Images, Settings, and Command Lists Too

Anchors are not limited to environment maps:

~~~yaml
variables:
  node_image: &node_image node:24-alpine
  install_commands: &install_commands
    - npm ci

steps:
  - name: lint
    image: *node_image
    commands:
      - <<: *install_commands
      - npm run lint

  - name: test
    image: *node_image
    commands:
      - <<: *install_commands
      - npm test
~~~

Woodpecker's advanced-usage documentation shows sequence merging as well as map merging. Run the linter after using advanced YAML because generic editors and other CI parsers may interpret merge features differently.

Pin reusable image values to deliberate tags or digests. An anchor magnifies a version change across every consumer, which is useful only when the change is reviewed.

## Dynamic Values: Persist a File in the Workspace

Woodpecker shares one repository workspace among all steps in a workflow; container backends mount it into every step. Files created there persist to later steps, even though environment processes do not.

Use an initialization step. This example targets container backends; the local backend uses `image` to select a host shell rather than a container image:

~~~yaml
steps:
  - name: derive-version
    image: bash:5.3
    entrypoint: [/bin/sh, -c, 'echo "$CI_SCRIPT" | base64 -d | /usr/local/bin/bash -e']
    commands:
      - apk add --no-cache git
      - version="$(git describe --tags --always --dirty)"
      - printf 'export BUILD_VERSION=%q\n' "$version" > .woodpecker.env
      - printf 'export SOURCE_SHA=%q\n' "$CI_COMMIT_SHA" >> .woodpecker.env

  - name: package
    image: bash:5.3
    entrypoint: [/bin/sh, -c, 'echo "$CI_SCRIPT" | base64 -d | /usr/local/bin/bash -e']
    commands:
      - source ./.woodpecker.env
      - printf 'building %s from %s\n' "$BUILD_VERSION" "$SOURCE_SHA"
      - ./scripts/package.sh

  - name: publish-metadata
    image: bash:5.3
    entrypoint: [/bin/sh, -c, 'echo "$CI_SCRIPT" | base64 -d | /usr/local/bin/bash -e']
    commands:
      - source ./.woodpecker.env
      - ./scripts/publish-metadata.sh "$BUILD_VERSION"
~~~

`printf %q` and `source` are Bash features. Woodpecker uses `/bin/sh` for `commands` by default, so each step explicitly executes the decoded `CI_SCRIPT` with Bash; the producer also installs Git because the minimal Bash image omits it. The file contains `export` assignments so child processes receive the values. If steps use POSIX `sh`, choose a strict portable file format and validate allowed characters before sourcing. Never source an untrusted file supplied by a pull request without controlling its contents.

Write the file under the repository workspace, not `/tmp` or an image-specific home directory. Container-local files disappear when that step exits.

## Use a Data Format When Shell Sourcing Is Unsafe

For complex or externally derived data, JSON is clearer:

~~~yaml
steps:
  - name: metadata
    image: alpine:3.22
    commands:
      - apk add --no-cache jq
      - jq -n --arg sha "$CI_COMMIT_SHA" --arg branch "$CI_COMMIT_BRANCH" '{sha:$sha,branch:$branch}' > build-metadata.json

  - name: consume
    image: alpine:3.22
    commands:
      - apk add --no-cache jq
      - sha="$(jq -r .sha build-metadata.json)"
      - branch="$(jq -r .branch build-metadata.json)"
      - printf '%s %s\n' "$sha" "$branch"
~~~

This avoids executable shell syntax in the handoff. Pin production images or use an image that already contains the required parser rather than installing tools on every run.

## Secrets: Repeat the Injection Boundary, Not the Value

Woodpecker 3.x injects stored secrets through `from_secret`:

~~~yaml
steps:
  - name: publish
    image: example.com/acme/publisher:2
    environment:
      PUBLISH_TOKEN:
        from_secret: artifact_publish_token
    commands:
      - ./publish.sh
~~~

Do not derive a secret in one step and write it to `.woodpecker.env`. The workspace can be read by every later step in the workflow, archived accidentally, or exposed by a changed script. Give the secret only to the steps that need it.

If several trusted steps need the same secret mapping, an anchor can reduce YAML duplication without moving the value through the workspace:

~~~yaml
variables:
  publish_env: &publish_env
    PUBLISH_TOKEN:
      from_secret: artifact_publish_token

steps:
  - name: upload-package
    image: example.com/acme/publisher:2
    environment:
      <<: *publish_env
    commands:
      - ./upload-package.sh

  - name: upload-provenance
    image: example.com/acme/publisher:2
    environment:
      <<: *publish_env
    commands:
      - ./upload-provenance.sh
~~~

The secret is still injected separately into each step. Apply secret event filters in Woodpecker settings. Plugin-image filters apply only to plugin steps without `commands`, `entrypoint`, or `environment`; for those steps, inject the secret through `settings` and restrict it to the plugin image. Do not enable pull-request access merely to make a convenience pattern work.

When using brace-form shell expansion for a secret, Woodpecker's preprocessing requires escaping with an extra dollar sign so the step receives the expression:

~~~yaml
commands:
  - test -n "$${PUBLISH_TOKEN}"
~~~

Never print the value to prove it exists.

## Instance-Wide Values: WOODPECKER_ENVIRONMENT

The server setting `WOODPECKER_ENVIRONMENT` makes regular values available to all steps in all pipelines:

~~~ini
WOODPECKER_ENVIRONMENT=COMPANY_MIRROR:https://mirror.example.com,GOLANG_VERSION:1.26
~~~

The official environment documentation notes that these values cannot overwrite built-in variables. They are appropriate for stable instance facts such as an internal mirror URL or a common toolchain default.

They are usually wrong for:

- repository-specific configuration;
- mutable deployment state;
- credentials;
- values that untrusted repositories should not receive;
- a variable whose change should be reviewed with application code.

This setting tightly couples the Woodpecker server to every application pipeline. A server restart or configuration rollout can change many repositories at once. Document ownership and keep secrets in the secret store.

## Built-In CI Variables Need No Duplication

Woodpecker already supplies metadata such as:

- `CI_REPO`;
- `CI_COMMIT_SHA`;
- `CI_COMMIT_BRANCH`;
- `CI_PIPELINE_EVENT`;
- `CI_WORKSPACE`;
- `CI_SYSTEM_URL`.

Read them directly rather than copying them into custom variables in every step. Check the environment documentation for scope: some values are available while configuration is evaluated, while runtime-only values exist only inside steps.

If a built-in is needed in plugin settings, Woodpecker supports string substitution:

~~~yaml
steps:
  - name: publish
    image: example.com/acme/publisher:2
    settings:
      destination: builds/${CI_COMMIT_SHA}
~~~

Follow the documented substitution syntax for the current version and test values that can be empty for a given event.

## Separate Workflows Do Not Share the File

Files persist only among steps in the same workflow. If `.woodpecker/build.yaml` writes `.woodpecker.env`, a step in `.woodpecker/deploy.yaml` cannot read it, even when deploy has a workflow-level `depends_on: [build]`.

For cross-workflow data:

- publish an immutable artifact with metadata;
- upload a JSON manifest to object storage;
- use a storage plugin;
- recompute a deterministic value from built-in commit metadata.

Do not mount an undeclared host directory as an accidental message bus. It makes the pipeline agent-dependent and grants a wider trust boundary.

## Choose the Smallest Correct Scope

Use this decision table:

| Value | Recommended mechanism |
| --- | --- |
| Static within one YAML file | anchor and alias |
| Computed, non-secret, same workflow | workspace file |
| Secret needed by selected steps | `from_secret` per step |
| Stable for every repository on instance | `WOODPECKER_ENVIRONMENT` |
| Needed across workflows | artifact or external storage |
| Already provided by Woodpecker | built-in `CI_*` variable |

Review the scope whenever a value becomes sensitive or starts controlling deployments.

## Verification Checklist

Before merging:

1. Run `woodpecker-cli lint` on the workflow.
2. Confirm anchor aliases resolve to maps where maps are required.
3. Confirm the dynamic file is written under `CI_WORKSPACE`.
4. Use the same shell to write and safely source shell assignments.
5. Ensure the file contains no secrets.
6. Confirm separate workflows use an explicit external handoff.
7. Confirm server-wide variables are genuinely safe for all repositories.
8. Test pull-request behavior without granting new secret events.

## Official Documentation

- [Woodpecker: Advanced YAML and environment handoff](https://woodpecker-ci.org/docs/usage/advanced-usage)
- [Woodpecker: Environment variables](https://woodpecker-ci.org/docs/usage/environment)
- [Woodpecker: Step environment syntax](https://woodpecker-ci.org/docs/usage/workflow-syntax#environment)
- [Woodpecker: Secret injection](https://woodpecker-ci.org/docs/usage/secrets)
- [Woodpecker: Workspace boundaries between workflows](https://woodpecker-ci.org/docs/usage/workflows)
- [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/)

## Conclusion

There is no process-wide export shared by Woodpecker step containers. Reuse static maps with YAML anchors, hand off computed non-secret values through a workspace file, and reserve `WOODPECKER_ENVIRONMENT` for safe instance-wide defaults. Inject secrets independently into the few steps that need them, and use an artifact store whenever data must cross workflow boundaries.
