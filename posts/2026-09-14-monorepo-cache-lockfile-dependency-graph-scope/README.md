# Scope Monorepo Cache Keys to Avoid Full Rebuilds on Lockfile Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monorepo, Nx, Turborepo, Build Cache, CI/CD

Description: Reduce unnecessary monorepo rebuilds with dependency-aware task inputs while preserving legitimate invalidation from root tooling and shared dependency changes.

---

A root lockfile can change because one application adds a dependency. That does not necessarily change the computation performed by every other package. But simply removing the lockfile from a cache key can return stale results after a real dependency update.

The useful distinction is between the complete repository lockfile and the resolved dependency graph that a particular task consumes. Let a build tool that understands the package manager model that graph, and keep truly shared tooling in the shared input set.

## Separate Installation Cache from Task Cache

An archive of npm's download store can be keyed by the full lockfile and restored with a compatible fallback. A miss there may mean some network downloads; it need not force every package to compile.

A task-output cache has a stricter contract. Its key must cover source files, relevant resolved dependencies, compiler and plugin versions, configuration, environment, and prerequisite task identity.

Think of the desired relationship as:

```text
task key = hash(
  task implementation and configuration,
  relevant source inputs,
  resolved dependency closure,
  toolchain and platform,
  behavior-changing environment,
  prerequisite task identities
)
```

This is a design model, not a specification of a particular tool's serialization. Do not implement it by deleting random sections from a lockfile: peer dependencies, overrides, patches, optional dependencies, and resolver behavior can make apparently unrelated entries relevant.

## Distinguish Task Selection from Cache Invalidation

A CI tool can select every project after a lockfile change while still restoring many tasks from cache. Conversely, a narrow affected-project set can contain tasks whose keys depend on broad global inputs.

Nx documents a conservative default: lockfile changes mark every project affected. The `@nx/js` configuration can use dependency analysis instead:

```json
{
  "pluginsConfig": {
    "@nx/js": {
      "projectsAffectedByDependencyUpdates": "auto"
    }
  }
}
```

In auto mode, Nx compares supported lockfile representations and maps changed resolved dependencies back to workspace projects. This changes affected-project selection; it does not automatically narrow every custom target's cache inputs. [Nx affected projects](https://nx.dev/docs/features/ci-features/affected).

Use the correct comparison base, ideally the last successful relevant CI commit, so narrowing selection does not omit changes that a failed earlier run never validated.

## Inspect Nx External Dependency Inputs

Nx's input reference explains that without a more specific external dependency input, it may include all workspace external dependencies in the hash. Official plugin executors can provide a more accurate dependency set. Custom shell-command targets need deliberate modeling. [Nx external dependencies](https://nx.dev/docs/reference/inputs#external-dependencies).

For example, a lint command can depend on ESLint, its shared configuration, parsers, plugins, and their resolved behavior. Listing only `eslint` because it is the first executable in the command can miss relevant plugin updates.

Prefer maintained plugin inference where it fits. If you supply an explicit `externalDependencies` list, audit the complete tool and configuration chain and verify changes to each component. A higher hit rate is not evidence that the list is complete.

Also review shared named inputs. A workspace-wide glob such as every file under `tools/` makes each tool edit relevant to every consumer. Split independent tools into appropriate packages or narrower shared inputs when the dependency model supports it.

## Understand Turborepo's Global Inputs

Turborepo distinguishes global and package hashes. Its caching documentation identifies lockfile changes affecting the workspace root as global inputs and package-specific dependency changes as package inputs. Root dependencies and root-level tooling therefore deserve particular attention. [Turborepo caching](https://github.com/vercel/turborepo/blob/main/apps/docs/content/docs/crafting-your-repository/caching.mdx).

Do not move every application's dependencies into the root manifest merely for convenience and then expect independent caching. Keep runtime dependencies with the packages that use them, and keep shared build tools explicit.

Likewise, placing a frequently changing file in `globalDependencies` or a per-deployment variable in `globalEnv` intentionally broadens invalidation. Put a variable in the affected task's `env` when only that task consumes it. Use package configuration to express localized file inputs.

Some root changes should invalidate everything. A compiler version or shared transform used across the repository is a legitimate global dependency. The objective is accurate dependency boundaries, not a rule that no lockfile update may rebuild the whole repository.

## Compare Before and After with Dry Runs

Capture a plan for each revision using the same installed tool version:

```bash
turbo run build --dry=json > plan-before.json
```

After changing only one package's dependency, capture the corresponding plan again. Compare task hashes and reported dependency inputs. Use actual run summaries when deferred hashing means a dry run cannot know the final key. [Turborepo deferred-hashing configuration](https://github.com/vercel/turborepo/blob/main/apps/docs/content/docs/reference/configuration.mdx#deferred-hashing).

For Nx, inspect affected projects and resolved target configuration, then run the selected tasks with normal cache diagnostics. Keep package installation separate in the timing report so a full-lockfile download-cache miss is not mistaken for a full compilation rebuild.

## Test Both Narrow and Shared Updates

Build a regression matrix around your repository structure:

| Change | Expected scope |
| --- | --- |
| App A private runtime dependency | App A and actual downstream consumers |
| Shared library dependency | Shared library and relevant consumers |
| Root compiler or shared transform | Every task using that tool |
| Lockfile entry irrelevant to a task | Reuse if the tool can prove irrelevance |
| Peer resolution or package patch | Every task whose resolved graph changes |

Verify produced artifacts, not just the task count. Maintain a periodic complete build as a check on graph modeling, especially after package-manager or build-tool upgrades.

A good monorepo cache key narrows work because the task's true inputs are narrower. It never narrows work by pretending that dependency resolution is irrelevant.

## References

- [Nx dependency-aware affected selection](https://nx.dev/docs/features/ci-features/affected)
- [Nx input and external dependency reference](https://nx.dev/docs/reference/inputs)
- [Turborepo global and package hashes](https://github.com/vercel/turborepo/blob/main/apps/docs/content/docs/crafting-your-repository/caching.mdx)
- [Turborepo run diagnostics](https://turborepo.dev/docs/reference/run)
