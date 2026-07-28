# How to Use a Remote Build Cache Across Ephemeral CI Runners

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Build Cache, CI/CD, Bazel, Nx, Turborepo

Description: Share content-addressed task results across disposable runners with deterministic inputs, scoped credentials, platform namespaces, and measurable fallback behavior.

---

An ephemeral runner starts without the previous machine's local cache. A remote build cache moves reusable task results to a service every runner can reach.

The safe model is not "archive the build directory and restore the latest one." It is:

```text
action key = hash(command + declared inputs + relevant environment + toolchain + platform)
action key -> result metadata + content-addressed output blobs
```

If the key matches, the runner restores exactly those outputs. If it misses, or if the service is unavailable and the client is configured to bypass cache errors, the task executes locally and remains correct.

## Use the Build Tool's Native Cache

A generic CI cache sees paths and hand-written keys. A build tool understands tasks, transitive inputs, command lines, outputs, and sometimes platform properties.

Examples:

- Bazel remote caching stores action results and a content-addressable store through the Remote Execution API model.
- Pants supports remote caching through REAPI and additional providers.
- Nx remote caching shares task terminal output and declared file outputs.
- Turborepo remote caching shares deterministic task results across developers and CI.
- Docker BuildKit imports and exports layer cache through registry, GitHub Actions, and other backends.

Prefer that native protocol for build outputs. Use the CI provider cache for package download stores or as a supported backend when the build tool integrates with it.

## Make Tasks Cacheable Before Making Them Remote

A remote cache amplifies both correctness and mistakes. A task must:

- read only declared inputs;
- include toolchain, flags, relevant environment, and target platform in its key;
- write only declared outputs;
- produce deterministic results for those inputs;
- avoid mutating source or shared state;
- not depend on current time, hostname, or network responses unless modeled.

Test locally:

1. run the task from a clean tree;
2. run it again and expect a local hit;
3. delete local outputs and restore them from the local cache;
4. run on a second clean machine with the same toolchain;
5. compare outputs.

Bazel's remote-cache documentation states that correct remote reuse depends on reproducible actions. Pants uses hermetic sandboxes for many processes. Nx and Turborepo require correct input/output configuration and deterministic tasks.

## Design the Remote Service Boundary

The cache needs:

- low-latency network paths from runners;
- enough bandwidth for expected blobs;
- authentication and authorization;
- encryption in transit;
- namespace or instance separation;
- retention and garbage collection;
- concurrency and availability targets;
- observability for hit, miss, error, and transfer time.

Place it near runners. A 400 MB download over a slow cross-region link may take longer than a 30-second compile.

Do not treat the cache as the only artifact store. Entries can be evicted and should be reconstructible. Publish release binaries and images to durable artifact or package registries.

## Separate Platform and Toolchain Namespaces

The action key or remote instance must distinguish incompatible work:

- Linux, macOS, and Windows;
- CPU architecture;
- compiler, linker, SDK, and runtime;
- build configuration and feature flags;
- container or execution environment;
- repository when keys are not globally collision-resistant.

REAPI-based tools include action and platform data according to their configuration, but custom rules can omit important details. Docker caches should use separate scopes or references per image/platform where needed. Nx and Turborepo runtime/environment inputs must be declared.

Never solve cross-platform misses by removing platform identity unless outputs are proven portable.

## Apply a Trust Policy to Reads and Writes

A practical policy is:

| Workflow | Read | Write |
| --- | --- | --- |
| trusted default-branch build | yes | yes |
| trusted internal pull request | yes | maybe |
| fork pull request | read-only isolated namespace, or no access | no |
| release build | trusted cache reads plus verification | restricted |

GitHub documents that base-branch caches can be read by fork pull requests and restored cache data is untrusted. Third-party remote caches need explicit enforcement; do not assume CI event restrictions automatically apply.

Protect write credentials and limit them to trusted jobs. Do not place tokens inside cached outputs or logs. Consider distinct instances for untrusted contributions and production builds.

For developer writes, decide whether every workstation is trusted to populate CI results. Nx's guidance notes that allowing developer machines to write shared cache used by CI requires trusting everyone who can access the codebase. CI-only writers are a safer default.

## Configure Graceful Fallback

Cache failure should not break an otherwise valid build unless policy explicitly requires remote-only execution.

Define:

- connection and per-request timeouts;
- retry limits with backoff;
- maximum cache errors before bypass;
- whether writes are best effort;
- local execution fallback;
- a switch to disable remote reads for diagnosis.

Do not spend ten minutes retrying a cache to save a two-minute compile. Conversely, silent cache failures can create a sudden compute spike; alert on error rate and hit-rate collapse.

## Example: Bazel Remote Cache

A basic Bazel invocation can point at an HTTP cache:

```bash
bazel build //... \
  --remote_cache=https://cache.example.com \
  --remote_upload_local_results=true
```

Supply authentication through supported credential mechanisms, not a token committed in `.bazelrc`. Use TLS and restrict the service.

Bazel separates action-cache metadata from content-addressed blobs. On a hit, output blobs are downloaded rather than executing the action. Investigate unexpected misses by comparing execution logs and checking for non-hermetic action inputs.

## Example: Docker BuildKit Registry Cache

For disposable Docker builders, use a Buildx driver that supports the registry cache exporter. With the default `docker` driver, registry cache export requires the containerd image store to be enabled.

```bash
docker buildx build \
  --cache-from type=registry,ref=registry.example.com/app:buildcache \
  --cache-to type=registry,ref=registry.example.com/app:buildcache,mode=max \
  --push -t registry.example.com/app:"$GIT_SHA" .
```

Use a distinct cache reference per image or scope. Two jobs writing the same location can overwrite each other. The image tag/digest is the deployable result; the cache reference is disposable acceleration state.

## Example: Nx or Turborepo

For task-oriented monorepos, first declare:

- task dependencies;
- file and environment inputs;
- file outputs;
- deterministic commands.

Then connect the supported remote service. A cache hit should restore both terminal output and declared artifacts. If an expected file is absent, inspect `outputs`; if an unrelated edit causes a miss, compare task inputs or run summaries.

Keep remote-cache tokens out of task environment hashes unless the tool specifically treats them as passthrough values. A rotating authentication token should not invalidate every build output.

## Seed and Warm Deliberately

The first run for a new input set must execute. A trusted default-branch workflow can keep common dependencies and task results warm for pull requests.

Avoid a nightly job that invents different flags from real CI. Warm the same targets, toolchains, and platforms users request. Prewarming every possible key wastes storage and eviction bandwidth.

Import from more than one safe source when supported, for example, a branch-specific cache first and a default-branch cache as fallback, without allowing an old fallback to bypass full input validation.

## Measure End-to-End Value

Track:

- local, remote, and miss counts;
- download/upload bytes and time;
- lookup latency;
- execution time avoided;
- cache service error rate;
- eviction age;
- hit rate by target and platform;
- cost of storage, egress, and service operation.

Classify misses:

- expected input change;
- cold key;
- unavailable/evicted entry;
- incompatible platform;
- authentication or namespace error;
- non-hermetic input;
- configuration drift.

Remove caching for outputs cheaper to recompute than transfer. Use compression appropriate to CPU and network conditions.

## Validate Correctness Continuously

Sample builds with remote reads disabled and compare results. Run periodic clean builds, sandbox or trace file access, and audit task input declarations. Quarantine or disable caching for nondeterministic tasks until fixed.

On a suspicious hit:

1. record the action key;
2. rebuild without remote reads;
3. compare output digests;
4. inspect undeclared inputs and writers;
5. rotate or isolate the cache namespace if poisoning is possible.

A remote cache pays off when a clean runner can trust an exact computation performed elsewhere, not when it inherits an opaque directory from the last job.

## Official Documentation

- [Bazel remote caching](https://bazel.build/remote/caching)
- [Bazel remote cache debugging](https://bazel.build/remote/cache-remote)
- [Bazel remote execution overview](https://bazel.build/remote/rbe)
- [Pants remote caching](https://www.pantsbuild.org/stable/docs/using-pants/remote-caching-and-execution/remote-caching)
- [Nx caching tasks](https://nx.dev/docs/getting-started/tutorials/caching)
- [Nx reducing CI waste](https://nx.dev/docs/concepts/ci-concepts/reduce-waste)
- [Turborepo remote caching](https://turborepo.com/docs/core-concepts/remote-caching)
- [Docker cache storage backends](https://docs.docker.com/build/cache/backends/)
