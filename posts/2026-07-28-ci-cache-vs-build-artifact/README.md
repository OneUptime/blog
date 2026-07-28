# CI Cache vs Build Artifact: Which Should You Use Between Jobs and Workflow Runs?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CI/CD, Build Artifacts, Build Cache, GitHub Action, GitLab CI

Description: Choose caches for disposable acceleration and artifacts for named build outputs that jobs, people, and deployment workflows must retrieve deliberately.

---

Use a cache when absence is harmless and regeneration is correct. Use an artifact when the file is a result of the run and another job, workflow, person, or deployment must receive that exact result.

Both features move files through storage, but their contracts are different.

## Compare the Contracts

| Property | Cache | Artifact |
| --- | --- | --- |
| Purpose | Avoid repeated downloads or computation | Preserve and transfer run output |
| Identity | Compatibility/content key with fallback lookup | Name plus workflow/job/run identity |
| On a miss | Recompute and continue | Producer must create it |
| Contents | Reconstructible data | Binaries, reports, logs, packages |
| Retention | Best effort; eviction is expected | Explicit retention within platform limits |
| Lookup | May restore an older compatible prefix | Deliberate producer/run selection |
| Security model | Restored content must be treated as untrusted | Access-controlled output, still verify before release |
| Typical examples | npm store, compiler cache, BuildKit layers | executable, coverage report, test trace, release bundle |

This distinction prevents two common mistakes: using a cache as the only copy of a release binary, and uploading a huge dependency directory as an artifact on every run.

## Between Jobs in One Workflow

Jobs normally have isolated filesystems. If `build` creates a binary that `integration-test` must test, upload it as an artifact and declare the dependency:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: ./scripts/build
      - uses: actions/upload-artifact@v7
        with:
          name: app-${{ github.sha }}
          path: dist/app.tar.gz
          if-no-files-found: error

  integration-test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v8
        with:
          name: app-${{ github.sha }}
          path: dist
      - run: ./scripts/test-package dist/app.tar.gz
```

`needs` supplies ordering; upload/download supplies bytes. A job output is suitable for small scalar metadata, such as a version or digest, but not a binary archive.

GitLab later-stage jobs download artifacts from earlier stages by default. `dependencies` or `needs:artifacts` narrows which ones they fetch. Explicit selection reduces transfer time and makes the graph easier to audit.

Use a cache between jobs only when every consumer can correctly regenerate the path on a miss. For example, parallel test jobs can share a package download cache, then each run a locked install.

## Between Workflow Runs

A cache naturally spans runs: a new run looks up a compatible key. That is ideal for data such as packages or intermediate task results that many commits can reuse.

An artifact also survives the producing run for its retention period, but a later workflow must identify and fetch the intended producer. Avoid ambiguous "latest successful" promotion logic. Record at least:

- source commit;
- producing workflow and run ID;
- artifact name;
- cryptographic digest;
- target platform;
- provenance or attestation reference.

For long-lived releases, use the system designed for the object: a package registry, container registry, release asset store, or artifact repository. CI workflow artifacts are useful handoff and diagnostic storage, but retention and access rules may not match production release requirements.

## Classify Common Files

### Dependency downloads: cache

Package-manager stores are reconstructible. Key them from the lockfile and compatibility inputs, then run a frozen install. Do not put credentials in the cached path.

### Built executable: artifact

Tests and deployments need the exact bytes built by the producer. Store the executable with its checksum and metadata. Recompiling it in every downstream job defeats "build once."

### Test report: artifact

JUnit XML, screenshots, videos, traces, coverage, and crash dumps explain one run. They should remain associated with that run even when tests fail. Upload diagnostic artifacts with an `if` condition that still executes after a failure, while avoiding constructs that prevent cancellation.

### Compiler object files: cache

They can be regenerated and should normally be managed by a build system or compiler cache that understands inputs. A hand-packed object directory as an artifact is brittle across toolchains and paths.

### Generated source: depends

If generation is cheap and deterministic, regenerate it. If it is an authoritative product of a job needed verbatim downstream, use an artifact. If generated code belongs in source control by project policy, neither cache nor artifact replaces that review process.

### Container image: registry object

Push it to an image registry and pass its immutable digest. A BuildKit cache accelerates constructing it; it is not the deployable image.

## Do Not Let a Cache Become a Hidden Artifact

This pattern is unsafe:

```yaml
- restore: dist/
- if cache-hit, skip build
- deploy dist/app
```

The cache can be absent, evicted, restored through a broad fallback, or readable across scopes that were not designed as release channels. The deploy job also loses a clear link to the producing run.

Instead:

1. build once;
2. test the produced bytes;
3. publish them as an artifact or registry object;
4. record a checksum or digest;
5. promote that identity through environments.

A build-system remote cache may legitimately restore final task outputs, but the release pipeline should still publish the chosen output into an artifact store and attach provenance. "It came from a cache hit" is not a release record.

## Account for Trust and Retention

GitHub explicitly says restored caches should be treated as untrusted input and must not contain secrets. Fork pull requests can read caches from their base branch. Limit cache writers and validate what is consumed.

Artifacts are access-controlled, but access alone does not prove integrity. A privileged release workflow should verify the expected source, producer, digest, and attestation before deployment. Restrict who may download sensitive artifacts, and avoid putting secrets in artifacts at all.

Choose retention deliberately:

- short for bulky diagnostic output that becomes stale;
- long enough for investigation and compliance requirements;
- outside CI storage for supported releases and disaster recovery.

## A Simple Decision Test

Ask these questions in order:

1. If storage returns "not found," may the job correctly regenerate the data? If no, it is an artifact or registry object.
2. Must a consumer receive exactly the producer's bytes? If yes, it is an artifact.
3. Is the object useful across unrelated commits when compatibility inputs match? If yes, it is a cache candidate.
4. Is it a scalar smaller than a file transfer? Use a job or workflow output.
5. Is it a deployable package or image with long-lived identity? Publish it to the corresponding registry.

Most efficient pipelines use both: caches to make the producing job fast, and artifacts to make its result explicit.

## Official Documentation

- [GitHub Actions dependency caching concepts](https://docs.github.com/en/actions/concepts/workflows-and-actions/dependency-caching)
- [Store and share data with GitHub Actions workflow artifacts](https://docs.github.com/en/actions/tutorials/store-and-share-data)
- [Download GitHub Actions workflow artifacts](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts)
- [GitLab job artifacts](https://docs.gitlab.com/ci/jobs/job_artifacts/)
- [GitLab CI/CD caching](https://docs.gitlab.com/ci/caching/)
- [GitLab `needs`](https://docs.gitlab.com/ci/yaml/needs/)
