# Trace BuildKit Cache Misses with Plain Progress Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, BuildKit, Build Cache, Troubleshooting, CI/CD

Description: Trace BuildKit cache misses through stage dependencies and controlled input changes without mistaking plain progress logs for a complete causal explanation.

---

Plain BuildKit progress logs show which build operations ran and which reused cache. They do not always print the exact changed input that caused a miss. Use the log to locate the first relevant miss in a stage's dependency chain, then compare that instruction's inputs between builds.

This qualification matters for multi-stage Dockerfiles: operations can run concurrently, stage numbers can change, and a missing external cache can make unchanged instructions execute. The first non-cached line in the entire log is not necessarily the cause of your slow application build.

## Capture a Comparable Pair of Builds

Start with the same checkout, platform, target, arguments, and builder configuration. Keep normal cache imports enabled:

```bash
set -o pipefail
build_log="$(mktemp /tmp/buildkit-cache-diagnosis.XXXXXX)"
docker buildx build \
  --progress=plain \
  --platform linux/amd64 \
  --target runtime \
  --cache-from type=registry,ref=registry.example.com/team/api-cache:main \
  --load --tag api:cache-diagnosis \
  . 2>&1 | tee "$build_log"
```

Replace the registry reference with your authorized cache location. The example assumes registry authentication and a builder supporting that cache backend. The log stays outside the build context so that `COPY . .` cannot include the changing diagnostic output and affect the cache comparison. `pipefail` prevents `tee` from hiding a failed build. Buildx documents `plain` as a progress mode that prints build output as plain text. [Buildx build reference](https://docs.docker.com/reference/cli/docker/buildx/build/).

Capture environment facts separately:

```bash
docker buildx version
docker buildx inspect --bootstrap
git rev-parse HEAD
git status --short
```

Record non-secret build arguments and resolved base-image digests as well. A log comparison is only useful if you know which dimensions changed.

## Read Operation Identity Before Status

A simplified illustrative log might look like this:

```text
#8 [deps 2/3] COPY package.json package-lock.json ./
#8 CACHED
#9 [deps 3/3] RUN npm ci
#9 CACHED
#10 [build 1/2] COPY . .
#10 DONE 0.1s
#11 [build 2/2] RUN npm run build
#11 DONE 9.4s
```

The dependency installation was reused. The source copy ran, followed by compilation. Investigate the files included by `COPY . .` before changing `npm ci` or its cache mount.

These are sample lines, not measured results. Real logs include metadata loads, context transfer, exporters, and sometimes interleaved stages. Match operations by stage and Dockerfile instruction, not by `#10`, because numeric operation identifiers are local to a build.

BuildKit solves a dependency graph and skips stages that the requested target does not need. An unrelated independent stage's activity does not establish a dependency on your slow stage. [BuildKit overview](https://docs.docker.com/build/buildkit/).

## Check Cache Availability Before Invalidation

Look for import failures before concluding that the Dockerfile changed. An authentication error, missing registry reference, expired cache, or wrong image scope can leave BuildKit with no reusable record.

A layer that executes because no record was imported is a cache miss, but there may be no changed instruction to find. Repeat with a known successful cache producer and a fresh consumer builder. That separates external-cache plumbing from local persistence.

Also verify that both builds use the same target platform and compatible base image. A moved base-image tag can legitimately change the parent state for many later operations.

## Compare the Inputs of the First Relevant Miss

For `COPY` and local `ADD`, examine the selected source files and metadata. Docker documents that modification time alone is excluded from the cache checksum. A checkout timestamp difference therefore is not sufficient evidence for a miss. [Cache invalidation rules](https://docs.docker.com/build/cache/invalidation/).

Check the Dockerfile and context changes:

```bash
git diff --name-status BASE_COMMIT HEAD
git diff BASE_COMMIT HEAD -- Dockerfile .dockerignore package-lock.json
```

Substitute an actual previous commit for `BASE_COMMIT`. Git reports tracked changes; separately inspect generated files, untracked files, file permissions, and CI-generated configuration included in the build context.

For `RUN`, compare the instruction, preceding filesystem state, relevant arguments, mounts, and environment. Do not assume a remote package repository change invalidated an unchanged command. Secret contents are also excluded from the cache key; secret mount properties and explicit non-secret version inputs are separate considerations.

## Confirm the Hypothesis with One Change

Use a temporary checkout and change one input at a time:

| Experiment | Expected observation |
| --- | --- |
| Repeat identical inputs with accessible cache | Eligible operations reuse cache |
| Edit application source only | Source-dependent operations rerun |
| Edit dependency lockfile | Dependency installation and its dependents rerun |
| Add an ignored report file | No cache change from that file |
| Remove external import on a fresh builder | Previously reusable operations may execute |

Do not use `--no-cache` for the comparison that is supposed to prove a hit. Use it only as a separate clean-build baseline when you need to establish correct outputs independently of cached results.

## Fix the Smallest Input Boundary

If a report or `.git` directory enters a broad source copy, correct `.dockerignore`. If installation consumes only manifests and lockfiles, copy those before application source. If workspace configuration or install scripts are real dependency inputs, include them too.

Keep a short record of the operation, differing input, and confirming experiment. “The build step was not cached” is an observation. “The generated report entered `COPY . .`, and excluding it preserved the cache on the next otherwise identical run” is a diagnosis a teammate can reproduce.

## References

- [Buildx progress and build options](https://docs.docker.com/reference/cli/docker/buildx/build/)
- [BuildKit dependency graph](https://docs.docker.com/build/buildkit/)
- [Cache invalidation](https://docs.docker.com/build/cache/invalidation/)
- [Cache optimization](https://docs.docker.com/build/cache/optimize/)
