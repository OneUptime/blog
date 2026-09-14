# Fix Stale Nx and Turborepo Outputs with Complete Input Declarations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nx, Turborepo, Monorepo, Build Cache, CI/CD

Description: Prevent stale monorepo cache replays by declaring file and environment inputs, modeling deterministic generators, and verifying restored output coverage.

---

A stale cache hit means the build tool considered two computations equivalent even though the result should have changed. Clearing the cache can hide the symptom for one run, but the incorrect input model remains and can publish another stale result.

For Nx and Turborepo, inspect three contracts together: what the task reads, which prerequisite tasks create those inputs, and which output files the cache must restore.

## Start with One Incorrect Artifact

Identify the exact file and value that should have changed. For example, a frontend bundle still contains a staging API URL after CI switched to production, or generated client code still reflects an older schema.

Rebuild with cache reads disabled in a disposable checkout. If the artifact remains wrong, investigate the build itself. If the fresh artifact is correct, compare the cached task's declared inputs with the inputs the build actually consumed.

Turborepo provides run summaries and dry runs for inspecting task hashes, inputs, dependencies, and outputs. Use the locally installed version rather than downloading a different version during diagnosis. [Turborepo run reference](https://turborepo.dev/docs/reference/run).

```bash
turbo run build --dry=json > turbo-plan.json
turbo run build --summarize
```

Keep summaries containing internal paths or environment information within your normal CI artifact access boundary.

## Preserve Default Source Inputs When Extending Them

A narrow input list can accidentally remove framework configuration, templates, scripts, or package metadata. In Turborepo, setting `inputs` replaces default file selection; `$TURBO_DEFAULT$` lets you extend it. [Configuration reference](https://github.com/vercel/turborepo/blob/main/apps/docs/content/docs/reference/configuration.mdx).

For packages that each define deterministic `generate` and `build` scripts:

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "generate": {
      "inputs": ["$TURBO_DEFAULT$", "$TURBO_ROOT$/schemas/**"],
      "outputs": ["src/generated/**"]
    },
    "build": {
      "dependsOn": ["^build", "generate"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "env": ["PUBLIC_API_URL", "BUILD_FLAVOR"],
      "outputs": ["dist/**"]
    }
  }
}
```

Adapt task names and output directories to the actual repository. Packages without generation work should use appropriately scoped package configuration instead of inheriting a nonexistent prerequisite.

The root schema directory is an input to generation. The generator's own source, package configuration, and other normal package inputs remain included. Generated files should be treated consistently, typically as ignored declared outputs whose producer is represented in the task graph.

## Hash Behavior-Changing Environment Values

If `PUBLIC_API_URL` is compiled into a bundle, its value must affect the task hash. Merely allowing an environment variable through to a process does not make it a cache input.

Turborepo distinguishes `env` and `globalEnv`, which affect hashes, from passthrough variables, which are available without hashing. It also does not load `.env` files for the application; the framework or a loader does that. Include those files when the task reads them. [Environment variables](https://github.com/vercel/turborepo/blob/main/apps/docs/content/docs/crafting-your-repository/using-environment-variables.mdx).

Keep values scoped to the tasks they affect. A rotating cache access token generally should not invalidate a frontend bundle, while a feature flag embedded in that bundle should. Never place private credentials in browser-visible build variables.

Nx provides explicit environment and runtime inputs too. A target input fragment can include:

```json
{
  "inputs": [
    "default",
    "^default",
    { "env": "PUBLIC_API_URL" },
    { "runtime": "node --version" }
  ]
}
```

Merge this with the target's actual inferred inputs and required workspace configuration. An override is not automatically additive. [Nx inputs](https://nx.dev/docs/reference/inputs).

## Model Generators as Producers

A file generated later in the same run may not exist when initial task hashing occurs. Adding its path to an ordinary glob is not always sufficient.

For deterministic generation, declare every generator input and its outputs, then make the consumer depend on it. A changed schema or generator implementation must change the consumer's effective hash, either through dependency-task hashing or explicit source/generated-output inputs. Check that propagation for the tool and target configuration you use; an ordering edge alone is not a complete input declaration.

Nx can also hash selected outputs of dependent tasks through `dependentTasksOutputFiles`. Current Turborepo configuration documents deferred input hashing with `jit` and `dependencyOutputs`; these require the appropriate task edges and support in the installed version. Use the documented mechanism when actual generated bytes must determine the consumer key. [Nx dependent outputs](https://nx.dev/docs/reference/inputs#outputs-of-dependent-tasks), [Turborepo deferred hashing](https://github.com/vercel/turborepo/blob/main/apps/docs/content/docs/reference/configuration.mdx).

A generator that fetches “latest” from a remote service is not deterministic merely because it is a separate task. Pin the remote content by version or digest, or keep that computation uncached with a properly modeled downstream input.

## Verify Output Coverage and Change Sensitivity

A replayed success log does not prove the needed files were restored. Declare complete output globs for bundles, generated source, declarations, and any other artifacts consumed later. Avoid overlapping output ownership between unrelated tasks.

Delete the task outputs in a disposable checkout and restore from cache. Confirm every required file returns. Then change source, an environment input, the schema, and generator code one at a time; each meaningful change should produce fresh correct output.

Finally change an unrelated file and confirm reuse where appropriate. The goal is both sensitivity to real inputs and stability against irrelevant changes. Cache correctness comes from that verified contract, not from repeatedly deleting old archives.

## References

- [Turborepo configuration](https://github.com/vercel/turborepo/blob/main/apps/docs/content/docs/reference/configuration.mdx)
- [Turborepo environment handling](https://github.com/vercel/turborepo/blob/main/apps/docs/content/docs/crafting-your-repository/using-environment-variables.mdx)
- [Turborepo run diagnostics](https://turborepo.dev/docs/reference/run)
- [Nx input reference](https://nx.dev/docs/reference/inputs)
