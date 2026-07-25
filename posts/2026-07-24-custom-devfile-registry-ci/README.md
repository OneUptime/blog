# Building and Publishing a Custom Devfile Registry with CI Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Devfile, Registries, Continuous Integration, Kubernetes, Automation

Description: Build a versioned Devfile registry, validate stack metadata and effective content in CI, publish immutable images, and smoke-test its API.

---

A private Devfile registry gives platform teams a curated catalog of development environments without copying Devfiles into every application repository. The registry is more than a web directory: its index container seeds an OCI registry with stack artifacts and exposes an API that Devfile consumers use to discover and retrieve them. That makes the registry image a software supply-chain artifact, so it deserves the same review, reproducibility, and promotion controls as an application image.

The current Devfile documentation is version 2.3. The examples below target `schemaVersion: 2.3.0` and the official registry build tools. Consumer compatibility still needs an explicit test matrix; a Devfile that is valid against the current schema is not automatically supported by every older client.

## Design the repository around versioned stacks

The official repository layout places each stack under `stacks/`, with a `stack.yaml` catalog entry and one directory per version:

```text
.
├── extraDevfileEntries.yaml
├── last_modified.json
└── stacks
    └── go-enterprise
        ├── stack.yaml
        ├── 1.0.0
        │   ├── devfile.yaml
        │   └── Dockerfile
        └── 1.1.0
            ├── devfile.yaml
            └── Dockerfile
```

With `registry-support` v1.3.0, `last_modified.json` is also required at the repository root. Populate its `stacks` and `samples` arrays with each entry's name, version (use `undefined` for an unversioned entry), and RFC 3339 `lastModified` timestamp before running the build. The official registry generates this file from Git history during its container build.

The stack metadata declares all published versions and exactly one default:

```yaml
name: go-enterprise
displayName: Enterprise Go
description: Go development environment with organization defaults
icon: https://raw.githubusercontent.com/devfile-samples/devfile-stack-icons/main/golang.svg
versions:
  - version: 1.0.0
  - version: 1.1.0
    default: true
```

Each version directory contains its own `devfile.yaml` and any resources it references. Keep the directory name, the `stack.yaml` version, and `metadata.version` in the Devfile identical. The build tool checks the registry structure, but a small repository policy test makes that relationship visible and produces a clearer pull-request error.

Changing the default is a release decision. Existing consumers that request `1.0.0` should continue receiving immutable 1.0.0 content; consumers that omit a version may receive the new default. Never rewrite an already published version in place. Add a new version, test it, and change the default only after compatibility review.

`extraDevfileEntries.yaml` can add stacks and samples from other Git repositories. Those entries are external supply-chain dependencies, not mere links. Pin a commit or other immutable revision where the schema permits it, verify that the referenced repository remains reachable, and include it in dependency review. A moving branch can change the registry image without an obvious change to the local stack directories.

## Pin the build toolchain

The Devfile 2.3 documentation describes cloning `devfile/registry-support` and running `build-tools/build_image.sh`. The script builds the index generator, validates and packages the repository, generates `index.json`, and produces a local image named `devfile-index`.

Pin the support repository instead of building arbitrary `main` content. At the time of writing, the current `registry-support` release is `v1.3.0`; its build-tools documentation requires Go 1.24.x or newer, Docker 17.05 or newer, Git, and yq 4.x:

```bash
git clone \
  --depth 1 \
  --branch v1.3.0 \
  https://github.com/devfile/registry-support.git \
  .registry-support

(
  cd .registry-support/build-tools
  bash ./build_image.sh "$CI_PROJECT_DIR"
)
```

Set `CI_PROJECT_DIR` to the absolute checkout path in the CI environment. Use a runner image that pins Go and yq, or install them through a checksum-verified organization-managed step. Keep the support version in one dependency file or pipeline variable so an automated update can open a reviewable pull request.

Version pinning is a starting point, not a reason to freeze forever. Review upstream releases, rebuild in a branch, inspect index changes, and run the complete acceptance suite before advancing the pin. Also record the resolved base-image digest used by the build, because a mutable base tag can otherwise make two builds from the same commit differ.

## Make the official build the first CI gate

A pull-request pipeline should fail immediately when the official builder rejects the repository. A minimal job, expressed in GitHub Actions, looks like this:

```yaml
name: validate-devfile-registry

on:
  pull_request:

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-go@v7
        with:
          go-version: "1.24.x"
      - name: Verify pinned tools
        run: |
          go version
          yq --version
          docker version
      - name: Build and validate registry
        env:
          SUPPORT_VERSION: v1.3.0
        run: |
          git clone --depth 1 --branch "$SUPPORT_VERSION" \
            https://github.com/devfile/registry-support.git \
            .registry-support
          (
            cd .registry-support/build-tools
            bash ./build_image.sh "$GITHUB_WORKSPACE"
          )
```

Use immutable commit SHAs for third-party CI actions under a strict supply-chain policy; version tags are shown here for readability. Ensure yq 4.x is present in the runner or add the team's pinned installation step before executing the job.

The official build validates expected registry structure and generates the same packaged representation that will be deployed. It is more authoritative than running a generic YAML parser alone. It does not, however, prove that every container image starts, every starter repository remains accessible, or every command works in the organization's Kubernetes environment. Those require additional gates.

## Inspect the generated index

The build creates `index.json` inside the `devfile-index` image. Extract it and assert catalog policies before publication:

```bash
container_id="$(docker create devfile-index)"
trap 'docker rm -f "$container_id" >/dev/null 2>&1 || true' EXIT
docker cp "$container_id:/registry/index.json" ./index.json

jq -e '
  .[] |
  select(.name == "go-enterprise") |
  ([.versions[] | select(.default == true)] | length) == 1
' index.json
```

Extend this test across all entries. Useful organization policies include:

- every local stack has exactly one default version;
- names are unique and follow the catalog naming convention;
- every listed version has a matching directory and `metadata.version`;
- referenced Dockerfiles, Kubernetes manifests, icons, and archives exist;
- supported architectures are declared accurately;
- container images use approved registries and immutable digests;
- starter projects use reachable repositories and pinned revisions; and
- no Devfile or packaged resource contains credentials.

Validate effective Devfiles, not only their top-level YAML. Devfile validation includes semantic relationships: command IDs must be unique, referenced components must exist, event commands must be valid for their event, and parent inheritance must resolve consistently. If a stack uses a parent Devfile, test the flattened behavior with the same library or maintained consumer used in production.

## Start the registry and test its public contract

The index image is only half of the deployed service. According to the registry architecture, the index server uses `index.json`, bootstraps an OCI registry with the packaged stacks, and exposes retrieval APIs. Deploy the candidate image into an ephemeral namespace using the official Devfile Registry Operator or Helm chart, then wait for both components to become ready.

Query the API through the same TLS and authentication path developers will use:

```bash
curl --fail --silent --show-error \
  "$REGISTRY_URL/index/all" \
  | jq -e 'any(.[]; .name == "go-enterprise")'

curl --fail --silent --show-error \
  "$REGISTRY_URL/devfiles/go-enterprise/1.1.0" \
  | yq -e '.schemaVersion == "2.3.0"'
```

Test the default and an explicit older version, download packaged resources, and create a disposable project with each supported Devfile consumer. A successful `/index/all` response does not prove that the OCI artifact was seeded correctly, so always retrieve at least one complete stack version.

Keep TLS verification enabled. Configure trusted certificates, registry credentials, and network policy in the test environment exactly as production expects. A smoke test that disables certificate checks will miss one of the most common private-registry integration failures.

## Test the consumers you actually support

Define a compatibility matrix alongside the registry. It should name consumer versions, Devfile schema versions, cluster versions, CPU architectures, and the stack versions each combination must accept. Run a small build and run command from the retrieved stack rather than stopping after schema validation.

Devfile documentation still contains odo-oriented examples, but odo was deprecated effective October 23, 2025, and its repository was archived on April 1, 2026. odo v3 documents Devfile 2.2.0 support. If an organization still has a pinned odo v3 estate, retain a temporary 2.2-compatible consumer test and a migration plan; do not make that archived client the only acceptance test for a new 2.3 registry.

## Publish once and promote by digest

Only a protected-branch or release job should receive push credentials. Tag the validated local image with the source commit, push it, capture the registry-reported digest, and promote that exact digest:

```bash
IMAGE="registry.example.com/platform/devfile-index"
docker tag devfile-index "${IMAGE}:${GIT_COMMIT}"
docker push "${IMAGE}:${GIT_COMMIT}"
```

Do not rebuild separately for staging and production. Deploy `${IMAGE}@sha256:...` from the push result to staging, run the API and consumer tests, then promote the same digest to production. Keep the source commit, support-tool version, generated `index.json`, resolved dependencies, and test results as release metadata. Add an SBOM, vulnerability scan, signature, and provenance attestation when the organization's container platform supports them.

Rollback is then straightforward: redeploy the previous known-good digest. Because stack versions are immutable, explicit-version clients continue to behave predictably, while changing the default remains a separately reviewed catalog action.

A trustworthy custom registry is therefore built in layers: structural validation, effective Devfile validation, generated-index policy, deployed API tests, and real consumer tests. Passing all five turns a directory of useful YAML into a versioned platform product developers can safely depend on.

## Official Documentation

- [Understanding a Devfile registry](https://devfile.io/docs/2.3.0/understanding-a-devfile-registry)
- [Building a custom Devfile registry](https://devfile.io/docs/2.3.0/building-a-custom-devfile-registry)
- [Deploying a Devfile registry](https://devfile.io/docs/2.3.0/deploying-a-devfile-registry)
- [Adding a registry schema](https://devfile.io/docs/2.3.0/adding-a-registry-schema)
- [Creating a Devfile stack](https://devfile.io/docs/2.3.0/creating-a-devfile-stack)
- [Adding a stack.yaml file](https://devfile.io/docs/2.3.0/adding-a-stack-yaml-file)
- [Devfile validation rules](https://devfile.io/docs/2.3.0/devfile-validation-rules)
- [Devfile 2.3 schema reference](https://devfile.io/docs/2.3.0/devfile-schema)
- [Devfile registry-support v1.3.0 build tools](https://github.com/devfile/registry-support/tree/v1.3.0/build-tools)
- [Official Devfile registry source](https://github.com/devfile/registry)
- [odo deprecation announcement](https://odo.dev/blog/odo-deprecation-announcement/)
- [Archived odo GitHub repository](https://github.com/redhat-developer/odo)
