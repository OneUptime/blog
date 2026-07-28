# Why Did a One-Line Change Trigger a Full Rebuild? Diagnosing an Incorrect Dependency Graph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Build Automation, Monorepo, Build Cache, Nx, Turborepo

Description: Trace an unexpected full rebuild through affected selection, graph fan-out, task inputs, and cache fingerprints before narrowing dependencies safely.

---

A one-line edit can legitimately rebuild everything if it changes a compiler, root configuration, lockfile, generated schema, or high-fan-out library. It can also expose an overly broad dependency edge or task input.

Do not start by excluding the changed file from the cache key. First determine which of three events happened:

1. the change selected every project as affected;
2. the project graph selected many transitive dependents;
3. the correct tasks were selected, but their cache fingerprints all missed.

Those are different investigations.

## Capture the Exact Rebuild

Record:

- base and head commits used for affected selection;
- changed files;
- selected projects and tasks;
- dependency path from the changed project to each dependent;
- cache hit or miss per task;
- the changed hash input for representative misses;
- command-line arguments, environment inputs, and tool versions.

Use the build tool's dry-run and graph facilities before running another expensive build. Turborepo can produce JSON with `--dry=json`, including task dependencies, inputs, outputs, command, and hash. Its `--summarize` run data helps compare changed inputs. Nx exposes task graphs and configured inputs and can compare cache-hash inputs in its remote tooling.

Do not rely on a CI job list alone. It shows what ran, not why the build system selected or invalidated it.

## Verify the Git Range

A wide or missing baseline can make a one-line visible diff represent many commits to the selector. Print:

```bash
git rev-parse "$BASE"
git rev-parse "$HEAD"
git diff --name-status "$BASE...$HEAD"
```

Common errors include:

- comparing with the previous successful build from weeks ago;
- using `HEAD^` after a merge;
- failing to fetch the target branch;
- calculating the base from the wrong event field;
- using a shallow clone that forces the tool to treat everything as changed;
- comparing the synthetic merge commit differently from local tests.

If the tool safely falls back to all projects when history is unavailable, the full rebuild is expected. Fix checkout depth or explicit base/head values before editing the project graph.

## Find the First High-Fan-Out Node

Suppose the graph is:

```text
root-config -> shared-utils -> 38 libraries -> 20 applications
```

Changing `shared-utils` can correctly reach most of the repository. Ask whether the node actually represents one cohesive API. "Common," "utils," and root configuration projects often accumulate unrelated code. Splitting one broad package into narrower libraries can reduce fan-out without lying to the graph.

Use reverse-dependency queries:

- Nx project/affected graph;
- Turborepo package queries and dependency-change reasons;
- Bazel `rdeps` or `allrdeps`;
- Pants `dependents` or changed transitive dependents.

Inspect the path, not only the dependent count. One accidental edge near the root may explain thousands of tasks.

## Separate Dependency Edges from Task Inputs

A project dependency states that one project consumes another. A task input states which parts can change a task's output.

For Nx, `"^production"` as a build input means the production inputs of dependencies affect the hash. That is separate from `"^build"` in `dependsOn`, which schedules dependency builds first.

A full rebuild may come from either:

- every project incorrectly depends on a root project;
- every task includes a root-wide input glob;
- every task includes a volatile environment or runtime value;
- one lockfile is treated as global for all tasks;
- outputs are written into directories included as inputs.

Fix the layer where the broadness originates.

## Inspect Global Inputs

Turborepo calculates global and task hashes. Root task configuration, relevant lockfile changes, `globalDependencies`, listed global environment variables, behavior-changing flags, and passthrough arguments can affect broad sets of tasks.

Global invalidators commonly include:

- root `package.json` or lockfile;
- `turbo.json`, `nx.json`, or common build configuration;
- compiler and runtime version files;
- a shared `.env` added as a global dependency;
- a command flag containing a run ID or timestamp;
- a base container digest;
- a generated version file rewritten on every run.

For each input, ask: "Can changing this value alter this task's output?" If yes, broad invalidation may be necessary. If not, remove it from that task's hash only after a controlled comparison proves equivalence.

Never remove a secret or feature flag from the hash merely to improve hits if it changes output. Instead, redesign the build so environment-specific values are supplied at runtime.

## Look for Self-Invalidating Tasks

A task can write a file that its next invocation considers an input:

```text
inputs:  project/**
output:  project/dist/**
```

If `dist` is not excluded from the input set, every run changes its own hash. Other examples are coverage files, generated timestamps, formatted source, and test snapshots written during a build.

Keep generated output in declared output directories outside source inputs. Nx's cache troubleshooting guidance specifically calls out output files modifying task inputs. Run the same task twice with no source changes; the second should hit the cache or do no work.

## Compare Fingerprints, Not Guesses

Take one task that should have hit and compare two runs:

| Input class | Previous | Current |
| --- | --- | --- |
| source digest | … | … |
| dependency source digest | … | … |
| lock/external dependencies | … | … |
| runtime version | … | … |
| environment inputs | … | … |
| command and flags | … | … |

The first unexpected difference is usually the root cause. For Bazel remote cache diagnosis, execution logs can be compared between repeated builds; non-hermetic actions often produce different action keys.

If fingerprints are identical but the remote cache misses, investigate cache availability, authentication, write policy, eviction, namespace, and platform properties. That is a storage problem, not a dependency graph problem.

## Test a Narrower Model Safely

When a broad input looks unnecessary:

1. state why it cannot affect the output;
2. create two clean builds differing only in that input;
3. compare outputs and relevant tests;
4. run under sandboxing or file-access tracing if available;
5. add a graph/input contract test;
6. keep periodic clean full builds as a backstop.

False cache misses cost time. False hits can ship stale artifacts. Bias toward correctness and narrow only with evidence.

## Common Root Causes

### A shared library genuinely changed

The rebuild is correct. Reduce its API surface or split high-fan-out packages if the organizational cost justifies it.

### Root lockfile changed

Determine whether the tool can map dependency changes to consumers. A conservative global miss may be expected.

### All package files are task inputs

Define production inputs that exclude tests, docs, and outputs where those files cannot affect the build.

### Volatile metadata is hashed

Remove timestamps and run IDs from build inputs or generate them after cacheable compilation. Keep provenance attached without making every task unique.

### Output overlaps input

Move or exclude the output, clean once, and prove a null rebuild.

### Wrong baseline or shallow history

Fix checkout and explicit SHAs; do not compensate with unsafe path exclusions.

## Make Rebuild Reasons Observable

Store dry-run graphs and summaries as CI artifacts for unusually large runs. Alert when affected count or cache-miss rate crosses a baseline. Report the top invalidating input and the highest-fan-out changed project.

The target is not "a one-line change must always run one task." The target is explainability: every selected task has a valid dependency path, and every cache miss has a behavior-changing input difference.

## Official Documentation

- [Nx affected tasks](https://nx.dev/docs/features/ci-features/affected)
- [Nx task cache inputs](https://nx.dev/docs/guides/tasks--caching/configure-inputs)
- [Nx cache-miss troubleshooting](https://nx.dev/docs/kb/troubleshoot-cache-misses)
- [Turborepo caching and troubleshooting](https://turborepo.com/docs/crafting-your-repository/caching)
- [Turborepo `run` reference](https://turborepo.com/docs/reference/run)
- [Bazel query how-to](https://docs.bazel.build/versions/main/query-how-to.html)
- [Bazel remote-cache debugging](https://bazel.build/remote/cache-remote)
